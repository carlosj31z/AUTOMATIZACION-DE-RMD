"""Ejecutor de las solicitudes del asistente de configuraciones (chatbot de status-rmd).

El asistente (status-rmd, `/chatbot`) registra en Supabase (tabla `chatbot_solicitudes`) los pedidos de Producción
y Calidad en Operaciones. Los que entiende con seguridad («habilitar el paso» = cambiar el predecesor, y decimales)
quedan en estado `lista`; este módulo los toma, entra a SAP con la cuenta del analista, los aplica con el mismo
motor de `cambios` (lee el RMD, planifica, aplica, pulsa «Actualizar RMD en Línea» y vuelve a leer para verificar)
y deja el resultado en la solicitud. Lo que no pueda aplicar solo pasa a `revisar` para el analista.

Estados: nueva (para el analista) → lista (para ejecutar) → ejecutando → ejecutada | revisar.
Solo se tocan RMD Ingresados o Autorizados y solo con las acciones cambiar_predecesor y configurar_decimal.

Pedidos de solo lectura (2026-11-17, pedido de Carlos): estado del RMD (última versión y vigente), plantilla para
Producción (la misma «Generar plantilla» del userscript, inyectado en la app) y PDF del master (el mismo «Descargar
master» que usa la contingencia). Los archivos se suben al Storage de Supabase (bucket privado) y se entrega un enlace
firmado válido por 7 días. No escriben nada en SAP.
"""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from . import cambios as cb

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://govkmqahpvnlmllboqsh.supabase.co")
ESTADOS_RMD = ("Ingresado", "Autorizado")
ACCIONES_LECTURA = {"estado_rmd": "estado", "plantilla": "documento", "pdf_master": "documento"}
BUCKET = "chatbot-archivos"
DIAS_ENLACE = 7
TIPOS_CON_DECIMAL = ("Números", "Rango", "Fórmula", "Entrega", "MuestraCC", "Cantidad")


def _clave() -> str:
    # Las tablas del chatbot no aceptan la clave pública (anon): solo la service_role, guardada como secreto.
    clave = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not clave:
        raise RuntimeError("Falta SUPABASE_SERVICE_ROLE_KEY (clave service_role de Supabase de status-rmd).")
    return clave


