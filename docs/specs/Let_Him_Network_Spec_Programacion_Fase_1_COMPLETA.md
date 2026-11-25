# Let Him Network — Spec de programación (Fase 1)

*Versión 1.3 · 24 nov 2026 · Prefijos F/G, panel A–J/1–24 y rúbrica aprobados; ver sección 17 y documento 05; detalles todavía pendientes · Programación: tú, con Claude Code · Arte: equipo aparte · Fuentes: «Let him network.docx», «LabCeroTopologia.pdf», «merged (1).pdf» y «Copia de CLAUDE-GLOBAL.md». Las propuestas no equivalen a decisiones aprobadas.*

## 0. Cómo usar este documento

**Para ti:** las decisiones son tuyas. Todo lo que está como ⬜ en las secciones 4 y 14 lo decides tú; yo dejo opciones, tradeoffs y una recomendación **no vinculante**. Lo que ya decidiste está como ✅.

**Para Claude Code (copiar al CLAUDE.md del proyecto):**

1. Lee CLAUDE-GLOBAL.md y este documento completos. Tu primera respuesta: resumen de las reglas de parada en 5 líneas + qué hito vas a atacar.
2. **Nunca asumas una decisión ⬜.** Si el trabajo la necesita, para y pregunta con 2–3 opciones (CLAUDE-GLOBAL §5).
3. Trabaja **un hito a la vez** (sección 13). No empieces el siguiente sin que el usuario haya verificado la Definición de Terminado (DoD) del anterior. Tras cada hito: commit + actualizar ESTADO.md.
4. **Toda salida que se declare fiel a IOS, a ping o a Windows sale de `fixtures/`** (capturas reales). Si falta fixture, usar salida provisional identificada como ❓ y pedir evidencia; nunca afirmar equivalencia literal sin oráculo.
5. Tú no ves la pantalla: lo visual lo verifica el usuario. Entrégale comandos copiables y qué debe ocurrir (CLAUDE-GLOBAL §3).
6. Si este spec choca con un prompt puntual, avisa y pregunta; no lo ignores en silencio.

**Leyenda.** REQ = requisito · DEC = decisión del dueño · C = contradicción o ambigüedad detectada · G = hueco de diseño · Q = dato que solo el usuario puede dar · F = modo de fallo de la red · H = hito. Estados: ✅ decidido/verificado por el usuario · 🟡 verificado por logs o fuente externa · ⬜ pendiente · ❓ no verificado.

## 1. Visión, alcance y definición de terminado

### 1.1 Qué es

**Let him network** es un juego web 2D de estilo pixel art (inspirado en Cooking Mama) donde el jugador arma una topología de red en una réplica de la jaula del laboratorio de redes, configura routers Cisco con una consola que responde a comandos reales, y recibe una calificación con retroalimentación exacta sobre dónde y por qué falla su red. **Primero se juega con mocks muy básicos, sin arte definitivo; los assets se integran después.**

✅ **Stack aprobado el 24 nov 2026:** Phaser 4 + TypeScript + React (DEC-01). El documento original decía Phaser 3; esta decisión posterior lo sustituye. Elegir la versión exacta de Phaser 4 y fijarla en lockfile durante H0.

### 1.2 Requisitos no negociables convertidos en criterios medibles

Tus cuatro requisitos «súper importantes» son subjetivos como están escritos; para que Claude Code pueda construir y tú puedas aceptar, los convierto en pruebas observables. **Ajústalos tú.**

| ID | Tu requisito | Criterio medible propuesto (⬜ confirmar) |
| --- | --- | --- |
| NN-1 | Consola funciona bien y reacciona con comandos reales | Un conjunto de transcripciones reales (fixtures, sección 10) se reproduce carácter por carácter en pruebas automáticas; comandos completos sin abreviaturas, historial ↑/↓, sin pegado y mensajes definidos para el catálogo funcionan; 0 comandos del catálogo (sección 9.3) sin implementar |
| NN-2 | Error exacto en la retroalimentación y hasta dónde llegó el ping | Cada fallo F-01…F-14 (sección 9.5) es provocable a mano y la retroalimentación nombra dispositivo, interfaz, causa y salto exacto donde se rompe, ida y vuelta |
| NN-3 | Se ve igual a la jaula real | El layout (orden de routers/switches, etiquetas, patch panel, bandejas de cables) se define en `cage-layout.json` a partir de fotos reales y lo aprueba el usuario contra la foto; ver DEC-03 sobre fidelidad vs. estilo |
| NN-4 | Flujo fluido, responsive, nada se siente pesado | Presupuesto en sección 12.1: ≥55 fps medianos en el equipo de referencia, eco de tecla en consola <50 ms, ningún comando bloquea >100 ms salvo retardos intencionales (DEC-14), carga inicial \<N s (⬜ N) |

### 1.3 Alcance Fase 1 (tu definición, ✅)

- Pantalla de inicio sin pedir nombre ni login, Sofi y **entrada de X (sección) e Y (grupo) por el jugador**, antes de crear el escenario. Mostrar IP calculadas antes de confirmar y en la libreta; X/Y permanecen fijos hasta empezar otro laboratorio. Validar los valores contra todas las direcciones de la guía; no inferirlos ni sortearlos.
- Elección de topología: solo **Topología 1 en IPv4** disponible; el resto bloqueado, **incluido el tutorial** (ver C-01).
- Todo T1/IPv4 **solo con RIPv1**: mini quiz, búsqueda de «ingredientes» (cables), jaula, PC y consola, calificación y retroalimentación con recorrido visual del ping. No implementar RIPv2 ni OSPF en Fase 1.
- Flujo completo extremo a extremo.

**Fuera de Fase 1 (pero el diseño no debe impedirlo):** RIPv2, OSPF, tutorial, T2 (IPv6), T3 (BGP), eventos/averías, modo sin ayuda, easter eggs, login del laboratorio, partidas por grupo, persistencia y soporte iPad/móvil o Firefox/Safari. La entrega se prueba primero en Chrome de escritorio, ocupa toda la ventana y se publica en GitHub Pages; pedir URL/slug real al preparar deploy. El selector de protocolo, si se muestra, presenta RIPv1 como único protocolo habilitado, sin insinuar que los demás funcionan.

### 1.4 Definición de terminado de la Fase 1 (CLAUDE-GLOBAL §11: 3–5 pruebas observables)

- **DoD-1.** Un jugador completa Inicio → Retroalimentación en el build desplegado en la **URL pública**, en Chrome y Firefox (más los navegadores que fije DEC-19).
- **DoD-2.** Con la solución correcta (cableado + IPs + RIPv1) todos los pings pasan y la nota es la máxima; el resultado es reproducible con la misma semilla.
- **DoD-3.** Cada F-01…F-14 **aplicable a RIPv1** se provoca a mano y produce el diagnóstico correcto; F-11 (incompatibilidad con RIPv2) figura «no aplica» y no bloquea la entrega.
- **DoD-4.** El set de transcripciones reales de consola pasa al 100% en pruebas automáticas.
- **DoD-5.** Presupuesto de rendimiento (sección 12.1) medido en el equipo de referencia y **ensayo completo** (CLAUDE-GLOBAL §3, H9): partida de inicio a fin, navegadores aprobados en DEC-19, recarga a mitad según DEC-18 y una partida con errores a propósito.

## 2. Cómo se aplica CLAUDE-GLOBAL a este proyecto

| Sección de tu guía | Aplicación concreta aquí |
| --- | --- |
| §1 Reglas de parada | Igual. Añado: si una salida de IOS no coincide con su fixture tras 2 intentos, para y pide captura real |
| §3 Evidencia | Cada hito termina con ✅/🟡/❓ en ESTADO.md. «Pasa en Vitest» es 🟡; «el usuario lo vio en la URL pública» es ✅ |
| §4 Entorno | Pitfall nuevo: React StrictMode en dev monta dos veces → **dos instancias de Phaser** (G-26). Primera comprobación ante «tarjetas fantasma/eventos dobles» |
| §5 Decisiones irreversibles | DEC-01 ya está aprobada; DEC-02, 03, 19 y 22 quedan para cerrar H0; DEC-04 y 05 antes de sus hitos respectivos |
| §6 Esqueleto andante | **H0**: lo más simple que atraviese React + Phaser + core + deploy público |
| §7 Costuras | Mapeadas abajo (tabla 2.1) |
| §8 ESTADO / POSTMORTEM | Se crean en H0 y se actualizan en cada hito |
| §6 y §11 Artefacto real temprano | Nombre del repo y `base` de Vite fijados en H0; primer deploy mínimo al inicio |
| §5 Decisión de backend | Si DEC-18 elige backend, escribir una especificación separada de datos, permisos, migraciones y privacidad antes de programarlo |
| §3 Evidencia de extremo a extremo | Probar recarga y estados intermedios en las vistas que entren en el alcance aprobado |

### 2.1 Tus «costuras» (§7) aplicadas a este juego

| Costura | Dónde aparece aquí | Regla |
| --- | --- | --- |
| Identificador generado en dos sitios | IDs de cable, puerto y dispositivo en Phaser y en el core | IDs **solo** los crea el core; Phaser y React los reciben |
| Máquina de estados interpretada distinto por cada vista | Fase del juego (cableado, PC, consola, calificación) | Una sola `GamePhase` en el store; ninguna vista renderiza lo que su fase no permite |
| 0-based vs 1-based | `Gi0/1` vs «puerto 45» del switch vs números de la parrilla | Un solo módulo `portNaming.ts` convierte entre interno y mostrado |
| Lógica de presentación en módulos compartidos | Diálogos, quiz, retroalimentación | El módulo entrega contenido estructurado; cada vista decide estilo |
| Estado solo en memoria | Una recarga pierde la partida | Serialización versionada (DEC-18, G-29) |
| Configuración que depende de un nombre | `base` de Vite = nombre del repo | Una variable; verificar tras cualquier renombre |
| Dos consumidores del mismo canal | EventBus con listeners que no se limpian al destruir escenas | `off` en `shutdown`/`destroy`; prueba de fugas |

## 3. Lo que te falta por pensar

### 3.1 Contradicciones y ambigüedades en tu documento (necesito que las resuelvas)

