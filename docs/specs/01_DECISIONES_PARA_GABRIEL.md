# Let Him Network — Cuaderno de decisiones de producto y programación

**Actualización 24 nov 2026:** Gabriel ya aprobó varias respuestas; la columna ✅ refleja solo lo que dijo explícitamente. Las celdas ⚪ siguen abiertas, incluso cuando incluyen una recomendación.

**Uso:** elige una opción por ID, modifica la propuesta o responde «pendiente». ⚪ significa **sin decisión**. “Recomiendo” es una sugerencia técnica, no una aprobación. En la spec maestra ya están ✅ Phaser 4, ✅ solo RIPv1/IPv4, ✅ entrada de X/Y por jugador. Estos IDs D-xx se mapean a DEC-xx en cuanto respondas. Fechas/valores no se suponen.

## Lote 1 — decisiones de base para empezar sin retrabajo

| ID / relación | Pregunta para Gabriel | Opciones con consecuencia | Recomendación razonada | Estado |
| --- | --- | --- | --- | --- |
| D-01 / DEC-02 | **GitHub Pages aprobado.** URL/slug exacto del repo se pedirá al preparar el deploy con Claude Code | Publicación estática, ajustar `base` a la URL que dará Gabriel | No inventar URL | ✅ parcial (URL pendiente) |
| D-02 / DEC-03 | **Mocks muy básicos ahora** y assets definitivos después; juego ocupa toda la ventana. Estética pixel art para arte futuro | Aún falta precisar «32 bits» y resolución interna | Separar layout/puertos de arte intercambiable | ✅ parcial |
| D-03 / DEC-19 | **Solo computadora, Chrome primero**; Firefox, Safari, iPad y móvil después | Definir tamaño mínimo cuando se pruebe hardware real | Probar Chrome en URL real | ✅ |
| D-04 / DEC-04 | Gabriel delegó esta decisión técnica: **React DOM para PC y terminal, Phaser 4 para jaula** con transición que se sienta continua | Pantalla del PC y jaula comparten estilo y estado, sin recargar página | Controlador central, Phaser no se desmonta al abrir PC | ✅ |
| D-05 / DEC-22 | ¿Repo único o workspaces y qué verificadores? | Un proyecto Vite con `src/core`, `game`, `ui`, Vitest y Playwright; monorepo: fronteras firmes pero más configuración | Un proyecto, importaciones restringidas y lockfile | ⚪ |
| D-06 / DEC-18 | **Sin guardado** en Fase 1; al recargar/cerrar se pierde el laboratorio, con aviso de pérdida al recargar | Guardado y usuario por grupo, a futuro | `beforeunload` del navegador muestra mensaje genérico, no texto propio garantizado | ✅ |
| D-07 / nuevo | **X/Y fijos durante cada laboratorio**; para corregirlos se inicia otro lab | Mostrar advertencia y direcciones calculadas antes de comenzar, también en libreta | Nunca recalcular routers a mitad de partida | ✅ |

**Caso que debe aprobarse en este lote:** X=1,Y=1 → direcciones visibles; ir de jaula a PC y volver conserva cables/zoom/estado del router; F5 cumple D-06; cambiar X/Y cumple D-07 sin mezclar configuraciones.

## Lote 2 — qué existe físicamente y cómo se manipula