def _sb(ruta: str, method: str = "GET", body: Any = None, prefer: str = "") -> Any:
    clave = _clave()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{ruta}",
        method=method,
        data=None if body is None else json.dumps(body).encode("utf-8"),
        headers={
            "apikey": clave,
            "Authorization": f"Bearer {clave}",
            "Content-Type": "application/json",
            **({"Prefer": prefer} if prefer else {}),
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        texto = r.read().decode("utf-8")
    return json.loads(texto) if texto else None


def pendientes(limite: int = 5) -> List[dict]:
    return _sb(f"chatbot_solicitudes?estado=eq.lista&select=*&order=prioridad.asc,id.asc&limit={limite}")


def tomar(sol_id: int) -> Optional[dict]:
    """Pasa la solicitud de `lista` a `ejecutando` solo si sigue en `lista` (dos ejecutores no la toman a la vez)."""
    filas = _sb(
        f"chatbot_solicitudes?id=eq.{sol_id}&estado=eq.lista",
        "PATCH",
        {"estado": "ejecutando", "ejecucion_inicio": datetime.now(timezone.utc).isoformat()},
        "return=representation",
    )
    return filas[0] if filas else None


def terminar(sol_id: int, estado: str, resultado: str) -> None:
    _sb(
        f"chatbot_solicitudes?id=eq.{sol_id}",
        "PATCH",
        {"estado": estado, "resultado": resultado[:4000], "ejecutado_en": datetime.now(timezone.utc).isoformat(),
         "ejecutado_por": os.environ.get("RMD_USERNAME", "") or os.environ.get("USERNAME", "")},
    )


def notificar(sol_id: int) -> None:
    """Pide a status-rmd que avise del resultado (WhatsApp a quien pidió y al analista). Si no está configurado, nada."""
    url, clave = os.environ.get("CHATBOT_URL", "").rstrip("/"), os.environ.get("CHATBOT_CLAVE_ANALISTA", "")
    if not (url and clave):
        return
    req = urllib.request.Request(
        f"{url}/api/chatbot",
        method="POST",
        data=json.dumps({"accion": "notificar", "id": sol_id}).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-clave-analista": clave},
    )
    try:
        urllib.request.urlopen(req, timeout=30).read()
    except Exception as e:  # el aviso no debe tumbar la ejecución
        print(f"  (no se pudo avisar por status-rmd: {e})")


def a_spec(sol: dict) -> cb.Spec:
    """Traduce los cambios del chatbot al formato de `cambios`."""
    out: List[Dict[str, Any]] = []
    for c in sol.get("cambios") or []:
        if c.get("accion") == "cambiar_predecesor":
            x = {k: c[k] for k in ("lista", "paso", "orden_paso", "predecesor", "predecesor_orden", "predecesor_lista", "sin_predecesor") if k in c}
            out.append({"accion": "cambiar_predecesor", **x})
        elif c.get("accion") == "configurar_decimal":
            out.append({"accion": "configurar_paso", "lista": c["lista"], "paso": c.get("paso") or "",
                        "orden_paso": c.get("orden_paso"), "decimal": int(c["decimal"])})
        else:
            raise ValueError(f"acción no automática: {c.get('accion')!r}")
    if not out:
        raise ValueError("la solicitud no trae cambios aplicables")
    return cb.Spec(str(sol["rmd"]), f"Solicitud #{sol['id']}: {sol.get('resumen', '')}", out)


def _revisar_decimales(plan: List[cb.Accion], snap: dict) -> None:
    """Los decimales solo tienen sentido en datos numéricos: si no, que lo vea el analista."""
    for a in plan:
        if a.tipo != "configurar_paso" or a.estado == cb.ERROR:
            continue
        lst = cb._lista(snap, a.params["lista"])
        p = cb._paso_unico(lst, str(a.params.get("paso") or ""), a.params.get("orden_paso"))[0] if lst else None
        if p is not None and p.get("td") not in TIPOS_CON_DECIMAL:
            a.estado, a.mensajes = cb.ERROR, [f"el paso es de tipo {p.get('td')!r}, no es un dato numérico"]


def _sin_tildes(t: str) -> str:
    import unicodedata

    return "".join(c for c in unicodedata.normalize("NFD", str(t or "").upper()) if unicodedata.category(c) != "Mn").strip()


def elegir_rmd(masters: List[dict], ops: List[dict], etapa: str, lote: str = "") -> tuple[Optional[dict], str]:
    """Del material + etapa (y el lote, si se dio) saca el RMD a configurar. Devuelve (master, error).

    Con lote: el RMD cuya «Ver OP» tiene ese lote (así se confirma que es el que está en proceso).
    Sin lote: la última versión Autorizada (vigente); si hay varios masters distintos, lo ve el analista.
    """
    cand = [m for m in masters if not etapa or _sin_tildes(m.get("etapa")) == _sin_tildes(etapa)]
    if not cand:
        return None, (f"no hay RMD del material en la etapa {etapa}" if etapa else f"el lote {lote} no aparece en «Ver OP» de ningún RMD")
    if lote:
        ids = {o["md_id"] for o in ops}
        con_lote = [m for m in cand if m["md_id"] in ids]
        if len(con_lote) == 1:
            return con_lote[0], ""
        if not con_lote:
            return None, f"el lote {lote} no aparece en «Ver OP» de los RMD de ese material y etapa"
        return None, f"el lote {lote} aparece en varios RMD: " + ", ".join(f"{m['codigo']} v{m['version']}" for m in con_lote)
    aut = [m for m in cand if m.get("estado") == "Autorizado"]
    if not aut:
        return None, "el material no tiene un RMD Autorizado en esa etapa; indica el lote para ubicar el RMD"
    familias = {m.get("principal") or m["codigo"] for m in aut}
    if len(familias) > 1:
        return None, "hay varios RMD Autorizados de ese material y etapa (" + ", ".join(sorted(familias)) + "); indica el lote"
    return max(aut, key=lambda m: m["version"]), ""


def _datos_ubicar(page, material: str, lote: str) -> dict:
    from importlib import resources

    from .pages import base

    script = resources.files("rmd_automation").joinpath("js/ubicar.js").read_text(encoding="utf-8")
    base.esperar_app(page)
    page.evaluate(script)
    return page.evaluate("([m, l]) => window.__ubicarRmd(m, l)", [material, lote])


def _ubicar(page, sol: dict) -> tuple[Optional[dict], str]:
    """Master de la solicitud: con lote, el de su «Ver OP»; sin lote, la última versión Autorizada. Solo lectura."""
    if not (sol.get("material") and sol.get("etapa")) and not sol.get("op_lote"):
        return None, "la solicitud no trae RMD, lote ni material y etapa"
    datos = _datos_ubicar(page, str(sol.get("material") or ""), sol.get("op_lote") or "")
    m, err = elegir_rmd(datos["masters"], datos["ops"], sol.get("etapa") or "", sol.get("op_lote") or "")
    if m is None:
        quien = f"Material {sol['material']}, etapa {sol['etapa']}" if sol.get("material") else f"Lote {sol['op_lote']}"
        return None, f"{quien}: {err}."
    lote = f", lote {sol['op_lote']} confirmado en Ver OP" if sol.get("op_lote") else " (última versión Autorizada)"
    return m, f"RMD {m['codigo']} v{m['version']} {m['estado']} ({m['descripcion']}){lote}."


def ubicar_rmd(page, sol: dict) -> tuple[Optional[str], str]:
    """Si la solicitud no trae código de RMD, lo busca con material + etapa (+ lote en «Ver OP»). Solo lectura."""
    if sol.get("rmd"):
        return str(sol["rmd"]), ""
    m, texto = _ubicar(page, sol)
    return (m["codigo"] if m else None), texto


# ---------------------------------------------------------------- pedidos de solo lectura

def _fecha(iso: str) -> str:
    return f"{iso[8:10]}/{iso[5:7]}/{iso[:4]}" if iso and len(iso) >= 10 else ""


def texto_estado(familia: List[dict], en_op: Optional[dict] = None, lote: str = "") -> str:
    """Estado de un RMD: su última versión y la vigente (última Autorizada); con lote, la versión de su OP."""
    if not familia:
        return "No encontré versiones de ese RMD."
    ult = max(familia, key=lambda m: m["version"])
    aut = [m for m in familia if m.get("estado") == "Autorizado"]
    vig = max(aut, key=lambda m: m["version"]) if aut else None
    lugar = ", ".join(x for x in (ult.get("etapa"), ult.get("planta")) if x)
    t = f"RMD {ult['codigo']} - {ult.get('descripcion', '').strip()}{f' ({lugar})' if lugar else ''}: la última versión es la v{ult['version']}, {ult.get('estado') or 'sin estado'}."
    if vig is None:
        t += " No tiene una versión Autorizada."
    else:
        fecha = _fecha(vig.get("fecha_autorizacion", ""))
        cuando = f", autorizada el {fecha}" if fecha else ""
        t += f" Es la vigente{cuando}." if vig is ult else f" La vigente (última Autorizada) es la v{vig['version']}{cuando}."
    if en_op is not None and lote:
        t += f" El lote {lote} se trabaja con la v{en_op['version']}."
    return t


def codigos_de(masters: List[dict], etapa: str) -> List[str]:
    """Códigos de RMD (sin repetir) de un material en una etapa, para dar el estado de cada uno."""
    vistos: List[str] = []
    for m in sorted(masters, key=lambda m: -m["version"]):
        if (not etapa or _sin_tildes(m.get("etapa")) == _sin_tildes(etapa)) and m["codigo"] not in vistos:
            vistos.append(m["codigo"])
    return vistos


def _seguro(nombre: str) -> str:
    import re
    import unicodedata

    plano = "".join(c for c in unicodedata.normalize("NFD", nombre) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^A-Za-z0-9._-]+", "_", plano).strip("_")[:120] or "archivo"


def _storage(ruta: str, data: bytes, tipo: str = "application/json", extra: Optional[Dict[str, str]] = None) -> Any:
    clave = _clave()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/storage/v1/{ruta}", method="POST", data=data,
        headers={"apikey": clave, "Authorization": f"Bearer {clave}", "Content-Type": tipo, **(extra or {})})
    with urllib.request.urlopen(req, timeout=120) as r:
        texto = r.read().decode("utf-8")
    return json.loads(texto) if texto else None