- **C-01 · Tutorial bloqueado, pero el juego depende de él.** Dices que en Fase 1 el tutorial está bloqueado, y también que lo del COM/PuTTY «debería ser explicado en el tutorial». Sin tutorial, ¿cómo aprende un jugador nuevo qué es la consola, el COM o el cable cruzado? Opciones en DEC-17.
- **C-02 · RESUELTA el 24 nov 2026.** La T1 del laboratorio menciona RIPv1 y OSPF; el dueño delimitó Fase 1 a **RIPv1 en IPv4**. RIPv2 y OSPF quedan fuera de la primera entrega (DEC-06).
- **C-03 · «Mirar hacia abajo» vs. barra de inventario.** El cuaderno se abre llevando el mouse abajo, pero el inventario de cables también está abajo. Además el hover no existe en touch y el mouse sale del canvas por el borde inferior (DEC-21).
- **C-04 · Colores distintos por cable vs. decidir cruzado/directo.** Si el color solo identifica cada cable, ¿qué información usa el jugador para clasificarlo? Gabriel aprobó mostrar ambos conectores y el orden de hilos (DEC-09); el color como único diferenciador falla con daltonismo (G-21).
- **C-05 · Mala conexión aleatoria vs. «feedback exacto» y «no sentirse roto».** Una luz que a veces no sale «sin causa» puede confundirse con un bug. La conexión puede no asentar con probabilidad 2 % por conexión; solo queda pendiente definir cómo se distingue visualmente de un cable incorrecto (DEC-08).
- **C-06 · «Reunes cables hasta tener los que necesitas».** Gabriel decidió que el conjunto sea exacto, sin sobrantes; resta confirmar cantidad por tipo y consola (DEC-10).
- **C-07 · PARCIALMENTE RESUELTA.** Gabriel confirmó PC físico→cable del jugador→toma de parrilla del escritorio→enlace interno fijo→salida correspondiente en jaula→cable del jugador→switch asignado. El recorrido a routers y sus puertos está confirmado por FIS-Q5; cualquier toma libre del puesto sirve si se usa su misma etiqueta en la salida de jaula. Letras/rangos físicos siguen FIS-Q4. No inventar el mapa interno.
- **C-08 · RESUELTA la asignación de roles.** Dos PCs físicos variables (p. ej. PC4, PC6), tres routers físicos funcionales seleccionados por el juego (foto: 1–12); **el juego asigna R1/R2/R3 automáticamente**, y un único switch físico se comparte entre ambos PCs. El juego mantiene la asignación durante todo el lab. Mencionar un router no asignado «dañado» es un gag de presentación sin efecto técnico; texto pendiente FIS-Q1b.
- **C-09 · Calificar y reintentar.** Resuelto para Fase 1: Entregar se pulsa desde el cuaderno, monitor presenta evaluación final y Try again reinicia el laboratorio. Cronómetro/sorpresa sigue pendiente (DEC-26, DEC-15).
- **C-10 · «Igual a la jaula real» vs. pixel art.** La fidelidad espacial (qué hay dónde) es compatible con pixel art; la fidelidad visual no. Hay que fijar cuál exiges (DEC-03).
- **C-11 · RESUELTA la función, hardware pendiente.** Gabriel confirma cable de datos RJ45↔RJ45 para PC↔parrilla y cable USB→RJ45 **solo para consola** del router a través de una toma del panel. Confirmar modelo/pinout del USB→RJ45 y COM a partir de fotos futuras; no deducirlos por color.
- **C-12 · RESUELTA EN PARTE.** Gabriel confirmó dos puestos físicos asignados y configuración IP individual de ambos. Desde cuál se accede a la consola y si ambos pueden hacerlo queda en FIS-Q3/Q4.

### 3.2 Huecos que no mencionaste

**Simulación**

- **G-01 Modelo del tiempo.** RIP converge en decenas de segundos reales (update cada 30 s). ¿Convergencia instantánea, acelerada o en tiempo real? (DEC-05, DEC-14).
- **G-02 Determinismo.** Con aleatoriedad (luces, cables, COM, configs sucias) necesitas semilla y PRNG propio; sin ellos no hay tests ni reportes de bug reproducibles.
- **G-03 Tabla de fallos como contrato.** Sim, calificador y retroalimentación deben compartir una sola lista de fallos (sección 9.5).
- **G-04 Estado inicial «sucio».** En el lab real los routers traen la configuración del grupo anterior. Eso es parte de «toca borrar todo». Hay que diseñar el generador (hostname viejo, IPs viejas, `router rip` previo).
- **G-05 ARP y primer ping.** En un router real el primer ping suele perder un paquete por ARP (`.!!!!`). ¿Se reproduce? (Q-06).
- **G-06 Mensajes asíncronos de IOS.** Los avisos de cambio de estado de enlace y de configuración aparecen solos en medio de lo que escribes. Son pedagógicos y a la vez peligrosos para la fluidez.
- **G-07 Casos finos de RIP.** Implementar el comportamiento classful y las restricciones de RIPv1 pertinentes a T1; las diferencias de interoperabilidad RIPv1/RIPv2 pasan a otra fase. No agregar la versión 2 por aparecer en el material académico.
- **G-08 Modelo listo para IPv6.** Si las direcciones nacen como «string IPv4» tendrás que reescribir para T2. Modelo de dirección con unión v4/v6 desde H1.

**Consola y PC**

- **G-09 Gramática de comandos dirigida por datos**, no una cadena de `if`. Abreviaturas, ambigüedad y `?` salen gratis de un árbol de comandos.
- **G-10 Pegado multilínea.** Los estudiantes pegan bloques de configuración. ¿Se soporta y cómo se comporta?
- **G-11 Teclas.** `?` sin Enter, Tab, flechas, Ctrl+C, `--More--`, `terminal history size`.
- **G-12 Captura de salidas reales.** Sin fixtures de equipo real (o de Packet Tracer como segundo oráculo) la «fidelidad» es opinión.
- **G-13 Rarezas auténticas.** «Translating…» al escribir mal un comando, asistente inicial tras `erase`+`reload`, confirmaciones `[confirm]`. ¿Cuáles se reproducen? (DEC-13).
- **G-14 PuTTY y COM.** Número de COM variable, velocidad 9600, velocidad 9600 bloqueada, COM editable; fallos con COM equivocado y cable desconectado; movimiento según DEC-30.

**Juego y UX**

- **G-15 Puertas de fase.** Qué vista está disponible en qué momento (¿puedes ir al PC sin cables? ¿a consola sin cable de consola?).
- **G-16 Guardado y recarga.** Un F5 a mitad de partida: ¿se pierde todo? (DEC-18).
- **G-17 Cancelar y deshacer.** Esc/clic derecho con cable en mano, soltar un cable en el vacío, desconectar, devolver al inventario.
- **G-18 Cables colgando.** Render (curva fija vs. física de soga), límite de cables en pantalla, rendimiento (DEC-28).
- **G-19 Hitboxes.** Un switch de 48 puertos en pantalla: tamaño mínimo de clic, radio de «snap», zoom por niveles.
- **G-20 Niveles de ayuda** en la retroalimentación (para el «modo sin ayuda» futuro).
- **G-21 Accesibilidad.** Daltonismo (cables), contraste, tamaño de texto, teclado, volumen, reducir animaciones.
- **G-22 Idiomas.** La narración en español; la consola siempre en inglés (es lo real). Claves de texto desde el día 1 (DEC-20).
- **G-23 Audio.** Los navegadores bloquean audio hasta un gesto: la pantalla de inicio debe pedir clic. Líneas de voz: quién las graba, formato, peso (DEC-23).
- **G-24 Fuentes.** Muchas fuentes pixel no traen á, é, ñ, ¿, ¡. Verificar antes de que el arte las elija.
- **G-25 Móvil/touch.** Arrastrar cables, teclado virtual sobre el canvas, sin hover (DEC-19).

**Ingeniería y entrega**

- **G-26 StrictMode ⇒ doble instancia de Phaser.** **G-27 Fugas de listeners** del EventBus.
- **G-28 Core puro** sin Phaser ni React para poder testearlo en Node.
- **G-29 Persistencia versionada** (campo `schemaVersion` y migraciones) si guardas algo.
- **G-30 Deploy**: `base`, caché, qué carpetas llegan al build (CLAUDE-GLOBAL §§6 y 11).
- **G-31 Cómo se testea un canvas**: hooks de depuración (`window.__lhn`), semilla fija, avance rápido del reloj de simulación.
- **G-32 Telemetría y privacidad** de estudiantes (nombre, intentos). Por defecto: nada sale del navegador.
- **G-33 Equipo de referencia** para medir rendimiento (portátil de gama baja de estudiante).
- **G-34 Derechos.** Material de la Universidad (guías, tablas, logo en el patch panel), marca Cisco/PuTTY/Windows, personas reales como personajes, fuentes y audio. No soy abogado: confirma permisos (DEC-24).
- **G-35 Arte en paralelo.** Sin contrato de assets (nombres, tamaños, anclas, coordenadas de puertos) la integración será dolorosa (sección 11).
- **G-36 Contenido y revisión técnica.** Diálogos, quiz y mensajes de error son contenido; ¿quién los escribe y quién valida que sean correctos (profesor/monitor)?
- **G-37 Oráculo de verdad.** ¿Contra qué se comprueba que la simulación está bien? (equipo real, Packet Tracer, o ambos).

## 4. Registro de decisiones

Columna «Antes de» = hito que queda bloqueado si no se decide. **Recomendación = opinión mía, tú decides.**

