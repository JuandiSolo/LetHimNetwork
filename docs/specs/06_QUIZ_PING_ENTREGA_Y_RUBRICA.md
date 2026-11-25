# Fase 1 — Quiz, diagnóstico de ping, entrega y nota

**Fecha:** 24 nov 2026. Los hechos aprobados se distinguen de la propuesta de puntuación delegada a quien redacta esta spec. La decisión final del producto pertenece a Gabriel.

## Reglas decididas

1. Antes de entrar en la jaula: miniquiz de **exactamente tres preguntas visibles**, elegidas de un banco **de tamaño variable**, previsto inicialmente alrededor de cinco a diez; la mecánica admite cualquier cantidad de **tres o más**. No fijar exactamente cinco ni diez. Repetir libremente hasta acertar las tres para desbloquear **jaula y cuaderno**. El quiz **no suma ni resta nota**.
2. El jugador puede tomar apuntes en su cuaderno. Es la **única ayuda de Fase 1**: no hay pistas contextuales ni tutorial de ayudas; registrar esas ideas para después.
3. La topología se presenta con dibujos y etiquetas de IP calculadas para X/Y, y cada tramo muestra su red `.30`, `.10`, `.20` o `.40` según el PDF. Gabriel puede aportar la imagen final; iniciar con mock legible. No usar un dibujo fijo que muestre IP equivocadas para otro grupo.
4. Se puede hacer ping manual durante el lab, acertar o fallar, leer la causa y seguir corrigiendo; **no hay penalización por ensayos**. No simular el primer eco perdido por ARP en Fase 1.
5. Cuaderno y página «Entregar» se habilitan **al aprobar el quiz y desbloquear la jaula**. Desde ese momento Entregar está accesible en cualquier momento del laboratorio; no bloquearlo por conectividad, por otros errores ni por espera de convergencia. Al entregar se evalúa el estado actual y aparece monitor con devolución **solo en texto y efectos de sonido**, sin voces.
6. «Try again» crea un laboratorio nuevo desde cero **conservando X/Y**; sortea otros equipos, switch y COM, repite quiz y no conserva cables, configs, historial ni nota. Continuar desde el estado anterior queda para fase posterior.
7. Diagnóstico al entregar: primero el bloqueo causal más temprano del camino; sección aparte «Otros errores» para problemas comprobados independientes. Se distingue solicitud que no llega, llegada al destino y respuesta que no vuelve. No atribuir causas que no se pueden probar desde el estado.
8. Gabriel valida que los comandos/redes sean correctos y que el arte de las aulas se parezca al entorno; cuenta con autorización de las personas que aparecerán. Assets disponibles se integran cuando sean entregados, sin afirmar que ya están en este paquete.
9. Objetivo de fluidez: Chrome de escritorio en **MacBook M5 Pro** como equipo de referencia inicial; medir en build real al implementar. Umbral FPS/latencia concreto pendiente de medición.

## Semántica de red y tiempo

El simulador recalcula/aplica rutas RIPv1 **sin espera perceptible** después de una configuración que lo permita. El jugador puede lanzar ping inmediatamente; no hay bloqueo «red convergiendo». Es una simplificación didáctica de la Fase 1, no una afirmación de la temporización del router físico. El ping se evalúa con ida y respuesta separadas: aun cuando una solicitud llegue a PC-2, una ruta de retorno ausente o mal configurada podría impedir la respuesta. En una solución completa y simétrica, ambos sentidos funcionan.

**Matriz de comprobación:** PC-1→PC-2 y PC-2→PC-1; si falla, probar PC-1→gateway R2 y PC-2→gateway R3, después cada tramo entre routers y las tablas de rutas/retorno. Mostrar dónde se cortó ida o vuelta. Los pings de diagnóstico pueden ser internos del evaluador aunque la interfaz del jugador ofrezca otros destinos; disponibilidad exacta de comandos ping desde router/PC pendiente.

## Rúbrica aprobada por Gabriel (0–100)

Evaluar **solo el estado al pulsar Entregar**; ni intentos previos, ni reconexiones, ni quiz afectan la nota. Distribución aprobada por Gabriel:

| Componente | Puntos | Qué se prueba |
| --- | ---: | --- |
| Camino físico prescrito | 20 | Paneles emparejados, cables directos/cruzados, un switch asignado, interfaces y enlaces activos. |
| IP, máscaras y gateways | 20 | PCs y routers según X/Y y PDF; interfaces habilitadas. |
| RIPv1 y rutas aprendidas | 20 | Configuración en los tres routers y tablas efectivas con ruta de ida y retorno. |
| Ping final | 40 | 20 por PC-1→PC-2 y 20 por PC-2→PC-1, incluida respuesta de cada eco. |

Con todo correcto y ping en ambos sentidos: **100**. Si existe ping pero hay otro error comprobable, se restan solo los puntos del criterio afectado. Si no existe ping, conservar crédito por los componentes que sí funcionen; el monitor explica la causa principal y otros errores. La conectividad mediante una ruta estática no satisface la parte RIPv1, aunque pudiera satisfacer ping. La propuesta evita una nota de cero opaca y no penaliza ensayo; Gabriel aprobó los pesos; todavía falta definir el tratamiento de errores de procedimiento. **Gabriel aprobó esta distribución de 20/20/20/40 el 24 nov 2026.** El borrado obligatorio es una acción histórica: si solo se evalúa el estado final, debe definirse cómo impedir configuración antes del borrado o cómo comprobar ese procedimiento sin penalizar ensayos.

## Preguntas que sí bloquean una rúbrica definitiva

- Resuelto: Entregar y cuaderno solo aparecen al aprobar el quiz y desbloquear la jaula. Resuelto: banco de tamaño variable (previstas 5–10, mínimo técnico 3) y exactamente tres por intento; pendiente si deben acertarse las tres en un mismo intento o si los aciertos se acumulan entre intentos.
- ¿Qué texto/escala usa el monitor y qué umbral representa aprobar? La propuesta usa 0–100, pero no se ha elegido escala institucional.
- El borrado `erase`/`reload` es obligatorio pero no tiene puntos propios en la rúbrica aprobada. ¿Se bloquea reconfigurar hasta completarlo o se muestra error de procedimiento al entregar? No inventar criterios de evaluación de acciones pasadas cuando se aprobó evaluar estado final.
- ¿El jugador dispone de ping manual de PC a cualquier IPv4 válida, o solo a destinos de la topología? El evaluador interno sí prueba gateways, routers e ida/vuelta.