def subir_archivo(sol_id: int, nombre: str, contenido: bytes, tipo: str) -> str:
    """Sube el archivo al bucket privado del chatbot (lo crea si falta) y devuelve un enlace firmado de 7 días."""
    import urllib.error

    try:
        _storage("bucket", json.dumps({"id": BUCKET, "name": BUCKET, "public": False}).encode())
    except urllib.error.HTTPError as e:
        if e.code not in (400, 409):  # ya existe
            raise
    ruta = f"{sol_id}/{_seguro(nombre)}"
    _storage(f"object/{BUCKET}/{urllib.parse.quote(ruta)}", contenido, tipo, {"x-upsert": "true"})
    firmado = _storage(f"object/sign/{BUCKET}/{urllib.parse.quote(ruta)}",
                       json.dumps({"expiresIn": DIAS_ENLACE * 24 * 3600}).encode())
    url = firmado.get("signedURL") or firmado.get("signedUrl") or ""
    return url if url.startswith("http") else f"{SUPABASE_URL}/storage/v1{url}"


def _frame_app(page):
    from .pages import base

    base.esperar_app(page)
    for fr in page.frames:
        if "ui5appruntime" in (fr.url or ""):
            return fr
    raise RuntimeError("no encontré la app Configuración RMD")


def _inyectar_mejoras(frame) -> None:
    """Carga el userscript de mejoras (el del repo) en la app, como el Chrome de pruebas: trae «Generar plantilla»."""
    from pathlib import Path

    if frame.evaluate("() => !!(window.__rmdStats && window.__rmdStats.plantilla)"):
        return
    ruta = Path(os.environ.get("RMD_USERSCRIPT") or Path(__file__).resolve().parents[2] / "tampermonkey" / "rmd-ui-mejoras.user.js")
    frame.evaluate(ruta.read_text(encoding="utf-8"))
    frame.wait_for_function("() => !!(window.__rmdStats && window.__rmdStats.plantilla)", timeout=30000)