| ID | Decisión | Opciones y tradeoffs | Recomendación (no vinculante) | Antes de | Estado |
| --- | --- | --- | --- | --- | --- |
| DEC-00 | Stack base | Phaser **4** + TS + React (DEC-01) | — | — | ✅ |
| DEC-01 | Versión de Phaser | **Phaser 4**, decidido el 24 nov 2026 tras comparar Phaser 3 y PixiJS; elegir versión exacta compatible en H0, sin migrar silenciosamente a otra mayor | Decisión del dueño; prueba H0 de React, escena, zoom, drag, cable y regreso PC↔jaula | H0 | ✅ |
| DEC-02 | Nombre del repo y hosting | **GitHub Pages confirmado**; nombre del proyecto Let Him Network y repo ya creado; URL y slug exactos pendientes hasta despliegue | Pedir URL al usuario durante trabajo con Claude Code; configurar `base` desde esa URL | H0 | ✅ parcial |
| DEC-03 | Vista y resolución | **Juego ocupa toda la ventana; mocks rudimentarios primero, assets pixel art finales después.** Resolución lógica exacta y significado de estética “32 bits” pendientes | Elegir tamaño interno tras probar puertos/terminal en Chrome | H0/H5 | ✅ parcial |
| DEC-04 | Dónde viven consola y escritorio del PC | Gabriel delegó esta decisión técnica: **React DOM para PC/terminal, Phaser 4 para jaula**, sin recargar página y con transición de apariencia continua. xterm.js frente a componente propio sigue abierto | Un controlador de estado compartido, probar foco y entrada de comandos | H1/H4 | ✅ parcial |
| DEC-05 | Motor de simulación | **A)** Convergencia calculada (Bellman-Ford/Dijkstra sobre la config actual) + retardo simulado visible: determinista, barato, controlable. **B)** Paquetes de protocolo por tick: más fiel, mucho más trabajo y más bugs. La A debe igualmente modelar fallos dependientes de la config (network faltante, interfaz caída, versión distinta) | A | H1 | ⬜ |
| DEC-06 | Protocolos en Fase 1 | **Solo RIPv1 en IPv4**, decidido el 24 nov 2026; RIPv2 y OSPF fuera de alcance aunque figuren en las guías del laboratorio | Catálogo CLI, simulador, quiz y nota se limitan a RIPv1 | H3 | ✅ |
| DEC-07 | Rigor del tipo de cable | **Aprobado:** conexión entre equipos distintos usa directo; entre iguales, cruzado; tipo incorrecto ⇒ enlace físico caído, incluso si un hardware moderno corrigiera automáticamente | Evaluar extremos efectivos a través de la parrilla pasiva | H1 | ✅ |
| DEC-08 | Mala conexión de conector | **Aprobado el fenómeno:** conexión correcta puede quedar mal asentada; LED de enlace físico apagado; retirar y reconectar hasta que asiente | Probabilidad **2 % por conexión** (0,02 como probabilidad), sin penalizar al reconectar; señal diagnóstica pendiente | H5 | ✅ parcial |
| DEC-09 | Cómo se decide cruzado/directo | **Mostrar ambos conectores y orden de hilos:** 568B–568B directo; 568A–568B cruzado (foto enviada por Gabriel) | Zoom y rótulos legibles sin depender solo de color | H5 | ✅ |
| DEC-10 | Cuántos cables reunir | **Cantidad exacta, sin sobrantes.** Un cable desconectado puede regresar al inventario. Recuento exacto por tipo y cable de consola aún por concretar | No asumir cantidad antes de confirmar todos los segmentos | H5 | ✅ parcial |
| DEC-11 | Equipos físicos asignados | **Dos PCs físicos asignados; juego sortea tres routers físicos funcionales y les asigna R1/R2/R3; un solo switch físico asignado para ambos PCs.** El supuesto router averiado fuera de la asignación es solo un gag; redacción pendiente FIS-Q1b | Roles lógicos separados de etiquetas físicas; X/Y vienen del jugador | H1 | ✅ parcial |
| DEC-12 | Puertos libres o prescritos | **Cualquier puerto libre adecuado del switch asignado es válido**, elegido por el jugador. Rango/mapeo de tomas de parrilla y disponibilidad de puertos de router necesitan fotos y FIS-Q4/Q5 | Calificar estado y pertenencia al equipo asignado; no puerto de switch hardcodeado | H1 | ✅ parcial |
| DEC-13 | Fidelidad de la consola | Subconjunto de comandos completos del lab, historial por flechas, sin abreviaturas ni pegado; fuera de catálogo responde «Comando no disponible en laboratorio». El modelo/IOS y las salidas textuales exactas requieren evidencias (Q-05) | No afirmar un IOS único por la foto | H2 | ✅ parcial |
| DEC-14 | Retardos intencionales | **Rutas RIPv1 disponibles sin espera perceptible tras configuración válida**; no bloquear ping/Entrega por convergencia. Duración de erase/reload sigue pendiente | En red real RIP tiene actualizaciones periódicas; documentar simplificación | H2 | ✅ parcial |
| DEC-15 | Calificación | **Probar conexiones equivocadas es libre; solo se evalúa el resultado al entregar.** Escala, pesos, umbral y reintentos siguen pendientes | No restar puntos por intentos ni por conector aleatorio no asentado | H7 | ✅ parcial |
| DEC-16 | Pings evaluados y ping desde el PC | **Ping manual permitido; entrega comprueba PC-1↔PC-2 en ambos sentidos y diagnostica gateways y tramos de router.** Destinos permitidos para ping manual aún por concretar | Diferenciar solicitud y respuesta | H4/H7 | ✅ parcial |
| DEC-17 | Ayuda mínima sin tutorial | **Solo cuaderno de apuntes en Fase 1**. Pistas, globos y tutorial de ayuda para después | Topología visible con IP dinámicas como material de lab, no pista emergente | H6 | ✅ |
| DEC-18 | Persistencia, envío y telemetría | **Sin guardado en Fase 1**: recargar/cerrar pierde partida; advertencia al recargar en Chrome tras interacción, texto controlado por navegador. Cuenta, partida por grupo y persistencia quedan para después | No implementar backend ni `localStorage` de partida ahora | H6 | ✅ |
| DEC-19 | Plataforma y navegadores | **Solo computadora y Chrome en Fase 1**; Firefox/Safari e iPad/móvil después | Usar pantalla completa de ventana, medir hitboxes en Chrome | H0 | ✅ |
| DEC-20 | Idioma | Solo español con claves de texto / ES+EN | ES con claves (i18n barato desde el día 1) | H6 | ⬜ |
| DEC-21 | Acceso al cuaderno | Mouse al borde inferior / tecla (N, Tab) / botón; resolver choque con inventario | Tecla + zona al borde con retardo, inventario subido | H6 | ⬜ |
| DEC-22 | Estructura de repo y pruebas | Un paquete con carpetas y reglas de importación vs. workspaces; Vitest + Playwright | Un paquete + ESLint de fronteras | H0 | ⬜ |
| DEC-23 | Audio y voz | **Texto y efectos de sonido en Fase 1; ninguna voz**. Monitor final textual | Guiones/efectos pendientes del equipo | H8 | ✅ parcial |
| DEC-24 | Derechos y personajes reales | **Gabriel declara que ya tiene permiso de las personas reales**; él validará parecido de aulas y arte | Confirmar alcance concreto de logos/fotografías institucionales si se usan | H8 | ✅ parcial |
| DEC-25 | Estilo del PC | Escritorio estilo Windows imitado vs. escritorio genérico pixel art | Genérico con guiño (evita imitar marca) | H4 | ⬜ |
| DEC-26 | Modo cronometrado y monitor NPC | **Monitor presenta la evaluación final en Fase 1; botón «Entregar» en página del cuaderno accesible durante el lab.** Cronómetro/sorpresa sin decisión definitiva | No iniciar entrega por timer por inferencia | H7 | ✅ parcial |
| DEC-27 | Bitácora y repetición | Exportar JSON de la partida (semilla + acciones) para reproducir bugs | Sí, barato si todo pasa por acciones | H1 | ⬜ |
| DEC-28 | Render de cables | Curva fija con caída (barato) vs. soga con física (más bonito, más CPU) | Curva fija; física solo si sobra presupuesto | H5 | ⬜ |

## 5. Investigación tecnológica (a 23 nov 2026)

**Phaser 4 (aprobado por DEC-01; investigación tecnológica inicial).** 🟡 Phaser 4.0.0 «Caladan» salió el 10 de abril de 2026 con un renderer WebGL completamente nuevo; 4.1.0 el 30 de abril; el índice de changelog publicado muestra 4.2.0 y 4.2.1 (9 de julio de 2026) como las últimas. Phaser 3 aparece con 3.90 (23 de mayo de 2025) como última versión. ❓ Verificar la versión vigente mediante `npm view phaser version` en H0; un lanzamiento posterior no cambia automáticamente la versión aprobada.

Implicaciones:

- Phaser 4 prioriza WebGL; su renderer Canvas está deprecado y varias funciones visuales nuevas solo existen en WebGL. Definir qué hace el juego si no hay WebGL (mensaje claro).
- La guía oficial de migración v3→v4 dice que un juego que solo usa la API estándar (sprites, texto, tilemaps) debería funcionar sin cambios de renderer; FX y máscaras pasan a un sistema de filtros; cambia la orientación de texturas comprimidas; no se hacen llamadas directas a `gl`.
- 4.1.0 corrigió la exportación por defecto del build ESM (`import Phaser from 'phaser'`) y 4.2.1 siguió limpiando el uso del espacio de nombres en ESM. Para Vite esto importa: fijar versión exacta de Phaser 4 tras una prueba de importación/build en H0.
- El template oficial React+TypeScript que encontré se describe como «Phaser 3 + React 19 + Vite 6 + TypeScript 5.7» y usa un `EventBus` y un componente `PhaserGame` con `forwardRef`; la fecha de la copia que vi es antigua. ❓ Verificar en H0 si el repositorio oficial ya tiene una versión para Phaser 4. Aun así, el patrón de puente React–Phaser es una alternativa a ensayar, con limpieza explícita de listeners.
- Riesgo práctico: Claude Code puede reutilizar ejemplos de v3 incompatibles con v4. Usar documentación v4 como fuente de API; consultar la guía oficial de migración cuando un ejemplo v3 contradiga la API actual.

**React + Vite + TypeScript.** El template histórico consultado fijaba React 19.0, Vite 6.3.1 y TypeScript 5.7.2 en su momento. ❓ No investigué las versiones actuales: fijarlas en H0 con `npm view` y bloquear con `package-lock.json`.

**Consola.** 🟡 `@xterm/xterm` es el emulador de terminal que usa VS Code; lleva addons (`fit`, `webgl`, `canvas`, `search`, `web-links`) y existe `@xterm/headless`; no es una shell, solo dibuja lo que le escribes, así que sirve para mostrar la salida de nuestro motor IOS. ❓ Vi un aviso de versión 6.0.0 en un tracker de Debian (oct 2026); verificar la actual. Alternativa: componente propio (div + input) con control total del `--More--`. Decide con una prueba de eco de tecla en H4 (DEC-04).

**Simuladores existentes.** ❓ No se hizo un inventario exhaustivo de simuladores embebibles ni verificación de sus licencias. No integrar motores o copiar código de terceros antes de revisar compatibilidad, permisos y adecuación al alcance. Packet Tracer puede servir de referencia auxiliar de comportamiento, sujeto a las diferencias respecto del equipo físico (G-37).

**Otras piezas** (❓ versiones concretas pendientes; fijar versión en H0): Vitest (pruebas del core), Playwright (E2E con semilla fija), ESLint con reglas de fronteras de importación, un PRNG semillado pequeño (p. ej. mulberry32, 10 líneas, sin dependencia), `useSyncExternalStore` o Zustand para el store, TexturePacker o free-tex-packer para atlas.

---

## 6. Contrato de producto, fuentes de verdad y límites

### 6.1 Orden de autoridad y cambios

1. Tu decisión explícita, anotada con fecha y aceptación en `docs/DECISIONES.md`.
2. Esta spec aprobada; si aún es borrador, ninguna opción ⬜ se convierte en requisito.
3. Las guías académicas aportadas para datos de red y procedimiento; las fotos/observación del laboratorio para el espacio físico.
4. `CLAUDE-GLOBAL.md` para proceso de trabajo, evidencia y depuración; su copia localizada se titula «Copia de CLAUDE-GLOBAL.md». Claude Code debe poder leer su versión local; este documento no sustituye sus reglas.
5. Documentación oficial actual para API y comportamiento de dependencias. Si contradice una guía académica o una salida real, registrar la diferencia y preguntarte qué comportamiento pedagógico quieres.