| ID / relación | Pregunta | Opciones/consecuencia | Recomiendo | Estado |
| --- | --- | --- | --- | --- |
| D-08 / DEC-11 | **El juego sortea tres routers físicos funcionales y asigna R1/R2/R3 automáticamente**; asignación fija durante el lab; mencionar otro averiado es un gag sin fallas | Texto y cantidad del gag pendientes (FIS-Q1b) | Mantener ID físico distinto de rol | ✅ parcial |
| D-09 / DEC-12 | **Cualquier puerto libre válido del switch asignado** puede usarse | No fijar número de puerto; interfaces de router siguen las de la guía | Aceptar conexión funcional al equipo asignado | ✅ |
| D-10 / Q-02/Q-03 | **Dos PCs con IP propia, parrilla fija hasta jaula, switch compartido conectado a routers extremos y dos cables directos entre routers** | Seguir por completo IP/roles/puertos del PDF; mapeo de tomas sigue FIS-Q4; sin configuración de VLAN en Fase 1 | Ver documento 05 y fotos originales | ✅ parcial |
| D-11 / DEC-07 | **Sí: tipo incorrecto deja el enlace físico caído. Directo para equipos de distinto tipo; cruzado para equipos del mismo tipo.** | Regla didáctica expresa de Gabriel para Fase 1, independientemente de auto-MDI-X real | Validar el camino extremo a extremo, contando la parrilla como tramo pasivo | ✅ |
| D-12 / DEC-08 | **Fallo de asiento 2 % por conexión**, corregido expresamente por Gabriel. Se remedia reconectando y no penaliza | Instante exacto del sorteo y pista visual siguen pendientes | Guardar semilla y evento de intento | ✅ parcial |
| D-13 / DEC-09 | **Ver ambos conectores y el orden de los hilos: 568B–568B = directo; 568A–568B = cruzado**, como en foto recibida | No confiar solo en color de funda; mock debe mostrar etiquetas/orden distinguibles | Incorporar zoom de extremos y texto legible | ✅ |
| D-14 / DEC-10 | **Inventario exacto para la topología, sin sobrantes.** | Recuento por tipo y si incluye segmentos de consola aún pendientes; una unidad desconectada vuelve al inventario | Derivar/confirmar cantidad antes de cerrar la selección | ✅ parcial |
| D-15 / DEC-28/31 | **Desconectar y reconectar cualquier cable libremente; devolverlo al inventario.** | Estado de extremo suelto y cancelación todavía requieren precisión; penalización por ensayos erróneos pendiente | No perder unidades al deshacer | ✅ parcial |

**Contraejemplos:** dos cables en un puerto; conectar ambos extremos al mismo dispositivo; desconectar mientras ping animado; zoom con cable “en mano”; puerto muy pequeño que coincide con cable dibujado; luz apagada por administración `shutdown` frente a cable malo. Exigir códigos de causa distintos.

## Lote 3 — simulador, PC y consola

| ID / relación | Pregunta | Opciones/consecuencia | Recomiendo | Estado |
| --- | --- | --- | --- | --- |
| D-16 / Q-01 | **Cable de datos RJ45↔RJ45; USB→RJ45 exclusivamente para consola vía parrilla y salida de jaula** | Foto, pinout y modelo de cable USB→serial y COM pendientes (FIS-Q3) | No inferirlo por color | ✅ parcial |
| D-17 / DEC-30 | **Al pasar consola R1→R2 se cierra/invalida la sesión anterior; aparece «Conexión interrumpida» y Enter muestra la CLI del nuevo router.** | Aclarar si se reabre ventana automáticamente y prompt tras borrado | Nunca enviar comandos al router viejo | ✅ parcial |
| D-18 / DEC-13 | **Fotografía de jaula parece incluir Cisco 2911 y serie 2800; guía trae captura Packet Tracer de 2811.** | Decidir equipos elegibles, interfaz física y versión IOS antes de prometer respuestas exactas | Pedir capturas/fixtures cuando falten | ⚪ evidencia |
| D-19 / DEC-13 | **Sin abreviaturas; historial ↑/↓; no pegar comandos en Fase 1, ni siquiera uno.** | Autocompletado, `?`, paginación y salidas exactas siguen pendientes | Usar catálogo explícito por modo | ✅ parcial |
| D-20 / DEC-14 | **RIPv1 sin espera perceptible al quedar bien configurado; ping y Entregar inmediatos.** | Solo duración de erase/reload pendiente | Simplificación didáctica de timers reales | ✅ parcial |
| D-21 / DEC-05 | ¿Cómo se simula RIPv1? | Calculado por rondas y reloj virtual; datagramas de RIP emulados | Rondas condicionadas por configuración e interfaz; tablas observables, no rutas deducidas del cable | ⚪ |
| D-22 / DEC-16 | **Ping manual durante el lab; al entregar comprobar PC-1↔PC-2, gateways y routers para diagnosticar.** | Destinos manuales permitidos pendientes | Separar viaje de solicitud y respuesta | ✅ parcial |
| D-23 / DEC-32 | **No simular pérdida inicial de paquete en Fase 1** | Anotar opción ARP para después | Ping determinista según estado | ✅ |
| D-24 / nuevo | ¿Son válidas rutas estáticas que permitan ping sin RIP? | Aprueba conectividad pero falla requisito de protocolo; aprueba todo; rechaza sin informar conectividad | Separar conectividad técnica de requisito “configuró RIPv1” | ⚪ |
| D-25 / nuevo | **Comando fuera de catálogo: «Comando no disponible en laboratorio»; sin efecto en router.** | Catálogo por modos pendiente | No simular éxito inexistente | ✅ |

