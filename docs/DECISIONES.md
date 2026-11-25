# Registro de decisiones del proyecto

Las decisiones de Gabriel están desarrolladas en `specs/01_DECISIONES_PARA_GABRIEL.md` y en la spec maestra. Este registro del repositorio se usa **desde H0** para cambios posteriores; no sustituye las specs existentes.

| Fecha | ID | Decisión literal o referencia | Estado | Archivos / prueba afectada |
| --- | --- | --- | --- | --- |
| 2026-11-24 | BASE | Fase 1 T1 IPv4 RIPv1; Phaser 4 + React; GitHub Pages | ✅ | specs maestra, H0 |
| 2026-11-24 | FIS | Un switch compartido; routers 1–8 G, 9–12 F en la simulación; paneles A–J/1–24 ampliables | ✅ | specs 02, 05, 07 |
| 2026-11-24 | GRADO | Físico 20, IP 20, RIP 20, ping 40; quiz 0; nota al Entregar | ✅ | spec 06 |
| 2026-11-24 | CABLES-INV | Inventario T1 según diagramas de Gabriel: red = 6 directos + 2 cruzados (todos ethernet); consola = 1 ethernet directo + 1 USB→Ethernet. Total propuesto: 7 directos, 2 cruzados, 1 USB→Ethernet. **Pendiente confirmar** si el directo de consola es unidad aparte (7 en total) o comparte las 6 de red. | 🟡 | docs/reference/diagrama_conexiones_red.jpeg, diagrama_consola.jpeg, `src/core/scenario.ts`, `src/ui/ToolsView.tsx`, `tests/inventory.test.ts` |

Añadir próximas decisiones con fecha y fuente humana. Nunca elevar una sugerencia de Claude a ✅ sin respuesta de Gabriel.