**Orden de ejecución:** `CLAUDE.md` del proyecto explica rutas, comandos, bloqueos y remite a ambos documentos. Una decisión se registra con ID, opciones descartadas, motivo, fecha, efecto en tests y tu aprobación. Un cambio de alcance actualiza spec, matriz de pruebas y hitos antes de tocar el código.

**Corrección a la tabla §2:** la copia localizada de CLAUDE-GLOBAL tiene secciones 0–12; las referencias §13–15 del borrador eran incorrectas. Su §3 presupone que Claude no ve la pantalla: si la sesión dispone de una herramienta visual, puede usarla, pero una inspección propia no reemplaza tu aceptación del diseño.

### 6.2 Alcance verificable y fronteras

**En Fase 1:** una partida individual T1 IPv4, dos estaciones según la guía, tres routers R1–R3, la conectividad necesaria, miniquiz, cables, configuración del PC y consola serial, verificación, calificación, explicación de fallos y reintento. Se implementa **solo RIPv1** de acuerdo con DEC-06. La IP se configura en ajustes y el jugador puede intentar ping manualmente desde el PC; el rango de destinos manuales sigue por definir. **Fuera:** emular todo IOS, red real, multijugador, tráfico de paquetes real, navegador/Windows/PuTTY con licencia real, T2/T3, tutorial desbloqueado y NPC temporal salvo decisión expresa.

**Control de alcance aprobado:** cada tarea, PR y prueba de Fase 1 que mencione `version 2`, `RIPv2` u `OSPF` debe retirarse o registrarse como futuro; la única excepción son notas explícitas de exclusión. La entrada X/Y pertenece a la UI inicial y al estado canónico de la partida.

**No confundir tres niveles:** equivalencia académica (cumple el laboratorio), fidelidad física (puertos, distribución) y fidelidad textual (salidas de CLI). La guía define lo primero, las fotos y mediciones lo segundo, y capturas del equipo concreto lo tercero. Cuando falta evidencia, usar placeholders y etiquetar el comportamiento como modelo propuesto, nunca como salida idéntica a IOS.

### 6.3 Dependencias que faltan recibir

| ID | Material | Para qué se usa | Estado/alternativa provisional |
| --- | --- | --- | --- |
| Q-01 | Fotos legibles por zonas de jaula, patch panel, PCs, cables y puertos; permiso de uso | Nodos, etiquetas, anclas y fidelidad espacial | ⬜ Bloquea aceptación visual H5/H8; placeholders dimensionales |
| Q-02 | Número de PCs, puestos y forma de mover consola entre R1/R2/R3 | Flujo de UI y estado serial | ⬜ Contrastar con diagrama; no inventar conexión fija |
| Q-03 | Mapa de bocas de parrilla y conexiones internas preexistentes | Grafo físico | ⬜ Sin él no atribuir una boca a una PC ni marcarla correcta |
| Q-04 | Modelos de router/switch y prueba de cable directo/cruzado/auto-MDIX | Reglas del enlace y CLI | ⬜ Simular una regla didáctica solo si la apruebas |
| Q-05 | Transcripciones IOS con versión, prompt, comandos, errores, paginación y reinicio | Fixtures de consola | ⬜ Texto fiel queda bloqueado; funciones semánticas pueden avanzar |
| Q-06 | Capturas de ping y de `show ip route` antes/después de convergencia | TTL, ARP, rutas, formato | ⬜ No prometer igualdad carácter por carácter |
| Q-07 | Rango institucional de secciones/grupos y correspondencia de roles con etiquetas físicas | Validación de entrada del jugador y asignación de equipos | ⬜ Aceptar solo X/Y cuyas direcciones derivadas sean válidas; X=1, Y=1 es ejemplo, no valor por defecto obligatorio |
| Q-08 | Tabla de calificación, distractores/quiz, líneas de Sofi/Miguel/Samu | Evaluación y contenido | ⬜ Bloquea H6/H7 definitivo |
| Q-09 | Paquete y manifiesto de assets con licencias | Integración final | ⬜ H0–H7 pueden usar figuras provisionales |

**Entrada y validación de X/Y:** la guía define X = sección, Y = grupo y `YX` como concatenación decimal. Pedirlos al jugador al comenzar (DEC-34), generar las IP a partir de la misma pareja y mostrar el resultado antes de continuar. Para X=1,Y=1: PC-1 = 192.168.30.11 y PC-2 = 192.168.40.11. Validar antes de generar: Y+1 y YX deben ser octetos 1–254, no pueden ser direcciones de red/broadcast ni duplicar gateway u otro host; X,Y deben producir octetos válidos en loopbacks; restringir o pedir corrección de grupos incompatibles, no envolver valores ni truncarlos. Los routers R1 G0/0=.10.Y, R1 G0/1=.20.Y, R2 G0/0=.10.(Y+1), R2 G0/1=.30.1, R3 G0/0=.20.(Y+1), R3 G0/1=.40.1; loopbacks R2 172.16.X.Y/16 y R3 172.17.X.Y/16. La forma de notación de máscara se guarda como prefijo y se presenta como 255.255.255.0 o 255.255.0.0.

## 7. Arquitectura de programación y contratos

### 7.1 Dependencias entre módulos

```text
React (pantallas, escritorio, consola, diálogos, accesibilidad)
  └── AppController (acciones, store, suscripciones, persistencia)
       ├── Core puro (modelo físico, configuración IOS, rutas, ping, puntuación)
       └── Adaptador Phaser (escenas, cámara, sprites, cables, efectos)
             └── Catálogo de assets + cage-layout.json
Fixtures y escenarios → pruebas del Core y E2E → build estático
```

**Límites exigidos:** Core no importa DOM, React, Phaser, temporizadores de sistema ni `Math.random()`. Phaser transforma eventos de puntero en acciones tipadas, y recibe proyecciones del estado. React usa el mismo controlador; ninguna vista modifica directamente un objeto de router. La librería de terminal solo representa texto y recoge teclas: no define la semántica IOS. Una sola instancia de Phaser por contenedor, destrucción en cleanup y unsubscribe de todos los listeners.

### 7.2 Estructura sugerida (DEC-22 pendiente)

```text
src/core/{types,scenario,addressing,physical,ios,rip,routing,ping,grade,reducer,selectors}.ts
src/app/{controller,store,persistence,view-model}.ts
src/game/{bootstrap,scenes,ports,cables,camera,asset-loader}.ts
src/ui/{screens,desktop,terminal,feedback,quiz,notebook}.tsx
src/content/{es,quiz,feedback}.ts
src/assets/manifest.ts
fixtures/{cli,scenario,expected}/
public/assets/placeholders/
tests/{unit,integration,e2e}/
docs/{DECISIONES,ESTADO,CONTRATOS_ASSETS,FUENTES,POSTMORTEM}.md
scripts/{dev,build,test,stop}.*
CLAUDE.md, package.json, package-lock.json, vite.config.ts
```

**Contratos de tipos propuestos:** `DeviceId`, `PortId` y `CableId` son identificadores estables creados en Core; `roleId` y `physicalLabel` distintos; `Port` tiene medio, clase, disponibilidad y coordenada visual en *un archivo separado*; `Cable` tiene tipo y dos extremos opcionales, color visual y estado de asiento; `RouterConfig` contiene hostname, running, startup, interfaces y proceso RIP; `PcConfig` guarda IP/máscara/gateway y puerto; `GameState` incluye `schemaVersion`, `seed`, `scenario`, `phase`, `devices`, `cables`, `consoleLink`, `pcs`, `clock`, `actions`, `attempts`. `GameAction` lleva `{type, payload, actionId, gameTick}`. `Result<T>` contiene éxito o código de error estable; texto localizado solo en presentación.

**Contrato de acción:** `dispatch(state, action) -> {state, events}`; acciones inválidas devuelven error sin modificar state. Eventos de dominio (`LINK_UP`, `PORT_BUSY`, `ROUTE_LEARNED`, `PING_HOP_FAILED`) son hechos derivados del estado; no son comandos enviados por un componente a otro. Orden reproducible con tick + secuencia, y avance de reloj controlado por `ADVANCE_TIME`. Para reproducción, el log contiene versión de escenario, semilla y acciones; no debe incluir datos personales por defecto. Persistencia por snapshot y migración/versionado; el log de acciones puede exportarse por decisión DEC-27.

### 7.3 Datos de topología y nomenclatura

Declarar `topology-1.json` como escenario lógico validado y `cage-layout.json` como representación física. No mezclar IPs en píxeles ni posiciones en cálculo de rutas. Un mapeo `roleId -> physicalDeviceId` asigna R1/R2/R3, SW y PCs según DEC-11. Los enlaces lógicos necesarios entre routers: R2 G0/0 ↔ R1 G0/0; R1 G0/1 ↔ R3 G0/0. Las redes LAN lógicas son PC-1 ↔ R2 G0/1 y PC-2 ↔ R3 G0/1; **ambos PCs utilizan un solo switch físico asignado**. La decisión FIS-Q5 confirma R2 G0/1 y R3 G0/1 como extremos LAN hacia el mismo switch y los puertos libres del switch como equivalentes; el direccionamiento y los puertos de routers son los del PDF. La guía del curso no especifica cada boca ni número de switch; no codificar `SW8:45` como verdad. Validar puerto ocupado, medio compatible, prohibición de dos puntas en mismo puerto, puertos asignados, segundo extremo y ciclos físicos inesperados. Un cable de consola es una conexión de administración independiente del grafo de datos; moverlo cierra/invalida la sesión serial activa (DEC-30).

**No imponer un único cableado correcto:** si DEC-12 permite puertos libres, comparar conectividad y restricciones de laboratorio, no IDs exactos de puerto. Si una conexión a otro dispositivo crea una ruta alternativa válida pero rompe la topología pedida, registrar resultado técnico y discrepancia de consigna por separado.

## 8. Estado de partida y flujo de interacción

### 8.1 Máquina de estados propuesta

