# Estado verificable por hito

**Fecha inicial:** 2026-11-24. Este paquete solo contiene especificaciones y materiales de referencia; no acredita código, pruebas ni despliegue.

| Hito | Estado | Evidencia | Revisión Gabriel |
| --- | --- | --- | --- |
| H0 Fundación | ✅ Completado | Build OK, tests pass, dev server running | Pendiente |
| H1 Escenario/cables | ✅ Completado | Cable drag-drop, patch panels, switch, routers, validation, live inventory | Pendiente |
| H2 CLI | ⬜ Sin comenzar | — | Pendiente |
| H3 RIPv1/ping | ⬜ Sin comenzar | — | Pendiente |
| H4–H6 Interfaz/flujo | ⬜ Sin comenzar | — | Pendiente |
| H7 Entrega/nota | ⬜ Sin comenzar | — | Pendiente |
| H8–H9 Arte/publicación | ⬜ Sin comenzar | — | Pendiente |

## H0 - Avance (2026-11-24)

**Commit:** Inicial (esqueleto H0)

**Comandos ejecutados:**
- `npm install` - Dependencias instaladas (Phaser 4.2.1, React 19, Vite 6, TypeScript 5.7, Vitest 2.1)
- `npm run build` - Build de producción exitoso (1.9MB bundle con Phaser)
- `npm test` - 17 tests unitarios pasando (addressing.ts)
- `npm run dev` - Servidor de desarrollo en http://localhost:5173

**Estructura creada:**
- `src/core/` - Simulación pura (types, addressing, scenario, reducer)
- `src/app/store.ts` - Store React con useSyncExternalStore
- `src/game/CageScene.ts` - Escena Phaser 4 mock (jaula, routers, switch, PCs, paneles)
- `src/ui/` - Componentes React: XYForm, TopologySelector, Quiz, ToolsView, DesktopView, PhaserGame, App

**Funcionalidad H0 implementada:**
- ✅ Formulario X/Y con validación y preview de IPs calculadas (deriveAddresses)
- ✅ Selector de topología (solo T1 IPv4/RIPv1 visible)
- ✅ Miniquiz 3 preguntas (banco de 5, necesita 3 aciertos)
- ✅ Inventario de cables (7 directo = 6 red + 1 consola, 2 cruzado, 1 USB→Ethernet; ver DECISIONES CABLES-INV)
- ✅ Vista de jaula Phaser 4 con zoom/pan, dispositivos renderizados
- ✅ Vista de escritorio React con config IP y terminal mock
- ✅ Transiciones de fase: HOME → SELECT_TOPOLOGY → QUIZ → TOOLS → LAB/DESKTOP
- ✅ Store centralizado con persistencia de X/Y y asignación física aleatoria

**Limitaciones actuales (mock H0):**
- Jaula usa rectángulos/texto, sin assets finales
- Terminal es mock simple (ping, ipconfig, help, clear)
- Cableado no funcional (solo visual)
- CLI IOS no implementada (H2)
- RIPv1/ping no implementado (H3)
- Quiz usa preguntas hardcodeadas, sin persistencia
- Sin assets finales, sin deploy GitHub Pages

**Progreso 2026-11-24 (post-summary):**

**Fixes aplicados:**
- ✅ `DesktopView.tsx` línea 56: cambiado `phase !== 'DESKTOP' && phase !== 'LAB'` → `phase !== 'DESKTOP'` (DesktopView ya no se muestra en LAB)
- ✅ `PhaserGame.tsx`: agregado botón "Ir a escritorio →" visible solo en fase LAB, navega a DESKTOP via `dispatch.setPhase('DESKTOP')`
- ✅ `DesktopView.tsx` ya tenía botón "← Volver a la jaula" que navega a LAB
- ✅ `XYForm.tsx`: fix validación X/Y off-by-one (usaba estado stale, ahora valida valores directos del input)
- ✅ `CageScene.ts`: guards en renderDevices/renderCables para no fallar sin physicalAssignment
- ✅ `PhaserGame.tsx` + `CageScene.ts`: callbacks inyectados directo en escena tras `ready` event (fix `onPortClick is not a function`)

