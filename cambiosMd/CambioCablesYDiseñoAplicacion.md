# Rediseño Sistema de Cables — Click-to-Connect + Estado Compartido (DESK/RACK)

**Fecha:** 2026-11-26  
**Autor:** Claude Code (basado en feedback de Gabriel y análisis del código actual)  
**Estado:** Propuesta — pendiente de aprobación

---

## 1. Problemas Identificados en Implementación Actual

| # | Problema | Causa Raíz |
|---|----------|------------|
| 1 | **Drag lag / cable se queda atrás** | `pointermove` a ~60fps pero `drag.x/y` no sincroniza con render pipeline; preview "fantasma" |
| 2 | **Cable "colgado" al soltar en vacío** | `onUp(null)` no limpia `this.drag` si no hay puerto destino; preview persiste en `drawDragPreview()` |
| 3 | **Ocupación incorrecta entre vistas** | `isOccupied()` usa `logicalRole` + `portName`. Conectar `PP-1:A2 ↔ SW:Eth1` en jaula marca `PP-1:A2` ocupado en PC → **falso positivo**. En realidad es el **mismo cable visto desde otro lado**. |
| 4 | **Sin feedback visual de "conectado al otro lado"** | No hay estado que distinga "puerto usado AQUÍ" vs "puerto usado EN OTRA VISTA". |
| 5 | **Reconstrucción completa por frame** | `update()` destruye todos los hijos salvo 3 `Graphics`, vacía puertos, ejecuta `buildLayout()` y `drawCables()` en cada frame con `drag` activo. `CageScene.buildLayout()` reconstruye fondo y decenas de textos/zonas. |

---

## 2. Análisis de Arquitectura: Dos Caras Físicas por Toma (DESK/RACK)

**Hallazgo clave del código actual y specs:** Un jack `PP-1:A2` representa **dos terminaciones externas** (DESK y RACK) unidas por un **enlace interno fijo** (no consume inventario, no es cable arrastrable).

```
                    ENLACE INTERNO FIJO (patchTerminations)
    ┌─────────────────────────────────────────────────────────────┐
    │  JAULA (CageScene)              PC VIEW (PcScene)           │
    │  ─────────────────              ─────────────────           │
    │  PP-1 (parrilla rack)    ←──→   PP-1 (parrilla escritorio)  │
    │    A1..A24 (cara RACK)           A1..A24 (cara DESK)        │
    └─────────────────────────────────────────────────────────────┘
```

**Regla física (spec FIS-02 a FIS-05, FIS-Q4, §9):**
- Cada terminación (cara) admite **máximo un cable externo**
- Pueden coexistir **un cable en cara DESK** + **un cable en cara RACK** simultáneamente
- El enlace interno no consume inventario de cables

**Ejemplo flujo completo PC→SW:**
1. **Jaula**: Conectar `PP-1:A2(RACK) ↔ SW:Eth1` (cable straight, visible en jaula)
2. **PC**: Conectar `PC-1:NIC ↔ PP-1:A2(DESK)` (cable straight, visible en PC)
3. Resultado: Jack `A2` muestra **ambos lados conectados** — cada cable se dibuja solo en su vista

---

## 3. Modelo de Datos Propuesto

### 3.1 Extender `PortId` con Cara Física (solo Patch Panels)

```typescript
// core/types.ts
type PatchFace = 'DESK' | 'RACK';

interface PortId {
  deviceId: DeviceId;
  portName: string;
  face?: PatchFace; // obligatorio para PP-*, ausente en PC/SW/R
}
```

**Identidad estable para ocupación:**
- **Patch Panel**: `(logicalRole, portName, face)` — p.ej. `('PP-1', 'A2', 'RACK')`
- **Otros equipos** (PC, SW, Router): `(logicalRole, portName)` — p.ej. `('PC-1', 'NIC')`
- `physicalLabel` es **solo presentación**, no decide identidad

### 3.2 `Cable` sin `visibleIn` (derivable de terminaciones)

```typescript
// core/types.ts - Cable SIN visibleIn
interface Cable {
  id: string;
  type: CableType;
  endA: PortId;  // con face si es PP
  endB: PortId;  // con face si es PP
  color: string;
  seated: boolean;
}
```

**Vista de un cable = derivada de sus dos terminaciones:**
| Terminación | Vista |
|-------------|-------|
| `PC-*`, `PP-* (DESK)` | `pc` |
| `SW`, `R1/R2/R3`, `PP-* (RACK)` | `cage` |