_JS_PLANTILLA = """async (c) => { const r = await window.__rmdStats.plantilla.generar(c, {}); return { nombre: r.nombre, html: r.html }; }"""


def atender_lectura(page, sol: dict, simular: bool = False, log: Callable[[str], None] = print) -> tuple[str, str]:
    """Estado del RMD, plantilla para Producción o PDF del master. No escribe nada en SAP."""
    import base64

    accion = ((sol.get("cambios") or [{}])[0] or {}).get("accion")
    if not sol.get("automatica") or ACCIONES_LECTURA.get(accion) != sol.get("tipo"):
        return "revisar", "La solicitud no está marcada como pedido automático: la revisa el analista."
    lote = sol.get("op_lote") or ""

    if accion == "estado_rmd":
        if sol.get("rmd"):
            codigos, en_op = [str(sol["rmd"])], None
        else:
            datos = _datos_ubicar(page, str(sol.get("material") or ""), lote)
            if lote:
                en_op, err = elegir_rmd(datos["masters"], datos["ops"], sol.get("etapa") or "", lote)
                if en_op is None:
                    return "revisar", f"Lote {lote}: {err}."
                codigos = [en_op["codigo"]]
            else:
                en_op, codigos = None, codigos_de(datos["masters"], sol.get("etapa") or "")
                if not codigos:
                    return "revisar", f"Material {sol.get('material')}: no hay RMD en la etapa {sol.get('etapa')}."
        lineas = [texto_estado(page.evaluate("(c) => window.__familiaRmd(c)", c), en_op, lote) for c in codigos[:5]]
        if len(codigos) > 5:
            lineas.append(f"Hay {len(codigos) - 5} RMD más de ese material y etapa; indique el lote para ubicar el suyo.")
        return "ejecutada", "\n".join(lineas)

    m, ubicado = _ubicar(page, sol)
    if m is None:
        return "revisar", ubicado
    log(ubicado)
    frame = _frame_app(page)
    if accion == "plantilla":
        _inyectar_mejoras(frame)
        r = frame.evaluate(_JS_PLANTILLA, m["codigo"])
        archivos = [(r["nombre"], r["html"].encode("utf-8"), "text/html; charset=utf-8")]
        titulo = f"Plantilla para Producción del RMD {m['codigo']} ({m['descripcion'].strip()}), con su última versión"
    else:
        from .contingencia_diaria import _JS_PDF_MASTER

        docs = frame.evaluate(_JS_PDF_MASTER, m["md_id"])
        archivos = [(f"{m['codigo']} v{m['version']} master{(' ' + d['receta']) if d.get('receta') else ''}.pdf",
                     base64.b64decode(d["b64"]), "application/pdf") for d in docs]
        titulo = f"PDF del master del RMD {m['codigo']} v{m['version']} {m['estado']} ({m['descripcion'].strip()})"
    if simular:
        return "lista", f"Simulación (no se subió nada): {titulo}; " + ", ".join(f"{n} ({len(b) // 1024} KB)" for n, b, _ in archivos)
    enlaces = [subir_archivo(sol["id"], n, b, t) for n, b, t in archivos]
    if not sol.get("rmd"):
        _sb(f"chatbot_solicitudes?id=eq.{sol['id']}", "PATCH", {"rmd": m["codigo"]})
    return "ejecutada", f"{titulo}. Puede descargarlo aquí (el enlace vence en {DIAS_ENLACE} días):\n" + "\n".join(enlaces)


