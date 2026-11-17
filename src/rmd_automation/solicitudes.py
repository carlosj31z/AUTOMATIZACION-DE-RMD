"""Ejecutor de las solicitudes del asistente de configuraciones (chatbot de status-rmd).

El asistente (status-rmd, `/chatbot`) registra en Supabase (tabla `chatbot_solicitudes`) los pedidos de Producción
y Calidad en Operaciones. Los que entiende con seguridad («habilitar el paso» = cambiar el predecesor, y decimales)
quedan en estado `lista`; este módulo los toma, entra a SAP con la cuenta del analista, los aplica con el mismo
motor de `cambios` (lee el RMD, planifica, aplica, pulsa «Actualizar RMD en Línea» y vuelve a leer para verificar)
y deja el resultado en la solicitud. Lo que no pueda aplicar solo pasa a `revisar` para el analista.

Estados: nueva (para el analista) → lista (para ejecutar) → ejecutando → ejecutada | revisar.
Solo se tocan RMD Ingresados o Autorizados y solo con las acciones cambiar_predecesor y configurar_decimal.
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
TIPOS_CON_DECIMAL = ("Números", "Rango", "Fórmula", "Entrega", "MuestraCC", "Cantidad")


def _clave() -> str:
    clave = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not clave:
        raise RuntimeError("Falta SUPABASE_ANON_KEY (la clave pública de Supabase de status-rmd).")
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
            x = {k: c[k] for k in ("lista", "paso", "orden_paso", "predecesor", "predecesor_orden", "sin_predecesor") if k in c}
            out.append({"accion": "cambiar_predecesor", **x})
        elif c.get("accion") == "configurar_decimal":
            out.append({"accion": "configurar_paso", "lista": c["lista"], "paso": c["paso"], "decimal": int(c["decimal"])})
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
        m = cb._coincidencias(lst, str(a.params["paso"])) if lst else []
        if len(m) == 1 and m[0].get("td") not in TIPOS_CON_DECIMAL:
            a.estado, a.mensajes = cb.ERROR, [f"el paso es de tipo {m[0].get('td')!r}, no es un dato numérico"]


def atender_una(page, sol: dict, simular: bool = False, log: Callable[[str], None] = print) -> tuple[str, str]:
    """Aplica una solicitud ya tomada. Devuelve (estado_final, resultado_en_texto)."""
    from .actions import RmdAutomation
    from .extraer import extraer

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
        return "revisar", "Se aplicó pero la verificación encontró diferencias:\n" + final + linea
    return "ejecutada", f"Aplicado y verificado en el RMD {sp.rmd} ({estado_rmd}):\n" + final + linea


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
            base.esperar_app(page)
            log("#login → ok: la app Configuración cargó con la cuenta configurada")
            return True
    except Exception as e:
        log(f"#login → falló: {type(e).__name__}: {str(e)[:300]}")
        return False