| Estado | Entrada | Acciones válidas | Salida |
| --- | --- | --- | --- |
| `HOME` | Nueva partida | Nombre según DEC-29, ingresar y validar X/Y; confirmar IP derivadas | `SELECT_TOPOLOGY` |
| `SELECT_TOPOLOGY` | Escenario cargado | Elegir T1 IPv4; ver bloqueados | `QUIZ` |
| `QUIZ` | Preguntas T1/protocolo aprobado | Responder, corregir/reintentar | `TOOLS` |
| `TOOLS` | Inventario inicial | Clasificar/reunir cables | `LAB` |
| `LAB` | Escenario físico activo | Zoom, conectar/desconectar, abrir cuaderno, ir a PC | `DESKTOP` o `REVIEW` |
| `DESKTOP` | PC y cable de consola según reglas | Configurar IP, ver COM, abrir/cerrar serial, ping, volver | `LAB` |
| `REVIEW` | Pulsar Entregar | Congelar snapshot, simular checks, calcular nota | `FEEDBACK` |
| `FEEDBACK` | Resultado calculado | Inspeccionar ida/vuelta, reintentar/exportar si aprobado | `LAB` o `HOME` |

**Importante:** `LAB` y `DESKTOP` son vistas intercambiables una vez habilitadas; `phase` no debe impedir arreglar cableado tras configurar la PC. `REVIEW` congela una copia para evitar que la nota cambie mientras se anima; Try again crea una partida completamente nueva desde el inicio, según DEC-15. El quiz y las herramientas no deben obligar a una ruta de interacción que impida volver al cuaderno. Todos los bloqueos muestran causa y acción siguiente. El tutorial bloqueado se distingue visualmente de un botón averiado.

### 8.2 Interacciones delicadas

- Cable: seleccionar tipo y unidad → apuntar puerto libre → conectar extremo A → vista de cable pendiente con A visible → conectar B o cancelar con Escape/botón; al soltar en vacío no consumir cable. Desconectar libera ambos puertos y reevalúa links/rutas; confirmar solo si la desconexión elimina progreso significativo (DEC-31).
- Zoom: preservar selección y estado de cable al cambiar zona; etiquetas y hover deben existir también por clic/teclado; hitbox accesible y prioridad de puerto frente al cable dibujado.
- PC: NIC, COM y adaptador son recursos diferentes. COM aparece solo si adaptador reconocido; abrir terminal con COM incorrecto da fallo específico. El estado serial pertenece al router conectado, no al componente que muestra el terminal. Configuración escrita no se pierde por cerrar ventana; `reload` aplica startup, no running.
- Cuaderno: acceso explícito por botón/tecla además de hover; mostrar rol ↔ etiqueta, esquema, tabla de IP y notas de puertos confirmadas; su contenido sale del mismo escenario usado por el Core.
- Guarda: `visibilitychange`/cierre de ventana disparan flush si DEC-18 aprueba persistencia; validar y migrar al cargar, dar recuperación clara si el JSON está corrupto y permitir nueva partida sin perder la versión corrupta hasta que el usuario elija.

## 9. Simulación de red, CLI y evaluación

### 9.1 Capas del Core y ruta de decisión

1. **Física:** dos extremos, puertos, tipo de cable, asiento, alimentación si el escenario la exige. Resultado por enlace: `up/down` y razón.
2. **Enlace/IP:** interfaz administrativamente up/down, link físico, IP y máscara válidos, subred compartida, duplicados, PC NIC/gateway. Loopback no requiere cable.
3. **Control:** rutas C y L activas, RIPv1 en interfaces cubiertas por declaraciones `network`, vecinos RIPv1, recálculo sin espera perceptible según DEC-14; tabla calculada con distancia y siguiente salto. Nunca derivar una ruta RIP solo porque hay un camino físico.
4. **Datos:** para cada eco, resolver destino local o gateway, elegir ruta más específica y luego prioridad administrativa/métrica del modelo, verificar siguiente salto y enlace, decrementar TTL, evaluar respuesta por separado. Registrar `trace` de decisiones por salto y motivo de descarte; la ida exitosa con retorno fallido debe aparecer como caso propio.
5. **Evaluación:** calificar el snapshot por criterios explícitos, sin heurísticas que lean textos de consola o animaciones. El diagnóstico usa los hechos registrados por el mismo motor que produjo los pings.

**Advertencia técnica:** no usar Dijkstra solo sobre cables como sustituto de RIP. Un cálculo por rondas de anuncios y rutas condicionado por `network` y estado del enlace es suficiente para la topología pequeña; decidir qué partes avanzan en ticks y cuáles se calculan de golpe. RIPv1 es classful y no incluye máscara; probar las rutas 172.16.0.0/16 y 172.17.0.0/16 con X/Y ingresados por el jugador, sin inventar VLSM. En RIP, 16 es infinito y 15 el máximo alcanzable. **No implementar `version 2`, compatibilidad con RIPv2 ni OSPF en Fase 1.** Si el jugador escribe un comando fuera del catálogo, responder con una indicación honesta de alcance sin fingir una salida literal de IOS.

### 9.2 Semántica de sesión IOS

Modos: `user exec` (`>`), `privileged exec` (`#`), `global config` (`(config)#`), `interface` (`(config-if)#`), `router rip` (`(config-router)#`), y diálogo de confirmación como estado separado. El prompt lo deriva el hostname actual. Entrada por línea, tokenización con abreviaturas *no ambiguas*, normalización de espacios, `?` contextual sin Enter y Tab de completado; mensajes de error de sintaxis solo se llaman “idénticos a IOS” si están en fixture. Comandos operan en el modo autorizado; `end`, `exit`, Ctrl+C con semántica por modo; interrupción nunca deja una operación de escritura parcialmente aplicada. Limitar el scrollback; `--More--` consume espacio/Enter/q si se habilita. No ejecutar shell, `eval`, ni URLs a partir de texto introducido.

**Persistencia de router:** `running-config` cambia al aceptar comandos; `copy running-config startup-config` copia a NVRAM; `erase startup-config` limpia NVRAM tras confirmar; `reload` descarta running y repuebla desde startup (o configuración limpia), con tiempo modelado. Si se configura sin borrar, queda la “configuración sucia” inicial; no imponer borrar como condición mágica de aprobación si el estado final funciona y DEC-15 valora resultados. Toda acción de borrado o recarga se reproduce en el log y se prueba tras cambiar de router.

### 9.3 Catálogo mínimo de CLI por modos (confirmar modelo/IOS y alcance)

| Modo | Comandos previstos | Prueba semántica |
| --- | --- | --- |
| User EXEC | `enable`, `ping`, `show` permitidos según fixture | Entra a privileged, mensaje cuando falta permiso |
| Privileged | `configure terminal`, `show ip route`, `show ip interface brief`, `show interfaces`, `show running-config`, `show startup-config`, `show ip protocols`, `ping`, `copy running-config startup-config`, `erase startup-config`, `reload`, `disable` | Salidas reflejan el estado real del motor; confirmaciones abortables |
| Global config | `hostname`, `interface g0/0|g0/1|loopback 2|3` según router, `router rip`, `no router rip`, `end`, `exit`, `do show ...` si fixture lo respalda | Configura router actual y valida parámetro |
| Interface config | `ip address <ipv4> <mask>`, `no ip address`, `shutdown`, `no shutdown`, `description`, `exit`, `end` | Cambia interfaz, rutas y estado observable |
| Router RIP | `network <major-network>`, `no network <major-network>`, `version 1`, `no version`, `exit`, `end` | Publica y aprende redes elegibles por RIPv1; `version 2` fuera de alcance |
| Terminal PC | `ping <ipv4>`, `ipconfig` (si DEC-16) | Mismo motor de paquetes que calificador |

**Fuera del catálogo:** `?` y Tab son edición, no comandos. Las entradas conocidas pero no implementadas deben dar respuesta pedagógica honesta o error de comando soportado condicionado por DEC-13; cualquier entrada arbitraria debe tener respuesta, sin congelar el terminal. Fixture por comando: entrada literal, modo, estado inicial, salida, cambios de estado y procedencia (router físico/Packet Tracer/guía). Diferencias de versión de IOS van a variantes de fixture; nunca se “corrigen” con texto adivinado.

### 9.4 Pruebas de conectividad y recorrido

**Matriz de entrega confirmada para PC-1↔PC-2; diagnósticos adicionales:** PC-1→gateway R2; PC-2→gateway R3; R2→R1; R1→R3; PC-1→PC-2; PC-2→PC-1; R1/R2/R3→loopback remota cuando corresponda. Para cada par registrar fuente, destino, protocolo, número de ecos, éxito/fracaso, ruta de ida, ruta de respuesta y causa por salto. Para PC-1→PC-2 la ruta esperada bajo solución T1: PC-1 → switch/patch LAN1 → R2 → R1 → R3 → switch/patch LAN2 → PC-2, respuesta inversa si todas las rutas existen; la existencia y etiquetado de tramos de patch se confirman con Q-03. No simular pérdidas iniciales por ARP en esta fase (DEC-32). Tampoco imponer una espera de convergencia RIPv1 (DEC-14).

**Diagnóstico honesto:** “Primer punto comprobado de fallo: R2 G0/0” cuando un evento permite probarlo; “No se pudo determinar” cuando múltiples causas impiden precisar. La animación del recorrido procede de `trace`, nunca de suposiciones de UI. En caso de varios errores, presentar causa raíz más temprana en la ruta, factores independientes y pruebas que la sustentan; no ocultar que después puede haber otro fallo aún no observable.

### 9.5 Taxonomía inicial de fallos (ids estables; afinar con tu revisión)

| ID | Inyección reproducible | Primera evidencia esperada | Diagnóstico previsto |
| --- | --- | --- | --- |
| F-01 | Cable de datos ausente | Puerto sin peer, link down | Falta enlace entre extremos identificados |
| F-02 | Extremo a equipo/puerto equivocado | Mapa físico difiere, camino no llega | Puerto y destino, no atribuirlo a IP |
| F-03 | Tipo de cable inválido bajo DEC-07 | Físico down | Medio/tipo y pareja esperada |
| F-04 | Conector no asentado bajo DEC-08 | Asiento false, luz off | Pedir reconectar y dar ubicación |
| F-05 | Interfaz router `shutdown` | Admin down en `show ip interface brief` | Router e interfaz |
| F-06 | IP o máscara de interfaz incorrecta | Red local o duplicado inválido | IP configurada y red de la guía |
| F-07 | IP/máscara de PC incorrecta | PC no pertenece a LAN | PC y campo incorrecto |
| F-08 | Gateway de PC incorrecto/ausente | Sin salto local hacia router | PC y gateway esperado |
| F-09 | Cable/COM/velocidad serial incorrectos | No hay sesión CLI | Medio y COM; no simular pérdida de datos IP |
| F-10 | `network` RIP faltante en router | Falta ruta anunciada o vecino | Router, declaración y red no aprendida |
| F-11 | Incompatibilidad entre versiones RIP | **No aplica a Fase 1**: solo RIPv1 | Reservado para una fase futura; no penalizar ni exigir prueba |
| F-12 | Configuración sucia/conflictiva | Estado en running o startup | Valor conflictivo y equipo; no asumir que siempre rompe |
| F-13 | Ruta de retorno ausente | Eco llega; respuesta se descarta | Salto de vuelta y ruta faltante |
| F-14 | Proceso sin converger según DEC-14 | Temporizador pendiente y ruta no instalada | Esperar/avanzar; no penalizar como error definitivo |