def atender_una(page, sol: dict, simular: bool = False, log: Callable[[str], None] = print) -> tuple[str, str]:
    """Aplica una solicitud ya tomada. Devuelve (estado_final, resultado_en_texto)."""
    from .actions import RmdAutomation
    from .extraer import extraer

    if sol.get("tipo") in ("estado", "documento"):
        return atender_lectura(page, sol, simular, log)
    if not sol.get("automatica") or sol.get("tipo") != "cambio":
        return "revisar", "La solicitud no está marcada como cambio automático: la revisa el analista."
    rmd, ubicado = ubicar_rmd(page, sol)
    if rmd is None:
        return "revisar", ubicado
    if not sol.get("rmd"):
        log(ubicado)
        if not simular:
            _sb(f"chatbot_solicitudes?id=eq.{sol['id']}", "PATCH", {"rmd": rmd})
    sol = {**sol, "rmd": rmd}
    sp = a_spec(sol)
    snap = extraer(page, sp.rmd, procesos_menores=False)
    estado_rmd = snap.get("estado")
    if estado_rmd not in ESTADOS_RMD:
        return "revisar", f"El RMD {sp.rmd} está {estado_rmd!r}: solo se cambian Ingresados o Autorizados."
    plan = cb.planificar(sp, snap)
    _revisar_decimales(plan, snap)
    texto_plan = cb.plan_a_texto(sp, plan)
    log(texto_plan)
    if any(a.estado == cb.ERROR for a in plan):
        return "revisar", "No se pudo aplicar solo:\n" + texto_plan
    if simular:
        return "lista", "Simulación (no se tocó SAP):\n" + texto_plan

    aviso = cb.ejecutar(sp, plan, RmdAutomation(page), actualizar_en_linea=True)
    despues = cb.planificar(sp, extraer(page, sp.rmd, procesos_menores=False))
    ok = all(a.estado == cb.APLICADO for a in despues)
    cb.auditar(os.environ.get("RMD_AUDITORIA", "data/auditoria.jsonl"), sp, despues,
               f"chatbot #{sol['id']}: " + ("verificado" if ok else "verificación con diferencias"))
    final = cb.plan_a_texto(sp, despues)
    linea = f"\nActualizar RMD en Línea: {aviso or 'sin aviso del portal'}"
    if not ok:
        return "revisar", (ubicado + "\n" if ubicado else "") + "Se aplicó pero la verificación encontró diferencias:\n" + final + linea
    return "ejecutada", (ubicado + "\n" if ubicado else "") + f"Aplicado y verificado en el RMD {sp.rmd} ({estado_rmd}):\n" + final + linea