**Pruebas de la capa de red:** PC-1→PC-2 con rutas de ida y vuelta; PC-1→gateway aun sin RIP; falta `network` en R2, R1 o R3; retorno sin ruta; link baja después de converger; edición de running vs startup tras reload; mover cable de consola no modifica rutas IP.

## Lote 4 — qué ve el jugador y cómo se califica

| ID / relación | Pregunta | Opciones/consecuencia | Recomiendo | Estado |
| --- | --- | --- | --- | --- |
| D-26 / DEC-15 | **Ensayos libres; nota al Entregar; quiz sin puntos.** Gabriel delega pesos: propuesta 20 físico/20 IP/20 RIP/40 ping sobre 100 | Umbral y pesos revisables con Gabriel en doc 06 | Verificar ambos sentidos y errores finales | ✅ parcial |
| D-27 / nuevo | **`erase startup-config` y `reload` obligatorios en cada router asignado, incluso inicialmente vacío.** | Definir cómo se verifica el paso obligatorio sin penalizar intentos | Configuración previa puede aparecer aleatoriamente | ✅ |
| D-28 / DEC-15 | **Cuaderno y Entregar se desbloquean con la jaula tras aprobar quiz; desde allí Entregar está disponible en todo momento.** | Snapshot inmediato sin espera | Diagnóstico incluso si todo falla | ✅ |
| D-29 / DEC-15 | **Try again reinicia desde cero, conserva X/Y y vuelve a sortear equipos, switch y COM.** | Continuar desde estado anterior se reserva a futuro | Resetea quiz, cables, config y nota | ✅ |
| D-30 / DEC-26 | **Monitor presenta calificación final en texto y efectos de sonido, sin voces.** | Cronómetro y aparición sorpresa pendientes; entrega manual vigente | Monitor no bloquea Entregar | ✅ parcial |
| D-31 / DEC-17/21 | **Solo cuaderno como ayuda en Fase 1; pistas para después.** | Gesto/tecla para abrir cuaderno aún pendiente | Topología con IP dinámicas, tres preguntas para jaula | ✅ parcial |
| D-32 / nuevo | **Mostrar bloqueo principal primero y lista «Otros errores» con problemas comprobados.** | Causas no observables no se inventan | Ida y vuelta del ping separadas | ✅ |

**Casos incómodos para la rúbrica:** comando correcto escrito en router equivocado; ping exitoso con cableado no prescrito; primer ping ARP; varios errores; configurar RIPv1 pero olvidar guardar; configuración previa útil; dispositivo sin ruta de retorno; enviar mientras aún convergen rutas.

## Lote 5 — experiencia, límites y colaboración