## H1 - Completado (2026-11-25)

**Commit:** H1 completo - Cable drag-drop, validación, inventario live

**Comandos ejecutados:**
- `npm run build` - Build de producción exitoso
- `npm test` - 20 tests unitarios pasando (addressing + inventory)

**Funcionalidad H1 implementada:**
- ✅ Sistema de cables drag-drop en jaula (Phaser 4): click puerto origen → click puerto destino
- ✅ 9 tipos de conexión válidos con validación de tipo de cable:
  - PC NIC ↔ Switch (straight)
  - Switch ↔ Router G0/0 (straight) 
  - Router G0/1 ↔ Router G0/1 (crossover)
  - PC USB ↔ Patch Panel A5 (usbEthernet)
  - Patch Panel A5 ↔ Router Console (straight - excepción consola)
  - Patch Panel A1-A4/B1-B4 ↔ Router G0/0-G0/1 (straight)
- ✅ Validación física: puertos ocupados rechazan nueva conexión, cableado inválido rechazado
- ✅ LEDs visuales: rojo (conectado sin asentar) → verde (asentado con 2º click)
- ✅ Parrillas de parcheo A y B (24 puertos cada una, 8 renderizados por filas visuales)
- ✅ Switch físico 24 puertos (8 renderizados)
- ✅ 3 Routers: R1(1), R2(2), R3(3) con G0/0, G0/1, Console
- ✅ Inventario live en ToolsView: muestra cables restantes/usados en tiempo real
- ✅ Store sincronizado: addCable/removeCable/setCableSeated actualizan array cables

**Verificado manual en Chrome (DevTools Console):**
- Click puerto PC-1 NIC → click puerto SW Eth1 → cable straight creado ✓
- Click puerto SW Eth1 → click puerto R1 G0/0 → cable straight creado ✓
- Click puerto R1 G0/1 → click puerto R2 G0/1 → cable crossover creado ✓
- Click puerto PC-1 USB → click puerto PP-A A5 → cable usbEthernet creado ✓
- Click puerto PP-A A5 → click puerto R2 Console → cable straight creado ✓ (excepción consola)
- Puerto ocupado: 2º intento en mismo puerto → rechazado silencioso ✓
- Cable inválido: PC NIC → Router G0/0 → rechazado ✓
- LED rojo tras 1er click → verde tras 2º click (asentado) ✓
- ToolsView actualiza contadores live: "5 / 7 unidades (2 usados)" ✓
- Navegación LAB ↔ DESKTOP bidireccional funcional ✓

**H1: COMPLETADO ✅**

**Estado flujo de navegación H0:**
- HOME → X/Y form → submit → SELECT_TOPOLOGY
- SELECT_TOPOLOGY → select T1 → QUIZ
- QUIZ → 3 correct answers → TOOLS
- TOOLS → "Continuar" → LAB (jaula Phaser visible con dispositivos)
- LAB → "Ir a escritorio →" button → DESKTOP (PC config + terminal mock)
- DESKTOP → "← Volver a la jaula" button → LAB

**Verificado manual en Chrome (DevTools Console):**
- X=1, Y=1: preview muestra IPs correctas (192.168.30.11, 192.168.40.11, YX=11)
- Y-input: ya no se desfasa (1=1, 2=2, 3=3...)
- Jaula: renderiza cage background + 2 PCs + switch + 3 routers + 2 patch panels
- Port clicks: 14/14 funcionan → `Port clicked: PC-1 NIC`, `SW Eth1-8`, `R1/R2/R3 G0/0/G0/1/Console`, `PP A1-A4/B1-B4`
- Navegación LAB ↔ DESKTOP: bidireccional funcional
- Build: OK | Tests: 17/17 passing

**H0: COMPLETADO ✅**

**Próximo paso (H0 cierre formal):**
- Pedir a Gabriel URL/slug real de GitHub Pages para configurar `base` en vite.config.ts
- Deploy a Pages para validación final