**Regla:** Rechazar conexiones entre vistas en validación (`checkConnection`). Un cable **siempre** tiene ambos extremos en la misma vista. Si en hitos posteriores aparecen cables entre vistas, diseñar su representación entonces.

### 3.3 Estado Visual de Jack: `JackStatus` (dos caras independientes)

```typescript
// core/cables.ts
type JackStatus = {
  here: null | { cableId: string; otherEnd: PortId; seated: boolean };
  opposite: null | { cableId: string; otherEnd: PortId; seated: boolean };
};
```

**Combinaciones posibles:**
| here | opposite | Significado |
|------|----------|-------------|
| null | null | Libre en ambas caras |
| occupied | null | Ocupado solo en esta vista |
| null | occupied | Ocupado solo en otra vista (ilumina, no bloquea) |
| occupied | occupied | Ambas caras ocupadas (completado tramo lógico) |

**Solo `here` impide otra inserción en esta vista.** Iluminar y describir la otra cara aunque `here` ya esté ocupada.

---

## 4. Validación Unificada: `core/cables.ts` como Single Source of Truth

### Funciones centrales (reemplazan `isOccupied` disperso):

```typescript
// core/cables.ts

// Clave única por terminación
export function portKey(port: PortId): string {
  const face = port.face ? `:${port.face}` : '';
  return `${port.deviceId.logicalRole}:${port.portName}${face}`;
}

// ¿Misma terminación física?
export function sameTermination(a: PortId, b: PortId): boolean {
  return portKey(a) === portKey(b);
}

// Estado completo de un jack visible (para UI)
export function getJackStatus(cables: Cable[], port: PortId, currentView: 'cage' | 'pc'): JackStatus {
  const here = cables.find(c => 
    (sameTermination(c.endA, port) || sameTermination(c.endB, port)) &&
    viewOfCable(c) === currentView
  );
  const opposite = cables.find(c => 
    (sameTermination(c.endA, port) || sameTermination(c.endB, port)) &&
    viewOfCable(c) !== currentView
  );
  return {
    here: here ? { cableId: here.id, otherEnd: sameTermination(here.endA, port) ? here.endB : here.endA, seated: here.seated } : null,
    opposite: opposite ? { cableId: opposite.id, otherEnd: sameTermination(opposite.endA, port) ? opposite.endB : opposite.endA, seated: opposite.seated } : null,
  };
}

// ¿Puede conectar este cable en este puerto (cara)?
export function canConnect(cables: Cable[], newCable: { type: CableType; endA: PortId; endB: PortId }, currentView: 'cage' | 'pc'): { ok: true } | { ok: false; reason: string } {
  // 1. Validación de tipo (checkConnection existente)
  const typeCheck = checkConnection(newCable.type, newCable.endA, newCable.endB);
  if (!typeCheck.ok) return typeCheck;

  // 2. Mismo extremo (misma cara)
  if (sameTermination(newCable.endA, newCable.endB)) return { ok: false, reason: 'Mismo puerto' };

  // 3. Ocupación por cara (solo here bloquea)
  for (const end of [newCable.endA, newCable.endB]) {
    const status = getJackStatus(cables, end, currentView);
    if (status.here) return { ok: false, reason: `Puerto ocupado por ${status.here.cableId}` };
  }

  // 4. Inventario
  const rem = remainingCables(cables);
  if (rem[newCable.type] <= 0) return { ok: false, reason: `No quedan cables de tipo ${newCable.type}` };

  // 5. Vista consistente (ambos extremos misma vista)
  if (viewOfCable(newCable) !== currentView) return { ok: false, reason: 'Conexión entre vistas no permitida' };

  return { ok: true };
}

function viewOfCable(cable: { endA: PortId; endB: PortId }): 'cage' | 'pc' {
  const vA = viewOfPort(cable.endA);
  const vB = viewOfPort(cable.endB);
  if (vA !== vB) throw new Error('Cable entre vistas inválido');
  return vA;
}

function viewOfPort(port: PortId): 'cage' | 'pc' {
  const role = port.deviceId.logicalRole;
  if (role.startsWith('PC-')) return 'pc';
  if (role.startsWith('PP-')) return port.face === 'DESK' ? 'pc' : 'cage';
  return 'cage'; // SW, R1, R2, R3
}
```

**Reducer usa las MISMAS funciones** — no duplica lógica.

---

## 5. Interacción: Click-to-Connect (Dos Clicks)

### Flujo Principal

1. **Click 1** en puerto origen → entra en "modo conexión", puerto resaltado (halo pulsante), muestra destinos compatibles con contorno
2. **Click 2** en puerto destino válido → valida con `canConnect` + crea cable + sale del modo
3. **Cancelación**: Click en vacío / ESC / mismo puerto / cambio de vista/PC / cambio de fase / redimensionamiento → cancela selección sin cable residual

