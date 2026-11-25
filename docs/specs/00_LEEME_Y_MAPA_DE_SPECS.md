# Let Him Network — Mapa de especificaciones y método de cierre

**Estado:** decisiones confirmadas actualizadas 24 nov 2026; dudas abiertas identificadas. **Fuente base:** `Let_Him_Network_Spec_Programacion_Fase_1_COMPLETA.md` (versión vigente). Este paquete concreta preguntas; no añade decisiones aprobadas por silencio.

## 1. Lo ya aprobado

- Phaser 4 + TypeScript + React; versión exacta se verifica y fija en H0.
- Primera entrega: Topología 1, IPv4, **únicamente RIPv1**. RIPv2/OSPF/IPv6/BGP fuera del alcance.
- El jugador ingresa X (sección) e Y (grupo) al inicio, ve sus IP calculadas y luego en la libreta; X/Y no cambian durante la partida. Para corregirlos inicia un laboratorio nuevo.
- Del concepto original: juego web, jaula y cableado, PC, terminal de router, miniquiz, nota y recorrido del ping; tutorial y otras topologías bloqueados en Fase 1. Las decisiones finas de estas funciones siguen abiertas.

- GitHub Pages, Chrome de escritorio primero; toda la ventana del navegador, mocks básicos, sin cuenta ni nombre, sin guardado durante Fase 1. React para escritorio/terminal y Phaser para jaula con transición continua.
- Dos PCs físicos asignados y configurados por separado, tres routers físicos variables con roles R1/R2/R3, un switch físico variable y compartido por ambos PCs; cualquier puerto libre elegible. Parrilla junto al PC enlazada internamente a panel de jaula; cableado externo lo hace el jugador. Las parrillas A–J/1–24 están confirmadas; el mapeo PC físico↔letra y detalles de consola aún requieren evidencia.

## 2. Documentos y jerarquía

| Documento | Especifica | Cuándo se cierra | Criterio verificable |
| --- | --- | --- | --- |
| Spec maestra vigente | Objetivo, decisiones DEC-00…36, arquitectura e hitos H0–H9 | Se revisa después de cada lote | Ningún requisito contradice DEC aprobadas |
| `01_DECISIONES_PARA_GABRIEL.md` | Preguntas con opciones, recomendación, consecuencia, bloqueo | En lotes de 4–7, con firma/fecha | Cada respuesta se registra sin reinterpretarla |
| `02_CONTRATO_DE_RED_RIPV1.md` | Direcciones, capa física, CLI, rutas, ping, diagnósticos | Antes de H2/H3; evidencias de hardware pendientes | Tablas y trazas iguales entre simulador, terminal y feedback |
| `03_FLUJOS_Y_ESTADOS.md` | Vista, escena, persistencia, inventario, consola y reintento | Antes de H4/H5/H6 | Casos de transición y borde con entrada y salida observables |
| `04_ASSETS_Y_PRUEBAS_DE_INTEGRACION.md` | Manifiesto de arte, zonas, puerto, escalas, entrega y QA | Contrato inicial antes de encargar arte; final con fotos | Un placeholder puede sustituirse sin cambiar lógica |
| `05_TOPOLOGIA_FISICA_Y_ASSETS_FASE1.md` | Decisiones físicas confirmadas, fotos observadas, dudas de asignación/parrillas/cable de consola y lista de assets | Antes de H1/H5 | Mock funcional con roles separados; mapa real pendiente |
| `CLAUDE.md` del repo | Instrucciones de implementación, rutas y comandos reales | H0, tras decisiones del lote 1 | Un desarrollador nuevo sabe arrancar, probar y parar |
| `docs/DECISIONES.md` del repo | Registro inmutable de aprobaciones y ADR de tecnología | Actualizar tras cada respuesta | Fecha, cita literal, alcance y archivos afectados |
| `docs/ESTADO.md` del repo | Verificado por usuario, por logs, pendiente | Después de cada hito | Sin “hecho” basado solo en un test que salta la UI |

**Fuente de verdad de la programación:** `scenario.json` para datos de red, `cage-layout.json` para coordenadas físicas, `assets-manifest.json` para arte, catálogo CLI para gramática, `GameState` para partida y `rubric` para nota. Todos quedan versionados. Las capturas/fixtures solo prueban las salidas literales que representan. Si una foto, guía y terminal real discrepan, abrir incidencia de evidencia y pedir decisión. No convertir una recomendación de este paquete en `✅`.