def atender(limite: int = 5, simular: bool = False, log: Callable[[str], None] = print) -> int:
    """Toma las solicitudes `lista`, inicia sesión una sola vez y las aplica. Devuelve cuántas atendió."""
    from .browser import rmd_session
    from .config import load_config

    filas = pendientes(limite)
    if not filas:
        log("No hay solicitudes listas para ejecutar.")
        return 0
    atendidas = 0
    with rmd_session(load_config()) as page:
        for fila in filas:
            sol = fila if simular else tomar(fila["id"])
            if sol is None:
                continue  # la tomó otro ejecutor
            log(f"Solicitud #{sol['id']} — RMD {sol.get('rmd')}: {sol.get('resumen', '')}")
            try:
                estado, resultado = atender_una(page, sol, simular, log)
            except Exception as e:
                estado, resultado = "revisar", f"Error al aplicar: {str(e)[:500]}"
                try:  # deja el portal en la pantalla principal para la siguiente
                    from .pages.rmd_editor import RmdEditor

                    RmdEditor(page).cerrar_editor()
                except Exception:
                    pass
            log(f"#{sol['id']} → {estado}")
            if not simular:
                terminar(sol["id"], estado, resultado)
                notificar(sol["id"])
            atendidas += 1
    return atendidas


def probar_login(log: Callable[[str], None] = print) -> bool:
    """Solo inicia sesión y comprueba que carga la app Configuración (no lee ni escribe ningún RMD)."""
    from .browser import rmd_session
    from .config import load_config
    from .pages import base

    try:
        with rmd_session(load_config()) as page:
            try:
                base.esperar_app(page)
            except Exception as e:
                log(f"#login → falló: {type(e).__name__}: {str(e).splitlines()[0][:200]}")
                for linea in describir_pantalla(page):
                    log(f"#login   {linea}")
                return False
            log("#login → ok: la app Configuración cargó con la cuenta configurada")
            return True
    except Exception as e:
        log(f"#login → falló: {type(e).__name__}: {str(e).splitlines()[0][:300]}")
        return False


def describir_pantalla(page) -> List[str]:
    """Dónde se quedó el navegador, sin datos personales: dominio y ruta (sin parámetros), título,
    mensajes de error visibles y qué campos/botones hay (solo sus etiquetas). Para el registro público."""
    import re

    out: List[str] = []
    try:
        u = urllib.parse.urlsplit(page.url)
        out.append(f"pantalla: {u.netloc}{u.path}")
        out.append(f"título: {page.title()[:120]}")
        js = """() => {
          const vis = (e) => e.getClientRects().length > 0;
          const txt = (e) => (e.innerText || e.value || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '').trim().replace(/\\s+/g, ' ').slice(0, 90);
          const avisos = [...document.querySelectorAll('[role=alert],.error,.errorMessage,[class*=rror],[id*=rror],[class*=message],h1,h2')]
            .filter(vis).map(txt).filter(Boolean);
          const campos = [...document.querySelectorAll('input:not([type=hidden])')].filter(vis)
            .map((e) => `${e.type}:${e.getAttribute('placeholder') || e.getAttribute('aria-label') || e.name || ''}`);
          const botones = [...document.querySelectorAll('button,input[type=submit],a[role=button]')].filter(vis).map(txt).filter(Boolean);
          const iframes = [...document.querySelectorAll('iframe')].map((f) => { try { return new URL(f.src).host; } catch (e) { return ''; } });
          return { avisos: [...new Set(avisos)].slice(0, 6), campos: campos.slice(0, 8), botones: [...new Set(botones)].slice(0, 10), iframes };
        }"""
        d = page.evaluate(js)
        correo = re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+")
        limpiar = lambda t: correo.sub("<correo>", t)
        out += [f"aviso: {limpiar(t)}" for t in d["avisos"]]
        out.append("campos: " + ", ".join(d["campos"]))
        out.append("botones: " + limpiar(", ".join(d["botones"])))
        out.append("iframes: " + ", ".join(d["iframes"]))
    except Exception as e:  # el diagnóstico no debe tapar el error original
        out.append(f"(no se pudo describir la pantalla: {type(e).__name__})")
    return out
