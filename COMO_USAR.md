# Cómo usar este paquete con Claude Code

## Estructura exacta que debe quedar en la raíz del repositorio

- `CLAUDE.md`: reglas del proyecto que Claude Code lee en el repo.
- `docs/H0_TAREA_INICIAL.md`: primera tarea limitada a H0.
- `docs/DECISIONES.md`: nuevas aprobaciones posteriores a este paquete.
- `docs/ESTADO.md`: evidencia real por hito.
- `docs/specs/`: spec maestra y `00_...` hasta `08_...`.
- `docs/reference/`: tres documentos originales entregados por Gabriel y la foto de conectores. Son evidencia; no deben publicarse automáticamente como assets del juego.

## Instalación en macOS

1. Descarga este ZIP. En Terminal abre la carpeta de tu repositorio (si aún no está clonado, usa `git clone URL_REAL_DEL_REPO` primero y luego `cd NOMBRE_REAL_DEL_REPO`).
2. Desde la raíz del repo ejecuta `unzip -n /ruta/real/Let_Him_Network_Claude_Code_Starter.zip -d .`. `-n` evita reemplazar archivos que ya existan. Usa la ruta real de donde descargaste el ZIP; en macOS suele ser `~/Downloads/Let_Him_Network_Claude_Code_Starter.zip`.
3. Comprueba `git status` y abre `CLAUDE.md`, `docs/H0_TAREA_INICIAL.md` y `docs/specs/08_ESTADO_Y_PROXIMOS_HITOS.md`. Si algún archivo ya existía y se omitió, compáralo e intégralo antes de trabajar.
4. Ejecuta `claude` en la raíz del repo. Claude Code deberá leer `CLAUDE.md` del proyecto y las instrucciones globales que tengas instaladas. Si guardaste recomendaciones en otro `CLAUDE-GLOBAL.md`, dale a Claude Code su **ruta real**; no venía en los archivos recibidos.
5. Primer mensaje sugerido: `Lee CLAUDE.md, docs/H0_TAREA_INICIAL.md y docs/specs/08_ESTADO_Y_PROXIMOS_HITOS.md. Resume H0, decisiones que lo bloquean y trabajo independiente que puedes hacer. Implementa solo H0 con mocks, prueba build y flujo en Chrome y registra evidencia en docs/ESTADO.md. Pregúntame antes de fijar decisiones de juego pendientes. Al preparar GitHub Pages, pídeme la URL real del repositorio.`
6. Revisa la demo de H0 antes de pedir H1. Después dile: `Trabaja H1 según la spec maestra y docs/specs/08; lee también docs/specs/02 y 05, muestra las decisiones pendientes de H1 y entrega pruebas.` Repite el patrón con el siguiente hito.

## Importante

El ZIP **no incluye una aplicación programada** ni credenciales de GitHub. No subas `docs/reference/` a una página pública por accidente; GitHub Pages debe servir solo la salida del build, no todos los archivos del repositorio. Si quieres que el repo permanezca privado, revisa la configuración de Pages con tu cuenta cuando llegue H0.