**Cobertura:** no todos los fallos deben penalizar ni bloquear un ping (ej. F-09 afecta administración, F-12 solo si produce conflicto); el test debe probar causalidad, no buscar una cadena de texto. Si DEC-07/08/06 excluye un fallo, marcar ese ID «no aplica» y ajustar DoD-3 antes de implementarlo. Variaciones adicionales: IP duplicada, máscara equivocada que coincide casualmente, dos fallos simultáneos, ruta de ida sin respuesta, puerto ocupado, dispositivo sin energía (Fase 2), borrado después de copiar, estado físico cambiado después de convergencia.

### 9.6 Calificación propuesta, pendiente DEC-15

Separar **rubrica** de **diagnóstico**: `grade(snapshot, rubricVersion) -> {score, maxScore, items[], connectivity[], traceIds[], caveats[]}`. Propuesta delegada en documento 06, pendiente de revisión de Gabriel: físico 20, IP/gateway 20, RIP/rutas 20, ping bidireccional 40, quiz 0, total 100; conversión a escala 0–5 solo si la decide. Prohibir otorgar 100 porque el jugador escribió comandos esperados si el estado final falla; permitir solución funcional alternativa si la rúbrica lo admite. Cada ítem tiene criterio medible y referencia a evidencia del snapshot. Nota reproducible para misma semilla y acciones. No existe espera de convergencia en Fase 1: Entregar captura el estado actual inmediatamente. El jugador debe poder ver en qué se basó cada descuento.

## 10. Evidencia, fixtures y estrategia de pruebas

### 10.1 Captura y control de fuentes

Guardar fixtures de capturas **propias y autorizadas**, identificadas por modelo/IOS, origen físico o Packet Tracer, X/Y, fecha, configuración inicial y comandos para reproducir. Sanitizar nombres propios, credenciales y datos ajenos. Preferir texto copiado y capturas adjuntas solo para salidas cuya forma dependa de visual; mantener `README` que marque “esperado exacto” frente a “referencia semántica”. El texto académico de la guía no equivale a la salida literal del router. No distribuir como assets la guía de la Universidad sin permiso. Fixtures de una versión de IOS no implican fidelidad a otra.

**Oráculos por prioridad:** comportamiento de la práctica física cuando se conozca > guías entregadas para requisitos pedagógicos > Packet Tracer como comprobación auxiliar > RFC 1058 para RIPv1; RFC 2453 queda como referencia de una fase futura. Ante discrepancia, abrir `ISSUE-EVIDENCE` y resolver contigo; documentar cuál prevalece para la prueba concreta.

### 10.2 Pirámide de pruebas vinculada a criterios

| Nivel | Casos imprescindibles | Evidencia |
| --- | --- | --- |
| Unitarias Core | X/Y válidos e inválidos, cable/puerto, parser por modo, abreviaturas ambiguas, startup/running/reload, RIP condicionado, rutas, trace de ida/vuelta, puntuación | Vitest: asserts sobre estado, códigos y rutas |
| Propiedades/invariantes | Un puerto ≤1 cable, acciones inválidas no mutan, misma semilla/acciones → mismo resultado, ruta nunca usa interfaz down, guardar/cargar conserva estado | Semillas fijas y casos límite |
| Integración | Conectar → habilitar interfaz → declarar RIP → converger → ping bidireccional; desconectar después → rutas cambian; mover consola tras cambiar router | Store + Core + adaptadores |
| Golden fixtures | Transcripciones autorizadas, comparación exacta solo en secciones con captura equivalente | Snapshot con origen |
| E2E | Inicio→quiz→inventario→jaula→PCs→CLI→Entregar→feedback→reintento; error F-10 + corrección; recarga; zoom/drag | Playwright + revisión visual del usuario |
| Visual/performance | Resoluciones aprobadas; zoom, hitbox, legibilidad, contraste y CPU/GPU en dispositivo elegido | Checklist, capturas, FPS y latencias |

**Harness `window.__lhn` solo en desarrollo/test:** crear partida semillada, despachar acciones, adelantar reloj, leer proyección y trace, exportar log. No exponer mutación arbitraria en producción ni utilizar el harness como única prueba del flujo real. Evitar tests frágiles que comparen un screenshot completo cuando bastan hitboxes o acciones. Pruebas de navegador en Chromium/Firefox/WebKit según DEC-19; verificar el navegador real del usuario para aceptación final.

### 10.3 Escenarios obligatorios de aceptación técnica

- S-01 X=1 Y=1 genera todas las IP de la guía; S-02 X/Y fuera de rango se rechaza explicando octeto; S-03 solución completa aprende rutas y ping en ambos sentidos; S-04 conectar físicamente bien sin RIP falla en primer router sin ruta; S-05 `shutdown` baja rutas conectadas y RIP afectado; S-06 gateway incorrecto rompe salida de PC pero no tabla RIP; S-07 falta ruta de retorno evidencia eco llegado y respuesta perdida; S-08 salvar, `erase`, `reload` verifica contenido de NVRAM; S-09 mover consola cambia prompt/router sin mezclar input; S-10 F-01…F-14 aplicables a RIPv1 (F-11 no aplica); S-11 reload de página según DEC-18; S-12 intento de pegado bloqueado y cancelación de confirmación sin corrupción; S-13 equipamiento ajeno/puerto ocupado no muta; S-14 semilla reproducible y exportación de reporte sin nombre si DEC-27.

## 11. Contrato con el equipo de assets

La programación fija el sistema de coordenadas y eventos; arte entrega piezas exportadas, no lógica. Antes de producir arte final se pacta `docs/CONTRATOS_ASSETS.md` y un manifiesto validado en build. Cada pieza incluye: ID canónico, función y variante, formato, ancho/alto en píxeles, escala, densidad/atlas si aplica, origen `(0,0)`, punto de anclaje, capas/z-index, margen transparente, zona de clic, coordenadas locales de cada puerto, fotograma/orden de animación/FPS, licencia y crédito, placeholder equivalente. Separar `cage` general, zonas zoom, dispositivos, patch, LEDs, cables y extremos, Sofi/Miguel/Samu, escritorio, iconos, sonidos, fondos, fuentes.

**Medidas a decidir juntos:** resolución lógica y CSS de escalado DEC-03; gama y paleta de cables (cada unidad diferenciada además por patrón/ID, no color solamente); rejilla mínima de hitboxes; 1×/2× y gestión de textos DOM; profundidad y clips; máximo tamaño/weight total de carga. Cada sprite con puerto declara su ancla en coordenadas relativas para que el equipo de arte pueda redibujarlo sin cambiar lógica. El adaptador render detecta manifiesto faltante y muestra placeholder + diagnóstico; nunca hace fallar toda la partida por un sprite secundario. El usuario valida una escena de jaula real junto a una foto antes de sustituir todos los placeholders.

**Entrega:** paquete versionado + `assets-manifest.json` + PNG/WebP/atlas y audio cuando se apruebe + una imagen de referencia por zona + licencias/permiso; script de validación de duplicados, dimensiones, atlas y coordenadas dentro de sprite. Prioridad de solicitudes al equipo: primero layout y puertos, luego cables e interacciones, después personajes, fondos, voz y adornos. Animaciones decorativas nunca controlan la finalización de una acción del Core.

## 12. Rendimiento, accesibilidad, compatibilidad y privacidad

### 12.1 Presupuesto propuesto pendiente de dispositivo de referencia

Equipo, navegador, resolución y metodología los fijas en DEC-33. Propuesta: mediana ≥55 FPS durante navegación/drag en portátil de referencia; p95 de eco de tecla <50 ms; p95 acción física→LED <100 ms sin retraso intencional; tiempo para primera interacción y MB transferidos con valores N/M que apruebes tras H0; sin tareas de JS >100 ms en operación normal. Medir con build de producción, CPU moderada, caché fría/caliente, escenarios con el máximo de cables y terminal abierto. Registrar versión y dispositivo, no afirmar que “se siente fluido” solo por un test de Node.

Render: cargar assets por escena, reutilizar texturas, límites de trazos/partículas, curvas de cables sin simulación física salvo DEC-28, CSS en DOM para textos largos, zoom y resize con dimensiones del contenedor, no cada frame. Si WebGL falta, mostrar mensaje inteligible según versión elegida y soporte aprobado; si el audio no inicia hasta gesto, no bloquear el juego. Mantener entrada/scroll del terminal sin que el canvas robe foco.

### 12.2 Accesibilidad y plataformas

Toda acción esencial tiene alternativa a hover/drag; zoom y conexiones con selección + teclado/clic, foco visible, Escape para cerrar/cancelar; el cuaderno y feedback como DOM legible. Texto en español con acentos y signos, salida CLI en inglés cuando corresponda, tamaño escalable, contraste, patrones además de color en cables/LEDs, opción silenciar, `prefers-reduced-motion` y resumen textual del ping igual al recorrido animado. Si DEC-19 excluye touch, detectar viewport insuficiente y explicar resolución mínima sin bloquear navegador de escritorio por una mera anchura temporal.

### 12.3 Privacidad y seguridad

Nombre del jugador: decidir si obligatorio, público y persistente (DEC-29); recomendación de diseño: seudónimo opcional local, sin subir calificaciones ni identificadores. Si se elige backend, detener implementación de datos hasta aprobar retención, roles, acceso profesor/estudiante, borrado, consentimiento y reglas de seguridad. Exportaciones de partida omiten nombre y texto libre por defecto. Validar importaciones/snapshots; no inyectar entrada de consola en HTML sin escapar; no cargar fuentes o scripts de terceros sin licencia y justificación. No almacenar credenciales reales ni imitaciones de cuentas de la Universidad.

## 13. Hitos de desarrollo con puertas de aceptación

**Regla común:** cada hito tiene demo en build, pruebas necesarias, revisión tuya de decisiones y `ESTADO.md` con ✅/🟡/❓. Después de tu verificación se hace commit y se inicia el siguiente. El trabajo que no depende de una decisión puede avanzar sin fijarla. Hitos H0–H4 usan placeholders; la falta de assets no congela programación. El orden de implementación dentro de un hito lo decide el desarrollador, y se registran desvíos.