### Ventajas
- ✅ Sin drag lag, sin cable colgado, sin preview que sigue al cursor
- ✅ Accesible (teclado: Escape, futuro Tab+Enter con controles DOM)
- ✅ Funciona en móvil/tablet (hitbox adecuado)
- ✅ Visual claro: "estoy conectando desde AQUÍ hacia destino compatible"

### Feedback Visual por Estado

| Estado | Visual |
|--------|--------|
| `free` | Círculo tenue color puerto |
| `here` occupied | Círculo lleno + LED verde en medio del cable |
| `opposite` occupied | **Borde grueso cian + texto "🔗 Jaula: A2→SW:Eth1" / "🔗 PC: A2→PC-1:NIC"** — tooltip accesible |
| Origen seleccionado | Halo ampliado + texto "Selecciona el segundo extremo" |
| Destinos compatibles | Contorno punteado cian en puertos válidos para el cable seleccionado |

> **No usar emoji como único indicador**: texto legible + contraste + etiqueta accesible.

---

## 6. Cambios por Archivo

| Archivo | Cambios |
|---------|---------|
| `core/types.ts` | Add `face?: 'DESK' \| 'RACK'` to `PortId`; export `PatchFace`, `JackStatus` |
| `core/cables.ts` | Add `portKey`, `sameTermination`, `getJackStatus`, `canConnect`, `viewOfPort`, `viewOfCable`; keep `checkConnection`, `remainingCables`, `kindOf`, `panelLetterOf`; **remove duplicate `panelLetterOf`** (keep single in `scenario.ts`) |
| `core/scenario.ts` | Single export of `panelLetterOf`; `generatePatchTerminations` includes `face` for each termination |
| `core/reducer.ts` | Use `core/cables.ts` functions for validation; `ADD_CABLE` validates with `canConnect`; compute `PortId.face` for PP terminations based on view |
| `game/BaseLabScene.ts` | Replace drag logic with `connectionMode: { start: PortInfo } \| null`; single `pointerdown` handler; `drawPorts()` uses `getJackStatus`; `drawConnectionPreview()` shows compatible targets; cleanup on scene shutdown |
| `game/CageScene.ts` | `addPort` for PP uses `face: 'RACK'`; pass `currentView: 'cage'` to status functions |
| `game/PcScene.ts` | `addPort` for PP uses `face: 'DESK'`; pass `currentView: 'pc'` to status functions |
| `ui/LabShell.tsx` | No changes (cable selector unchanged) |
| `tests/cables.test.ts` | Add tests for `getJackStatus` (both faces), `canConnect` (face occupation, cross-view rejection), `portKey` |

---

## 7. Optimización de Render (Fase 3 del plan)

### Separar Estático vs Dinámico

```typescript
// BaseLabScene.ts
create() {
  this.buildStaticLayout();  // UNA VEZ: fondo, cajas, textos, zonas
  this.setupInput();
  this.renderDynamicState(); // cables, estados de puerto, preview
}

update() {
  // SOLO si hay cambio real en estado dinámico
  if (this.dirtyDynamic) {
    this.dirtyDynamic = false;
    this.cableGraphics?.clear();
    this.dragGraphics?.clear();
    this.portGraphics?.clear();
    this.renderDynamicState();
  }
}

// Marcar dirty solo en cambios de cables, selección, activePc, resize
private onCablesChange() { this.dirtyDynamic = true; }
```

**Eliminar:**
- Destrucción de `children.list` cada frame
- `buildLayout()` llamado en `update()`
- Múltiples fondos (`renderCageBackground` en `create` Y `buildLayout`)

---

## 8. Casos de Aceptación Imprescindibles

| Escenario | Resultado Esperado |
|-----------|-------------------|
| Jaula `PP-1:A2(RACK)↔SW:Eth1` y PC `PC-1:NIC↔PP-1:A2(DESK)` | Se crean dos cables; solo se descuentan dos del inventario; el jack muestra ambos lados; cada cable se dibuja solo en su vista |
| Intentar otro cable en `PP-1:A2(RACK)` | Rechazo con mensaje; el lado DESK no cambia. Repetir con DESK ocupado y RACK libre |
| Desconectar cable del rack (clic derecho) | Se libera RACK y se devuelve uno al inventario; DESK permanece cableado y su indicador de otro lado se actualiza |
| Elegir `A2` en PC y `A3` en jaula | Son jacks diferentes; ningún enlace interno cruzado |
| Consola `PC:USB→PP:A5(DESK)` y `PP:A5(RACK)→R:Console` | Dos tramos compatibles; sin atribuirles conectividad IP; conservar inventario/LED y claridad de estado |
| Clic inicio, clic vacío, Escape, mismo puerto, cambio PC/vista, redimensionar | Selección y preview cancelados sin cable ni objeto residual; no se pierden cables anteriores |
| Pan/zoom, clic en puerto y borrado | La zona corresponde a la posición visible; pan por clic derecho no borra cables |
| 20 ciclos de conexión/cancelación y navegación | No crece el número de textos/zonas/listeners ni se redibuja todo el layout en cada frame |