## 3. Cómo cerramos cada lote de decisiones

1. Gabriel responde IDs + opción, y puede escribir una opción nueva. Se anota literalmente su preferencia.
2. Convertir respuesta en regla **dado → cuando → entonces**, señalar error/reversión/reanudación; proponer un caso de prueba.
3. Mostrar la regla resultante y cualquier conflicto con otras respuestas. Gabriel corrige lo que quiera.
4. Marcar el ID ✅ en la spec maestra y documentos dependientes; anotar fecha, razonamiento del dueño si lo ofrece y versiones afectadas.
5. Claude Code recibe tareas del hito con IDs aprobados y fixtures disponibles, implementa una pieza, prueba desde UI real, muestra evidencia y espera revisión de ese hito.

**No requiere preguntarte:** nombres internos de variables, organización de componentes menores, color de un botón provisional o selección de una función auxiliar. **Sí requiere tu decisión:** algo que cambie contenido didáctico, reglas de fallo/nota, forma de jugar, límites de dispositivos, almacenamiento/envío, arte final o arquitectura/hosting.

## 4. Puertas y lista de material

| Puerta | Qué se necesita | Si falta, qué trabajo sigue siendo posible |
| --- | --- | --- |
| A: primer build H0 | GitHub Pages y Chrome confirmados; URL/slug del repo pendiente, esquema de resolución y estructura de proyecto | Prototipo local aislado; no declarar deploy listo |
| B: modelo H1 | Equipos físicos y política de puertos; foto/mapa de parrillas para fidelidad | Red lógica T1 con puertos placeholder |
| C: consola H2 | Modelo/versión IOS, capturas de 20–30 comandos representativos, cable/adaptador real | Parser y configuración semántica; salidas rotuladas como modelo provisional |
| D: motor H3 | Reglas de tiempo RIPv1, matriz de pings, criterio de éxito | Trazas deterministas para X=1,Y=1 y al menos otra pareja válida |
| E: juego H4–H7 | Flujo y reintento, tabla de puntos, quiz, nombres/dialogos | Esqueleto jugable y pruebas del motor sin nota final |
| F: arte H8 | Fotografías autorizadas, correspondencia puerto/asset, manifiesto/licencias | Placeholders; no afirmar «igual a la jaula» |

**No es realista cerrar “todos los bugs” antes del código.** Sí podemos anticipar ramas y escribir tests por transición; dejar cualquier valor medible sin evidencia como parámetro pendiente, no como número inventado.

## 5. Definición de “listo para programar”

Cada tarea de Hn debe tener: requisito + DEC aprobadas + entrada + salida + dos fallos o alternativas + datos/fixture + prueba automatizable + prueba manual + límite explícito. Si falta una DEC que cambie el resultado, se detiene esa tarea y se trabaja otra independiente. Si se puede usar placeholder reversible, se indica cuál es y se deja su aceptación pendiente.

## 6. Orden sugerido de la conversación

Lote 1: entorno y experiencia base (varias respuestas D-01…D-07 ya recibidas; ver cuaderno). Lote 2: topología física/cables (parte de D-08…D-15 confirmada; preguntas FIS-Q1…Q7 en documento 05). Lote 3: consola/PC/RIP (D-16…D-25). Lote 4: evaluación y reintento (D-26…D-32). Lote 5: accesibilidad, arte, privacidad y publicación (D-33…D-41). La numeración D-xx es provisional de este cuaderno; al aprobar, mapearla a DEC-xx existente o nueva sin reutilizar un ID para dos temas.


## 7. Documentos nuevos

- `06_QUIZ_PING_ENTREGA_Y_RUBRICA.md`: miniquiz, ping, monitor, entrega, reintento y propuesta de puntuación delegada.
- `07_MODELOS_CLI_Y_PREPARACION_CLAUDE_CODE.md`: modelos 2900/2800, interfaces F/G, fixtures CLI y evidencias previas a Claude Code.
- `08_ESTADO_Y_PROXIMOS_HITOS.md`: resumen vigente de decisiones, bloqueos por hito y próximo lote de preguntas.


**Última decisión:** juego con routers 1–8 G0/0/G0/1, 9–12 F0/0/F0/1; paneles A–J con 1–24, ampliables; rúbrica 20/20/20/40 aprobada. El paquete preparado para el repositorio incluye `CLAUDE.md`, `docs/ESTADO.md`, `docs/DECISIONES.md` y `docs/H0_TAREA_INICIAL.md`.