| ID / relación | Pregunta | Opciones/consecuencia | Recomiendo | Estado |
| --- | --- | --- | --- | --- |
| D-33 / DEC-20 | Idiomas | Español del juego, CLI inglés; español/inglés | Español + catálogo de textos desde H0; consola conserva idioma real | ⚪ |
| D-34 / DEC-23/24 | Voces, nombres e imágenes de personas | Texto+blips; doblaje; usar personajes reales exige permiso | Texto y audio provisional hasta derechos/guiones/entregas | ⚪ |
| D-35 / DEC-29 | **Sin nombre ni login en Fase 1**; futuro login usuario de laboratorio y práctica por grupo | GitHub Pages sin cuentas en esta entrega | No agregar campo de nombre temporal | ✅ |
| D-36 / DEC-33 | Dispositivo de referencia y respuesta | Portátil concreto, navegador, resolución; qué medir | Elegir modelo real; medir FPS, latencia de teclado/drag y carga en build | ⚪ |
| D-37 / nuevo | ¿Cuándo se completa un hito si faltan fotos/fixtures? | Terminado con placeholders; terminado provisional 🟡; no empezar nada | Seguir con modelo provisional, bloquear la aceptación visual/textual final | ⚪ |
| D-38 / nuevo | ¿Quién valida corrección de redes y similitud de jaula? | Solo Gabriel; Gabriel + monitor técnico; consultor laboratorio | Gabriel decide producto; monitor verifica semántica técnica si tiene disponibilidad | ⚪ |
| D-39 / nuevo | ¿Qué assets entrega el equipo de arte y cuándo? | PNG sueltos; atlas + manifiesto; editor propio | Contrato de anclas/puertos, tamaño, capas y licencia antes del arte final | ⚪ |
| D-40 / nuevo | ¿Qué hacer con WebGL no disponible y viewport pequeño? | Pantalla de incompatibilidad; fallback limitado; soporte adicional | Fallback informativo, con requisitos claros y sin perder datos | ⚪ |
| D-41 / nuevo | ¿Se pueden exportar/importar partidas para depurar? | Nada; exportar JSON sin nombre; importación con versión y validación | Exportar JSON para bugs, importar solo en dev si no hay caso de uso | ⚪ |

## Qué no podemos decidir sin observar el mundo real

- Mapa de bocas del patch panel/parrillas, numeración real de switch y disposición de jaula: fotos y validación humana.
- Forma y mensajes exactos de IOS, PuTTY, Device Manager y ping: modelo/versiones y transcripciones propias.
- Rendimiento aceptable en equipo real: medir build, no adivinar FPS que parezca “suave”.
- Permisos para logos, nombres y fotos; guiones y arte que hará otro equipo.

## Primera respuesta sugerida

Continúa con FIS-Q1…Q7 del documento 05; luego vuelve a los IDs ⚪ de este cuaderno. Puedes decir «D-01 pendiente» y seguir con el resto. Después se convierten en reglas y criterios de H0, y avanzamos al siguiente lote. **Ningún número de esta tabla queda aprobado sin tu respuesta.**


**Nueva decisión sobre COM/PuTTY:** COM distinto por PC, aleatorio y estable en una partida; en el formulario de PuTTY simulado solo COM es editable. **Nueva decisión de futuro:** ampliar después el indicador visual para reflejar IP además del enlace físico, sin confundirlo con el LED físico real. **Por cerrar:** modelo 2911 frente a 2800 de foto, fixtures IOS, tiempos, prompt inicial, probabilidad 0,02 y configuración precargada.


**Lote nuevo de decisiones:** miniquiz de tres aciertos repetible, solo cuaderno como ayuda; topología dibujada con redes/IP dinámicas, asset aportable por Gabriel; entrega desde página del cuaderno en cualquier momento del lab; ensayo de ping libre, evaluación al final y monitor textual. Try again desde cero, sin paquete ARP inicial ni espera RIP; Gabriel valida red y arte, MacBook M5 Pro/Chrome referencia. Ver docs 06 y 07. **DEC-08 ya corregido posteriormente a 2 % por conexión.** Routers 1–8 serie 2900, 9–12 serie 2800; modelo 2800 concreto puede tener F o G.


**Correcciones finales:** `2 %` de no asiento, no `0,02 %`; borrado/reload para todos los routers incluso vacíos; quiz de tres preguntas con banco variable (aprox. 5–10; admite 3 o más entradas); cuaderno y Entregar solo tras desbloquear jaula; Try again conserva X/Y y vuelve a sortear dispositivos/switch/COM. Prefijo confirmado posteriormente: 1–8 G, 9–12 F en el juego.


**Quiz aclarado:** exactamente tres preguntas presentadas por intento, extraídas de banco de tamaño variable (previstas 5–10; motor admite 3 o más); no fijar cantidad única dentro de ese rango. La frase «doscientos todo R» sobre interfaces no aclara si quiere F o G: pedir confirmación concreta antes de cerrar H2/H5.


**Aprobado posteriormente:** routers físicos 1–8 con G0/0/G0/1; 9–12 con F0/0/F0/1 en Fase 1. Paneles A–J, 24 tomas por letra, catálogo extensible; asignación PC físico↔letra pendiente. Puntuación delegada 20/20/20/40 revisada y aprobada por Gabriel.