---

## 9. Decisiones Pendientes para Gabriel (fuera de este arreglo)

1. **Asiento aleatorio 2%**: Código usa `Math.random() > 0.02` pero spec §10 dice "no crear probabilidad por defecto". Decidir si se retira o cuál es la regla aprobada. No bloquea ocupación/render.

2. **Catálogo PCs A-J**: `PHYSICAL_PC_POOL` asigna solo A–H; spec define A–J ampliable. Definir si habrá PCs/puestos I/J en esta fase y su mapa real. Render muestra 24 tomas por panel pero `patchTerminations` solo crea 4 enlaces por PC.

3. **Nomenclatura USB-Ethernet**: Etiqueta y texto ToolsView dicen "adaptador USB a Ethernet" pero spec reserva ese cable a consola serial. Definir nomenclatura visual cuando se confirme modelo físico. Distinción semántica consola/red debe mantenerse.

---

## 10. Plan de Trabajo para Implementación

### Fase 0 — Reproducir y Medir (actual)
- Verificar rama y git status
- Leer `CLAUDE.md`, `docs/DECISIONES.md`, `docs/ESTADO.md`, spec física §2, §8–10 y tests
- Ejecutar `npm ci`, `npm test`, `npm run build`
- Reproducir en Chrome: conectar PP-1:A2 ↔ SW:Eth1 en jaula, luego PC-1:NIC ↔ PP-1:A2 en PC; soltar arrastre en vacío; pan/zoom y borrar cable
- Registrar: hijos de escena tras 20 conexiones/cancelaciones, duración render, FPS, bundle size

### Fase 1 — Corregir Modelo y Validación
- Añadir cara `DESK|RACK` a terminaciones PP en `PortId`
- `CageScene.addPort` genera `RACK`, `PcScene.addPort` genera `DESK`
- Integrar `sameTermination`, `getJackStatus`, `canConnect` en `core/cables.ts`
- Validar también en `reducer.ts` (no solo UI)
- Conservar formas de `Cable` e inventario; **no introducir `visibleIn`**
- Probar: cada cara individualmente, combinación ambas caras, duplicados en una cara, inventario, etiquetas de jack distintas, consola y dos paneles

### Fase 2 — Reemplazar Interacción
- Implementar modo dos clics en `BaseLabScene`, cancelación completa, errores visibles, indicador de ambas caras
- Mantener clic derecho de borrado y navegación (zoom/pan)
- Conservar desenlace `seated` y LED tal como opera hoy (documentar contradicción §10)

### Fase 3 — Render Sin Reconstrucciones Por Frame
- Separar `buildStaticLayout` y `renderDynamicState`
- Conservar objetos visuales y zonas entre cambios
- Renovar solo parte dinámica al actualizar cables, selector o jack
- Confirmar limpieza de handlers al shutdown/restart
- Medir nuevamente con mismo escenario

### Fase 4 — Cerrar
- Ejecutar tests y build
- Prueba manual flujo completo cableado LAN y consola incluyendo reconexión
- Revisión Chrome de zoom/pan/clic/tacto si disponible
- Actualizar `docs/ESTADO.md` y `docs/DECISIONES.md` con observaciones reales
- Entregar diff, comandos, resultados, cifras antes/después, limitaciones, decisiones pendientes

---

## 11. Referencias

- `docs/specs/01_ESCENARIO_Y_CABLES.md` — Reglas de cables H1
- `docs/specs/05_TOPOLOGIA_FISICA_Y_ASSETS_FASE1.md` — FIS-02 a FIS-05, FIS-Q4, §9 (dos caras físicas)
- `docs/DECISIONES.md` — DEC-10 (inventario exacto), DEC-12 (routers 1-8 G0, 9-12 F0)
- `docs/reference/diagrama_conexiones_red.jpeg` — Topología física
- `src/core/cables.ts` — Single source of truth actual
- `src/game/BaseLabScene.ts` — Lógica de drag actual (a reemplazar)