| Hito | Entregable operativo | Decisiones que bloquean su cierre | DoD y prueba que tú puedes realizar |
| --- | --- | --- | --- |
| H0 Fundación y esqueleto | Repo canónico, Phaser 4 fijado, React + core mínimo, URL de build, entrada X/Y provisional, `CLAUDE.md`, `ESTADO.md`, scripts, placeholder visible | DEC-02, 03, 19, 22; DEC-01/34 ✅ | Abrir URL, ingresar X/Y y pasar UI→Core→canvas→UI; ida/vuelta PC↔jaula sin duplicar canvas ni perder selección; sin recursos 404 |
| H1 Topología y acciones | Validación completa de X/Y ingresados, roles/IDs, puertos y cables lógicos, estado reproducible, escenario T1 | DEC-05, 07, 11, 12, 27; DEC-34 ✅; Q-03 para mapa real | S-01, S-02, S-13; las IP del cuaderno y simulador coinciden; misma semilla/X/Y/acciones da el mismo estado |
| H2 CLI y sesión | Modos, parser, running/startup, borrado, reinicio, interfaz, fixtures disponibles | DEC-04, 13, 14, 30; Q-05 para salida literal | Desde PC, cambiar hostname e interfaz, guardar/reiniciar; `show` refleja cambios; error no cuelga la consola |
| H3 RIPv1, rutas y ping | Rutas classful por configuración, tiempo, trace ida/vuelta; solución T1 con X/Y del jugador | DEC-14, 16, 32; DEC-06 ✅ | S-03…S-07 con dos parejas X/Y válidas; `network` faltante falla y al corregirlo la ruta se aprende; no hay v2 ni OSPF |
| H4 Escritorio de PC | IP/máscara/gateway, COM/adaptador, terminal, cmd si elegido, vuelta a jaula | DEC-04, 16, 25, 30; Q-02 | PC mal configurada falla por razón correcta; mover cable consola y entrar a otro router sin mezclar estados |
| H5 Jaula interactiva | Zoom, hitboxes, puertos, inventario, clasificación, cables pendientes, LED/causas | DEC-07…10, 28, 31; Q-01/Q-03 para cerrar fidelidad | Conectar, cancelar, desconectar, cambiar zoom y ver detalles; resultado del cable cambia sim/diagnóstico |
| H6 Flujo narrativo | Inicio con X/Y ya fijados, Sofi/Miguel/Samu provisionales, selector T1/RIPv1, quiz, cuaderno, transiciones, sin guardado en Fase 1 | DEC-17, 18, 20, 21, 29; DEC-34 ✅; Q-08 | Partida desde entrada X/Y hasta jaula/PC, regreso y recarga según decisión; cuaderno muestra IP del jugador; bloqueos explicados |
| H7 Entrega y feedback | Rúbrica, matrices, recorrido ping y retorno, múltiples causas, reintento | DEC-15, 16, 26; Q-08 | S-03 obtiene máximo; F-01…F-14 aplicables indican dispositivo/causa; corregir y reevaluar |
| H8 Integración arte/audio | Manifiesto, sustitución de placeholders y ajuste visual, derechos/voz | DEC-03, 23, 24, 33; Q-01/Q-09 | Comparar jaula a fotos, verificar port anchors/hitboxes, comprobar peso/latencia y fuentes españolas |
| H9 Cierre | E2E publicado, matriz de defectos, compatibilidad, accesibilidad, ensayo usuario | Todas las decisiones aplicables | DoD-1…5 revisados en build final y `ESTADO.md`; un ciclo completo exitoso y otro fallido/corregido |

**Hitos futuros fuera de esta entrega:** RIPv2 y OSPF requieren una nueva decisión y spec con aceptación propia; no existe H3b dentro de Fase 1. T2/T3 se diseñarán en otra spec con su propia aceptación. Si algún dato Q llega tarde, cerrar el hito técnico como 🟡 provisional y reabrir su criterio visual/textual cuando llegue; no declararlo ✅ final.

### 13.1 Plantilla de cada tarea pequeña para Claude Code

```md
### TASK-Hn-xx — verbo y objeto
Entrada: spec §§, decisiones ✅, versión del escenario, fixture y commit base.
Objetivo observable: acción desde la UI real hasta estado/resultado visible.
Archivos autorizados a modificar: ...
Criterios: dado ... cuando ... entonces ... (caso feliz y dos fallos significativos).
Pruebas: comando copiable + URL/pasos manuales y resultado esperado.
Evidencia: logs, ruta de build, captura solicitada cuando dependa del ojo del usuario.
Dependencias/bloqueos: DEC/Q; si falta, parar esta tarea y trabajar otra independiente.
Cierre: diff resumido, límites, ESTADO.md, revisión del usuario, commit.
```

**Primer mensaje sugerido en proyecto:** “Lee `~/.claude/CLAUDE.md`, `CLAUDE.md`, esta spec y `docs/DECISIONES.md` completos. Resume reglas de parada en cinco líneas y dime qué decisiones bloquean H0. No escribas código hasta que confirme las decisiones irreversibles. Después implementa solo H0, pruébalo desde su entrada real y entrégame URL, comandos y evidencia.” En sesiones posteriores, especifica Hn y el conjunto concreto de TASKs; no pidas “construye todo”.

## 14. Decisiones adicionales descubiertas al concretar la arquitectura

| ID | Qué debes decidir | Opciones y efecto | Recomendación para discutir | Antes de | Estado |
| --- | --- | --- | --- | --- | --- |
| DEC-29 | Nombre del jugador | **Sin nombre ni inicio de sesión en Fase 1**; después usuario del laboratorio y práctica por grupo | No mostrar campo de nombre provisional | H6 | ✅ |
| DEC-30 | Al mover el cable consola | **Una misma ventana:** invalidar sesión vieja, mostrar «Conexión interrumpida» y pedir Enter; Enter muestra prompt del nuevo router sin abrir otra ventana | Prompt depende de estado/hostname real del router, no de rol supuesto | H2/H4 | ✅ |
| DEC-31 | Revertir conexión | **Desconexión/reconexión libre**; cable vuelve a inventario | Desconectar consola invalida sesión según DEC-30 | H5 | ✅ |
| DEC-32 | ARP/primer ping | **No simular primer paquete perdido en Fase 1**; registrar para fase posterior | Ping debe fallar solo por estado de red/cables/config | H3 | ✅ |
| DEC-33 | Equipo y umbrales | **MacBook M5 Pro y Chrome** como referencia inicial de fluidez; métricas/umbrales se fijan tras medición | Probar build real con muchos cables y terminal | H8/H9 | ✅ parcial |
| DEC-34 | Entrada de X/Y | **El jugador ingresa X/Y al inicio, ve IP calculadas y las consulta en libreta; quedan fijos durante el laboratorio; cambiarlos exige comenzar otro**. X hasta 9 secciones; Y máximo 18 provisional, máximo real por confirmar | Validar direcciones derivadas y advertir antes de confirmar | H0/H1 | ✅ con límite Y provisional |
| DEC-35 | Qué hacer ante rutas alternativas funcionales | Rechazar por desviación / aprobar conectividad y descontar topología | Separar rúbrica física de conectividad | H7 | ⬜ |
| DEC-36 | Fuente de validación final | Monitor/ayudante del curso, tú, o ambos | Tú apruebas producto; monitor valida solo contenido técnico con tu autorización | H7/H9 | ⬜ |

**Decisiones ya cerradas o parcialmente cerradas:** DEC-01 Phaser 4, DEC-06 solo RIPv1 IPv4, DEC-34 X/Y fijos por partida e ingresados por jugador; GitHub Pages y Chrome de escritorio, mocks iniciales, React para PC, dos PCs físicos y sin guardado. **Abierto:** URL, resolución final, mapeo/selección de equipos y paneles, cable de consola, número de switches, rubric y CLI; ver sección 17/documento 05. Una recomendación nunca es aprobación tácita.

## 15. Fuentes y verificación tecnológica

**Fuentes propias recibidas:** `Let him network.docx` (producto y stack Phaser 3); `LabCeroTopologia.pdf` (tabla T1, roles y expresiones X/Y/YX); `merged (1).pdf` (Guías 1–3: cable consola RJ45→DB9 en el texto, COM/9600 8N1, configuración de interfaces, RIP, verificación). **Discrepancia por resolver Q-01:** tu texto describe cable/adaptador USB, la Guía 2 describe DB-9/RS-232; el hardware concreto de la jaula determina la representación. No extrapolar el cable transpuesto de consola al cable Ethernet cruzado: son funciones y alambrados diferentes.

**Documentación primaria consultada el 24 nov 2026** (revalidar en H0 porque las APIs y versiones cambian):

