# H0 — Primer trabajo en Claude Code

**Objetivo observable:** abrir una página local en Chrome, introducir X/Y, ver las IP derivadas de la Topología 1 del PDF, entrar a un mock de jaula Phaser y volver a un mock de escritorio React sin recarga ni pérdida del estado en memoria. No implementar CLI, RIP, calificación, arte final ni deploy ficticio en esta tarea.

## Orden

1. Inspecciona el repositorio existente antes de crear archivos o instalar dependencias. Lee `../CLAUDE.md`, `specs/00_...`, `specs/08_...` y la spec maestra §13; respeta cualquier app ya existente.
2. Propón a Gabriel cualquier decisión de estructura de repositorio o resolución lógica que afecte su revisión. Para dependencias verifica versiones actuales y fija las versiones exactas que realmente pasen build. Mantén `core`, vista Phaser y vista React separados.
3. Implementa formulario X/Y con límites decididos, cálculo de IP de la tabla del PDF y vista previa. X/Y son inmutables dentro del lab. El mock inicial puede tener cajas con IDs, no necesita asset definitivo.
4. Verifica entrada válida y una inválida, vuelta PC↔jaula sin recarga, sin duplicar canvas ni mutar X/Y, build de producción y prueba manual en Chrome. Registra comandos y resultado en `ESTADO.md`.
5. Solo al preparar publicación pide a Gabriel URL/slug real de GitHub Pages y ajusta `base`; demuestra la página publicada antes de marcar deploy ✅. Presenta demo a Gabriel para cierre de H0.

**Datos de ejemplo:** X=1, Y=1 → PC-1 `192.168.30.11`, PC-2 `192.168.40.11` (PDF). La entrada inválida debe explicar qué regla rompió. Pregunta si cualquier límite de X/Y provisional impide un caso real del curso.

**No olvidar:** `CLAUDE-GLOBAL.md` no vino en los archivos recibidos. Claude Code puede tener instrucciones globales en su propio entorno; compruébalo sin fabricar ese archivo.
