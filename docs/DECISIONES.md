# Registro de decisiones del proyecto

Las decisiones de Gabriel están desarrolladas en `specs/01_DECISIONES_PARA_GABRIEL.md` y en la spec maestra. Este registro del repositorio se usa **desde H0** para cambios posteriores; no sustituye las specs existentes.

| Fecha | ID | Decisión literal o referencia | Estado | Archivos / prueba afectada |
| --- | --- | --- | --- | --- |
| 2026-11-24 | BASE | Fase 1 T1 IPv4 RIPv1; Phaser 4 + React; GitHub Pages | ✅ | specs maestra, H0 |
| 2026-11-24 | FIS | Un switch compartido; routers 1–8 G, 9–12 F en la simulación; paneles A–J/1–24 ampliables | ✅ | specs 02, 05, 07 |
| 2026-11-24 | GRADO | Físico 20, IP 20, RIP 20, ping 40; quiz 0; nota al Entregar | ✅ | spec 06 |
| 2026-11-24 | CABLES-INV | Inventario T1 según diagramas de Gabriel: red = 6 directos + 2 cruzados (todos ethernet); consola = 1 ethernet directo + 1 USB→Ethernet. Total propuesto: 7 directos, 2 cruzados, 1 USB→Ethernet. **Pendiente confirmar** si el directo de consola es unidad aparte (7 en total) o comparte las 6 de red. | 🟡 | docs/reference/diagrama_conexiones_red.jpeg, diagrama_consola.jpeg, `src/core/scenario.ts`, `src/ui/ToolsView.tsx`, `tests/inventory.test.ts` |
| 2026-11-25 | CABLE-END-DISCONNECT | **Future H4-H6**: Permitir desconectar un solo extremo de cable haciendo click en puerto ya ocupado. Ej: cable PP-A6 ↔ SW-Eth12, click en SW-Eth12 → suelta solo ese extremo, deja PP-A6 libre para reconectar a otro puerto sin borrar cable entero. Requiere UI para "cable colgando" y reconexión. | 📋 Futuro | `src/game/CageScene.ts`, `src/core/types.ts` (Cable.endA/endB optional), store actions |

| 2026-11-26 | CLI-SIM | CLI simulado por botones (no parser texto). Menús contextuales sustituyen D-19, D-25 y regla "única ayuda = cuaderno". | ✅ equipo (pendiente Gabriel) | `docs/specs/09_CLI_SIMULADO_H2.md`, `src/core/cliMenu.ts`, `src/ui/RouterTerminal.tsx` |
| 2026-11-26 | CLI-MENU | Menús por modo/rol (USER/PRIV/CONFIG/CONFIG-IF/CONFIG-ROUTER), máx 5-7 botones, transiciones definidas. | ✅ equipo | `docs/specs/09_CLI_SIMULADO_H2.md` §3, `src/core/cliMenu.ts` |
| 2026-11-26 | CLI-VAL | Solo valores correctos del AddressPlan (sin señuelos): ip address, network, ping usan listas generadas. | ✅ equipo | `docs/specs/09_CLI_SIMULADO_H2.md` §4, `src/core/cliMenu.ts` |
| 2026-11-26 | CLI-PERSIST | Estructura objeto (Record, no Map); running/startup por router; copy/erase/reload semánticos; hostname persiste en startup. | ✅ equipo | `docs/specs/09_CLI_SIMULADO_H2.md` §5, `src/core/types.ts`, `src/core/cli.ts` |
| 2026-11-26 | CLI-PROC | `erase`+`reload` obligatorios pero no bloquean; aviso en monitor al Entregar sin restar puntos. | ✅ equipo | `docs/specs/09_CLI_SIMULADO_H2.md` §9 |
| 2026-11-26 | CLI-CONSOLA | Terminal solo si consoleLink.connectedRouter; sesión independiente por router; mover cable invalida sesión anterior y pide Enter; reconectar reanuda. | ✅ equipo | `docs/specs/09_CLI_SIMULADO_H2.md` §6, `src/core/reducer.ts` |
| 2026-11-26 | CLI-PC | Terminal PC por botones: ipconfig, ping (lista destinos), clear, help. Ping real en H3. | ✅ equipo | `docs/specs/09_CLI_SIMULADO_H2.md` §7, `src/ui/PcTerminalView.tsx` |
| 2026-11-26 | EVAL-MONITOR | Animación ping (ida/vuelta, detección fallo), checklist ✓/✗ por rol router, nota texto + sonido. H7. | ✅ equipo | `docs/specs/09_CLI_SIMULADO_H2.md` §8 |
| 2026-11-26 | TERM-UI | Overlay React DOM (opción A): role="log", botones reales, Tab/Enter, sin WebGL. | ✅ final | `docs/specs/09_CLI_SIMULADO_H2.md` §2, `src/ui/RouterTerminal.tsx` |

Añadir próximas decisiones con fecha y fuente humana. Nunca elevar una sugerencia de Claude a ✅ sin respuesta de Gabriel.