- [Phaser 4.2.1, descarga y fecha](https://phaser.io/download/release/v4.2.1), [migración Phaser 3→4](https://phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know), [ScaleManager](https://docs.phaser.io/api-documentation/4.0.0/class/scale-scalemanager). Son referencias para la implementación de Phaser 4 aprobado en DEC-01.
- [xterm.js, API y addons](https://github.com/xtermjs/xterm.js/blob/master/README.md). Es terminal de visualización/entrada, no emula IOS; comprobar peso, IME, pegado y foco en spike.
- [React StrictMode](https://react.dev/reference/react/StrictMode) y [useEffect](https://react.dev/reference/react/useEffect): el ciclo extra setup/cleanup de desarrollo exige destruir instancia y listeners.
- [Vite: desplegar sitio estático](https://vite.dev/guide/static-deploy.html) y [GitHub Pages Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site): `base` depende de dominio/ruta; elegir hosting antes de fijarlo.
- [Playwright: navegadores](https://playwright.dev/docs/browsers): Chromium, Firefox y WebKit; pruebas automatizadas no sustituyen inspección visual real.
- [RFC 1058, RIP](https://www.rfc-editor.org/rfc/rfc1058.html) y [RFC 2453, RIP v2](https://www.rfc-editor.org/rfc/rfc2453.html): límites y comportamiento del protocolo; el texto exacto de CLI depende del equipo/IOS.

**Punto de investigación pendiente:** el template exacto Phaser 4/React que se use, versiones efectivas de Phaser 4, React, Vite, TypeScript, Vitest, Playwright, xterm y sus licencias se comprueban en H0 con documentación/repositorio oficial y `npm view`, se fijan en lockfile y se anotan en `docs/FUENTES.md`. No copiar código AGPL u otros proyectos sin revisión de licencia.

## 16. Revisión contigo antes de arrancar H0

**Aprobado:** Phaser 4 + TypeScript + React; T1 IPv4 **solo RIPv1**; X/Y ingresados y fijos por laboratorio; GitHub Pages, Chrome escritorio, mocks iniciales, dos PCs físicos, sin login ni guardado, pantalla que ocupa la ventana. Para cerrar H0 queda obtener URL/slug durante desarrollo, tamaño interno, estructura de repo/pruebas y validación de acceso a GitHub. Para H1/H5 faltan FIS-Q1…Q7 del documento 05. No decidirlas por inferencia.


## 17. Registro físico y prototipo actualizado (24 nov 2026)

Las decisiones específicas, observaciones de las seis imágenes incrustadas en «Let him network.docx», inventario de assets con mocks y dudas FIS-Q1…Q7 están en `05_TOPOLOGIA_FISICA_Y_ASSETS_FASE1.md`. Las reglas antiguas de esta spec que sugieran un solo PC, equipos fijos, un puerto de switch prescrito o guardado local quedan reemplazadas por lo registrado aquí y en documento 05.

**Confirmado:** dos PCs físicos asignados que el jugador configura individualmente; tomas al lado del PC con correspondencia interna a salidas de jaula; el jugador conecta datos PC→toma mediante RJ45↔RJ45 y salida→switch. Para consola usa USB→RJ45 PC→toma→jaula→CONSOLE del router. El juego sortea tres routers físicos funcionales entre rótulos 1–12 y asigna automáticamente R1/R2/R3; el router dañado puede variar por partida. **Un switch físico asignado y compartido por ambos PCs**, aunque el diagrama académico tenga dos. Cualquier puerto libre adecuado del switch asignado es válido. Falta confirmar cuántos routers están averiados y mapa completo de cables.

**Diferencia técnica crítica:** Gabriel confirmó que el cable USB→RJ45 es **para consola**, mientras el cable de datos es RJ45↔RJ45. Verificar el modelo y pinout USB→serial y que aparezca COM antes de cerrar ese comportamiento. No inferirlo de los colores de la caja de cables.

**Producto/prototipo:** GitHub Pages, URL exacta pendiente hasta que el usuario la dé durante trabajo con Claude Code; Chrome de computadora, toda la ventana; figuras y líneas mock intercambiables por assets posteriores; aviso de pérdida al recargar, sin estado guardado; libreta muestra X/Y y direcciones derivadas; X/Y no cambian sin iniciar otro laboratorio. La meta de transición Phaser↔React es continuidad visual, sin reload ni estado duplicado.


**Aclaración del 24 nov 2026:** PC-1→parrilla→switch compartido→router extremo→dos enlaces directos consecutivos entre tres routers→router extremo→mismo switch→parrilla→PC-2. Asignaciones fijas durante el laboratorio; el router no asignado «dañado» solo se menciona al inicio y no afecta ping, cables ni rutas. **Decisión final:** la narración oral con PC-1 en `.10` fue un ejemplo; seguir **íntegramente** el PDF página 3: PC-1↔R2 G0/1 en `.30`, R2 G0/0↔R1 G0/0 en `.10`, R1 G0/1↔R3 G0/0 en `.20`, R3 G0/1↔PC-2 en `.40`. En el switch compartido cualquier puerto Ethernet libre funciona; no se exige VLAN ni una numeración por LAN. El encaminamiento se calcula por IP, gateway, interfaces y rutas; el juego no afirma que el switch identifique subredes por IP ni adivina su configuración interna real.


## 18. Decisiones sobre consola y evaluación (24 nov 2026)

**Evaluación:** conectar mal y corregir es libre; ningún intento de cableado resta puntos. Solo se evalúa el resultado al entregar. El LED de Fase 1 informa únicamente el enlace físico, no la corrección de IP. **Futuro solicitado:** actualizar la señalización también cuando cambie la IP; definir un indicador adicional o una interpretación nueva del LED antes de implementar, porque el LED de enlace físico real no prueba IP.

**Conector:** cada conexión puede no asentar con probabilidad **2 %** (0,02, corrección expresa de Gabriel). Se remedia retirando y reconectando, sin penalización. La semilla/estado del intento permite reproducir el caso; falta decidir si se sortea al unir el segundo extremo o al insertar cada conector, y qué pista diferencia asiento fallido de cable equivocado.

**Consola:** los dos PCs reciben números COM distintos sorteados al crear el lab, estables durante ese lab; al cambiar de lab pueden variar. PuTTY simulado imita la ventana de la guía, con Serial y 9600/8N1/sin control de flujo predefinidos; de los campos de conexión solo COM es editable. Al mover la consola de R1 a R2 se invalida/cierra la sesión vieja; aparece «Conexión interrumpida» y, tras Enter con nuevo enlace, se muestra el prompt correspondiente al router recién conectado. El prompt depende del hostname/estado del nuevo router; se conserva la misma ventana y no se abre otra. Ningún comando tras el movimiento debe ejecutarse en el router anterior.

**CLI de Fase 1:** comandos completos del catálogo aprobado, sin abreviaturas; historial con flechas arriba/abajo; sin pegar comandos (ni uno ni varios) en esta primera entrega. Un comando fuera de catálogo devuelve exactamente «Comando no disponible en laboratorio» sin cambiar el estado. Tiempo de `erase`/`reload` visible pero duración no decidida. Routers pueden arrancar con configuración previa aleatoria reproducible; **se exige `erase startup-config` y `reload` en los tres routers siempre**, aunque el prompt sea `Router>` o el arranque esté vacío. La apariencia de configuración previa y los mensajes exactos siguen pendientes.

**Identidad de equipos:** la foto del rack parece mostrar la serie 2911 en routers superiores y serie 2800 en los inferiores; no son todos el mismo modelo. El PDF de topología exige puertos lógicos G0/0 y G0/1. Gabriel pide que 9–12 se representen como FastEthernet, pero su frase final «para nada vamos a usar F» contradice esa regla; dejar explícitamente pendiente cuál de las dos instrucciones prevalece antes de programar el parser/puertos. No extrapolar que todos los modelos Cisco 2800 reales usen F. Referencias Cisco: https://www.cisco.com/c/en/us/td/docs/routers/access/2900/hardware/installation/guide/Hardware_Installation_Guide/Overview.html y https://www.cisco.com/c/en/us/td/docs/routers/access/1900/software/configuration/guide/Software_Configuration/routconf.html . Capturar fixtures exactos de comandos/boot con el modelo y versión IOS elegidos; la captura del PDF guía muestra un 2811 de Packet Tracer y `Router>`, no demuestra la versión de los routers físicos.


## 19. Cierre del lote de quiz, ping, entrega y hardware (24 nov 2026)

Ver `06_QUIZ_PING_ENTREGA_Y_RUBRICA.md` y `07_MODELOS_CLI_Y_PREPARACION_CLAUDE_CODE.md` para reglas completas y decisiones pendientes. Tres preguntas acertadas para acceder a jaula, repetibles y sin puntos de nota; cuaderno como única ayuda y soporte para apuntes; topología ilustrada con IP calculadas para X/Y y rangos de red del PDF, asset final aportable por Gabriel; Entregar en una página del cuaderno, disponible en cualquier momento del lab. Ping manual antes de entregar; el evaluador comprueba ambos sentidos PC↔PC, gateways y tramos entre routers. Diagnosticar primer bloqueo y listar otros errores. No simular ARP perdido ni espera de convergencia; respuesta de ping se valida separadamente. Monitor final con texto/efectos de sonido y autorización de personas declarada por Gabriel; sin voces. Try again reinicia todo; reanudar estado para fase futura. Gabriel valida comandos/redes y semejanza del arte; fluidez se probará en MacBook M5 Pro con Chrome.

La probabilidad correcta de conector mal asentado es **2 % por conexión** (corregida por Gabriel). Routers físicos 1–8 son serie 2900 y 9–12 serie 2800 según Gabriel. Gabriel aclaró después: para el juego 1–8 usan G0/0/G0/1 y 9–12 usan F0/0/F0/1. Es una normalización didáctica de los 2800, no una afirmación de que todos los submodelos 2800 reales usan F. La configuración anterior puede aparecer a veces, pero borrar startup y reiniciar es obligatorio en todos los routers, incluso con prompt `Router>` o startup vacío. Consola permanece en la misma ventana al cambiar cable, aviso de interrupción y Enter para reanudar al router conectado.

**Propuesta de puntuación delegada:** 0–100 repartida en físico 20, IP/gateway 20, RIPv1/rutas 20, ping en ambos sentidos 40; solo estado al entregar. Pendiente revisión de Gabriel, no usar todavía como criterio irrevocable. Quiz no pesa. Cuando todo está bien y el ping vuelve en ambos sentidos, nota 100.


## 20. Correcciones de la conversación del 24 nov 2026

**Prevalecen sobre cualquier párrafo anterior:** probabilidad de no asiento **2 % por conexión**. Borrar configuración guardada y reiniciar los tres routers **siempre**, incluso si parecen vacíos. Quiz: exactamente tres preguntas por intento elegidas de banco configurable de cinco a diez entradas; no fijar cantidad única. Cuaderno y página Entregar solo se habilitan al desbloquear jaula; Entregar permanece accesible entonces en todo momento. Al pulsar Try again se reinicia todo y se sortean nuevos PCs/routers/switch/COM, conservando X/Y originales. No exigir que Gabriel use `show startup-config` para decidir el borrado; ese comando solo consulta la configuración guardada. **Conflicto textual a aclarar:** «los 2800 solo Fast Ethernet» frente a «para nada vamos a usar F». No fijar prefijos de comandos hasta respuesta.


## 21. Aclaración de miniquiz y estado previo a H0

El quiz **siempre muestra tres preguntas** seleccionadas de un banco variable, previsto en torno a **cinco a diez**, pero válido con cualquier número de **tres o más**; no existe obligación de elegir ahora un número único. El banco puede ampliarse sin cambiar la mecánica. El resto de reglas sigue el documento 06. La última expresión verbal «doscientos todo R» no resuelve la contradicción F/G de los routers 2800; mantenerla pendiente para H2/H5 y no fingir una asignación de puertos. El documento `08_ESTADO_Y_PROXIMOS_HITOS.md` mantiene el estado de bloqueos y preguntas por hito.


## 22. Decisiones finales antes de entregar el paquete a Claude Code (24 nov 2026)

**Para el juego:** routers físicos 1–8 serie 2900 con G0/0 y G0/1; 9–12 serie 2800 representados con F0/0 y F0/1. El rol lógico y direccionamiento del PDF se mantiene; la CLI del router elegido usa su prefijo físico. Las parrillas disponibles en Fase 1 se parametrizan con letras **A–J** y tomas **1–24** por letra; Gabriel recuerda ese rango provisional y puede ampliar el catálogo con nuevas letras sin reescribir lógica. Sigue pendiente asignar letra concreta a cada PC físico y validar mapa real de fotos. **Rúbrica 0–100 aprobada:** 20 puntos físico, 20 IP/gateway, 20 RIPv1/rutas y 40 ping bidireccional, sin puntos del quiz ni penalización por ensayo. Arte y capturas de hardware se integran posteriormente; mocks funcionales primero.
