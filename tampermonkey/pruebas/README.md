# Pruebas del userscript (contra el portal real)

`qa_estricto.py` abre una pestaña propia en el Chrome ya autenticado (puerto 9222) y comprueba, con medidas de pantalla y del DOM, que:

| Bloque | Qué verifica |
|---|---|
| A | Etiqueta de estado a la derecha; botones Copiar/Pegar en la barra de "Pasos (n)" a la izquierda del icono de impresora y a su misma altura; barra, título y cabecera siempre visibles; la cabecera fija nunca tapa la primera fila; columnas ocultas; tooltips; "Sin tipo de dato" en rojo; casillas encerradas; sin filas alternas ni contraste; filtro; Enter; reposo sin trabajo continuo y rendimiento; ventanas centradas con pie visible. |
| B | Portapapeles temporal: avisos de selección, Pegar deshabilitado, aviso del paso copiado, bloqueo sobre el mismo paso, y **desaparición al cerrar el RMD**. |
| C | Otro RMD no muestra el aviso; en un RMD Autorizado Pegar se bloquea. |
| E | Cada interruptor del panel retira lo que añadió; "Mejoras activas" apagado deja la ventana como la del portal. |
| F | Lista corta (Rendimiento) compacta; Escape cierra solo la vista previa; un único aviso; procesos menores sin botones de copiar. |
| G | Lo mismo a 1366×650. |
| D | **Escribe** en el RMD de prueba y lo restaura: Enter = Ir en el selector, Ctrl+S y cierre solo del mensaje de éxito, aviso de cambios sin guardar, pegar (paso 9 → 19) con procesos menores, segundo pegado sin duplicar, vista previa sin nada marcado, y restauración. |

```bash
export RMD_PRUEBA=2202609092   # RMD de PRUEBA (Ingresado). El bloque D lo modifica y lo restaura.
python tampermonkey/pruebas/qa_estricto.py           # todos los bloques
python tampermonkey/pruebas/qa_estricto.py ABCEFG    # sin escribir
```
Nunca apuntes `RMD_PRUEBA` a un RMD real.
