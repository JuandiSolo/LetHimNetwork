# Guía H1 — Jaula, PCs y Terminal con menú de cables compartido

Para Gabriel · basada en el zip `LetHimNetwork-main` y en tus 3 dibujos · prueba de concepto, sin arte.

## 1. Qué está mal hoy (diagnóstico del código)

Todo lo que describes sale de estas causas concretas:

1. **Hay dos juegos Phaser distintos.** `PhaserGame.tsx` crea uno (jaula) y `PcCableView` dentro de `App.tsx` crea otro (PCs). Cada uno tiene su propio `selectedCableType` (en un `useState` de React y otra copia dentro de la escena). Por eso el cable elegido no persiste al cambiar de vista.
2. **El menú de cables está duplicado.** Uno en `PhaserGame.tsx` (3 botones), otro en `App.tsx` (solo 2, sin cruzado) y otro dibujado dentro de Phaser (`renderCableTypeSelector`, `renderCableTypeIndicator`).
3. **La lógica de conectar cables está copiada dos veces** (`startCable`, `tryCompleteCable`, `validateCableType`, `canConnectPortType`, `renderCables`, `removeCable` existen en `CageScene.ts` y en `PCCableScene.ts`).
4. **Sobran fases.** `DESKTOP` (pantalla React con una «PC de mentira»), `PC_CABLES` y `PC_TERMINAL` mezclan «dónde estoy» con «en qué fase del juego estoy». Al salir de la terminal el código llama `setActiveTerminalPC(null)`, así que se pierde qué PC estabas usando.
5. **La letra de parrilla no coincide entre vistas.** `CageScene` calcula la letra real desde `patchTerminations` (puede ser A–H según el sorteo), pero `PCCableScene` la tiene fija: PC-1 = `A`, PC-2 = `B`. Resultado: la misma parrilla `PP-1` tiene tomas `E1…E24` en la jaula y `A1…A8` en la vista de PC. Así un cable nunca puede «persistir» entre vistas.
6. **El inventario no se hace cumplir.** Solo `ToolsView` (fase TOOLS) cuenta cables; el reducer `ADD_CABLE` nunca revisa cuántos quedan.
7. **La terminal comparte historial entre PC-1 y PC-2** (un solo `useState` para ambos) y el componente está siempre montado.
8. **Callbacks inyectados a mano en la escena** (`sceneRef.current.onPortClick = ...`) y canvas escondidos con `display: none` mientras Phaser está en modo `RESIZE`. Es frágil (ya vieron `onPortClick is not a function`).

## 2. Diseño objetivo

### 2.1 Estado: «dónde estoy» vive en el store, no en las fases

La fase del juego sigue siendo `LAB` durante toda la jaula, los PCs y la terminal. Dentro de `LAB` hay tres campos nuevos:

| Campo | Valores | Para qué |
| --- | --- | --- |
| `labView` | `'CAGE'` · `'PC'` · `'TERMINAL'` | Qué pantalla se ve |
| `activePc` | `'PC-1'` · `'PC-2'` | Último PC visitado. **Nunca se pone en null**, así «Ir a PCs» vuelve al PC correcto |
| `selectedCable` | `'straight'` · `'crossover'` · `'usbEthernet'` | Cable elegido. Una sola copia para jaula y PCs |

El inventario no se guarda: **se calcula** (`CABLE_INVENTORY_T1` menos los cables del store). Quitar un cable lo devuelve solo.

### 2.2 Flujo (igual a tus dibujos)

```
JAULA ──[Ir a PCs (PC n)]──► PC n ──clic en pantalla──► TERMINAL n
  ▲                          │  ▲                          │
  └──────[← Jaula]───────────┘  └────────[Salir]───────────┘
                PC 1 ⇄ PC 2 con las pestañas de arriba
```

- **Jaula** y **PC**: barra superior con navegación + menú de cables (el mismo componente React).
- **Terminal**: se quita la barra de cables; aparece el panel IP (izquierda), «Terminal PC n» (derecha) y el botón **Salir**.

### 2.3 Arquitectura

- **Un solo `Phaser.Game`** con dos escenas (`CageScene`, `PcScene`) que heredan de una `BaseLabScene` con toda la lógica de cables **una sola vez**.
- **Las escenas leen el store directamente** (`gameStore.getState()` y `gameStore.subscribe`). Se eliminan `updateData`, `onCableAdd`, `onPortClick`, etc.
- **Las reglas de cable van al core** (`core/cables.ts`), puras y con tests. Las escenas solo dibujan y preguntan.
- **El menú de cables y la navegación son React** (`LabShell.tsx`), fuera del canvas.
- **La terminal es un componente React** que se monta solo cuando `labView === 'TERMINAL'`.
- **`<PhaserGame />` solo se monta mientras `phase === 'LAB'`.** Como el estado vive en el store, al remontar todo se redibuja igual. Así no hay canvas escondido con tamaño 0.

## 3. Pasos de implementación (en este orden, un commit por paso)

**Paso 0 — Línea base.** `git checkout -b h1-refactor`, `npm test` y `npm run build` en verde. Antes de cambiar nada: `grep -rn "DESKTOP\|PC_CABLES\|PC_TERMINAL\|activeTerminalPC\|setActiveTerminalPC" src` para tener la lista de lo que hay que tocar.

### Paso 1 — Core: tipos y reducer

`src/core/types.ts`:

```ts
export type PcId = 'PC-1' | 'PC-2';
export type LabView = 'CAGE' | 'PC' | 'TERMINAL';

// GamePhase: quitar 'DESKTOP' | 'PC_CABLES' | 'PC_TERMINAL'
export type GamePhase = 'HOME' | 'SELECT_TOPOLOGY' | 'QUIZ' | 'TOOLS' | 'LAB' | 'REVIEW' | 'FEEDBACK';

// ActionType: quitar SET_ACTIVE_TERMINAL_PC y agregar
//   OPEN_CAGE, OPEN_PC, OPEN_TERMINAL, SELECT_CABLE

// GameState: quitar activeTerminalPC y agregar
  labView: LabView;
  activePc: PcId;
  selectedCable: CableType;
```

`src/core/reducer.ts`: en `initialState` agrega `labView: 'CAGE', activePc: 'PC-1', selectedCable: 'straight'`. En `START_GAME` ponlos también explícitos (ese caso hace `...state`, no reinicia). Casos nuevos (la navegación no hace falta registrarla en `actions[]`):

```ts
case ActionType.OPEN_CAGE:
  return { ...state, labView: 'CAGE' };

case ActionType.OPEN_PC: {
  const { pcId } = action.payload as { pcId: PcId };
  return { ...state, labView: 'PC', activePc: pcId };
}

case ActionType.OPEN_TERMINAL:
  return { ...state, labView: 'TERMINAL' }; // usa activePc, no recibe nada

case ActionType.SELECT_CABLE: {
  const { cableType } = action.payload as { cableType: CableType };
  return { ...state, selectedCable: cableType };
}
```

En `ADD_CABLE`, antes de agregar, rechaza si no quedan: `if (remainingCables(state.cables)[cable.type] <= 0) return state;`

Agrega los action creators (`openCage`, `openPc(pcId)`, `openTerminal`, `selectCable(type)`) siguiendo el patrón de los existentes.

`src/app/store.ts`, dentro de `dispatch`:

```ts
openCage: () => gameStore.dispatch(actions.openCage()),
openPc: (pcId: PcId) => gameStore.dispatch(actions.openPc(pcId)),
openTerminal: () => gameStore.dispatch(actions.openTerminal()),
selectCable: (t: CableType) => gameStore.dispatch(actions.selectCable(t)),
// borrar setActiveTerminalPC
```

### Paso 2 — Core: reglas de cable en un solo lugar

Crea `src/core/cables.ts`. Es la única fuente de verdad de «qué se puede conectar con qué», y reemplaza `validateCableType` + `canConnectPortType` de las dos escenas. Reglas de H1 (las mismas 9 combinaciones que ya validaste en ESTADO.md, ahora centralizadas):

```ts
import type { Cable, CableType } from './types';
import { CABLE_INVENTORY_T1 } from './scenario';

export type DeviceKind = 'pc' | 'switch' | 'router' | 'patch';
export interface PortRef { deviceId: string; portName: string } // deviceId = rol lógico: PC-1, PP-1, SW, R1

export function kindOf(role: string): DeviceKind {
  if (role.startsWith('PC-')) return 'pc';
  if (role.startsWith('PP-')) return 'patch';
  if (role === 'SW') return 'switch';
  return 'router'; // R1, R2, R3
}

export function remainingCables(cables: Cable[]): Record<CableType, number> {
  const r: Record<CableType, number> = { ...CABLE_INVENTORY_T1 };
  for (const c of cables) r[c.type] -= 1;
  return r;
}

export type Check = { ok: true } | { ok: false; reason: string };
const OK: Check = { ok: true };
const no = (reason: string): Check => ({ ok: false, reason });

export function checkConnection(type: CableType, a: PortRef, b: PortRef): Check {
  if (a.deviceId === b.deviceId) return no('Mismo equipo');
  const ka = kindOf(a.deviceId), kb = kindOf(b.deviceId);
  const pair = (x: DeviceKind, y: DeviceKind) => (ka === x && kb === y) || (ka === y && kb === x);
  const isUsb = (p: PortRef) => p.portName === 'USB';
  const isConsole = (p: PortRef) => p.portName === 'Console';

  if (type === 'usbEthernet') {
    return pair('pc', 'patch') && (isUsb(a) || isUsb(b)) ? OK : no('USB-Eth: solo PC.USB ↔ parrilla');
  }
  if (isUsb(a) || isUsb(b)) return no('El USB solo acepta el adaptador USB-Eth');

  if (type === 'crossover') {
    return pair('router', 'router') && !isConsole(a) && !isConsole(b)
      ? OK : no('Cruzado: solo router ↔ router');
  }
  // straight
  if (isConsole(a) || isConsole(b)) {
    return pair('router', 'patch') ? OK : no('Consola: solo parrilla ↔ router');
  }
  if (pair('pc', 'patch') || pair('patch', 'switch') || pair('patch', 'router') || pair('switch', 'router')) return OK;
  return no('Directo: solo entre equipos de distinto tipo');
}
```

Agrega `export * from './cables'` en `core/index.ts`.

**Letra de parrilla única.** En `core/scenario.ts` agrega y usa en **ambas** escenas:

```ts
export function panelLetterOf(pc: 'PC-1' | 'PC-2', pa: PhysicalAssignment): string {
  const physical = pa.pcRoles[pc]; // 'PC 5'
  return PHYSICAL_PC_POOL.find(p => p.id === physical)!.patchPanelLetter;
}
```

La parrilla `PP-1` (de PC-1) y `PP-2` (de PC-2) son **el mismo dispositivo lógico** en jaula y en PC: la toma `E5` de la vista PC es la toma `E5` de la jaula.

**Tests** (`tests/cables.test.ts`), mínimo:

- Directo `PC-1.NIC ↔ PP-1.E1` ok; directo `PC-1.USB ↔ PP-1.E5` rechazado.
- USB-Eth `PC-1.USB ↔ PP-1.E5` ok; USB-Eth `PC-1.NIC ↔ PP-1.E1` rechazado.
- Cruzado `R1.G0/1 ↔ R3.G0/0` ok; cruzado `SW ↔ R1` rechazado; directo `R1 ↔ R2` rechazado.
- Directo `PP-1.E5 ↔ R2.Console` ok.
- `ADD_CABLE` rechaza el cable 3 de tipo cruzado (solo hay 2).
- `SELECT_CABLE('crossover')` → `OPEN_PC('PC-2')` → `OPEN_CAGE` → el estado conserva `selectedCable === 'crossover'` y `activePc === 'PC-2'`.
- `RESET_GAME` vuelve a `labView: 'CAGE'`, `selectedCable: 'straight'`.

`npm test` debe pasar antes de seguir.

### Paso 3 — React: `LabShell.tsx` (navegación + menú de cables + terminal)

Crea `src/ui/LabShell.tsx`. Reemplaza `PhaserGame` (como pieza suelta), `DesktopView`, `PcCableView` y `PcTerminalView` dentro de `App.tsx`. Estructura:

```tsx
import { useEffect, useState } from 'react';
import { useGameStore, useCables, dispatch } from '@app/store';
import { remainingCables } from '@core/cables';
import type { CableType, PcId } from '@core/types';
import { PhaserGame } from './PhaserGame';
import { PcTerminalView } from './PcTerminalView';

const CABLES: { type: CableType; label: string; key: string }[] = [
  { type: 'straight', label: 'Directo', key: '1' },
  { type: 'crossover', label: 'Cruzado', key: '2' },
  { type: 'usbEthernet', label: 'USB-Eth', key: '3' },
];

export function LabShell() {
  const phase = useGameStore(s => s.phase);
  const view = useGameStore(s => s.labView);
  const activePc = useGameStore(s => s.activePc);
  const selected = useGameStore(s => s.selectedCable);
  const cables = useCables();
  // historial de terminal por PC (H2 lo moverá al store)
  const [lines, setLines] = useState<Record<PcId, string[]>>({ 'PC-1': [], 'PC-2': [] });

  // Atajos 1/2/3 (se quitan de Phaser)
  useEffect(() => {
    if (phase !== 'LAB' || view === 'TERMINAL') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      const c = CABLES.find(c => c.key === e.key);
      if (c) dispatch.selectCable(c.type);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, view]);

  if (phase !== 'LAB') return null;
  const left = remainingCables(cables);

  return (
    <div className='lab-shell'>
      {view !== 'TERMINAL' && (
        <div className='lab-bar'>
          {/* Navegación */}
          {view === 'CAGE' ? (
            <button onClick={() => dispatch.openPc(activePc)}>Ir a PCs ({activePc}) →</button>
          ) : (
            <>
              <button onClick={dispatch.openCage}>← Jaula</button>
              {(['PC-1', 'PC-2'] as PcId[]).map(id => (
                <button key={id} className={id === activePc ? 'active' : ''}
                        onClick={() => dispatch.openPc(id)}>{id.replace('-', ' ')}</button>
              ))}
            </>
          )}
          <span className='lab-spacer' />
          {/* Menú de cables: el MISMO en jaula y PC */}
          {CABLES.map(c => (
            <button key={c.type} className={selected === c.type ? 'active' : ''}
                    disabled={left[c.type] <= 0}
                    onClick={() => dispatch.selectCable(c.type)}>
              {c.label} ({c.key}) {left[c.type]}
            </button>
          ))}
        </div>
      )}
      <div className='lab-canvas'><PhaserGame /></div>
      {view === 'TERMINAL' && (
        <PcTerminalView lines={lines} setLines={setLines} />
      )}
    </div>
  );
}
```

CSS en `styles.css` (feo y suficiente):

```css
.lab-shell { position: fixed; inset: 0; display: flex; flex-direction: column; }
.lab-bar { height: 56px; display: flex; gap: 8px; align-items: center; padding: 0 12px;
           background: #16213e; border-bottom: 1px solid #2a2a4a; }
.lab-bar button { padding: 8px 14px; font-family: monospace; border: 2px solid #3a3a5a;
                  background: transparent; color: #eaeaea; cursor: pointer; }
.lab-bar button.active { border-color: #00d9a5; background: rgba(0,217,165,.2); color: #00d9a5; }
.lab-bar button:disabled { opacity: .4; cursor: not-allowed; }
.lab-spacer { flex: 1; }
.lab-canvas { flex: 1; min-height: 0; position: relative; }
.terminal-overlay { position: absolute; inset: 0; background: #0f0f1a; z-index: 20; }
```

### Paso 4 — `PhaserGame.tsx` simplificado

Borra todo su contenido (callbacks, selector de cables, botón «Ir a escritorio») y deja esto:

```tsx
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { CageScene } from '@game/CageScene';
import { PcScene } from '@game/PcScene';
import { useGameStore } from '@app/store';

export function PhaserGame() {
  const boxRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const readyRef = useRef(false);
  const view = useGameStore(s => s.labView);

  const syncScene = (v: string) => {
    const g = gameRef.current;
    if (!g || v === 'TERMINAL') return; // la terminal es un overlay React: no se toca Phaser
    const want = v === 'CAGE' ? 'CageScene' : 'PcScene';
    const other = v === 'CAGE' ? 'PcScene' : 'CageScene';
    g.scene.stop(other);
    if (!g.scene.isActive(want)) g.scene.start(want);
  };

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: boxRef.current!,
      width: '100%', height: '100%',
      backgroundColor: '#1a1a2e',
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [CageScene, PcScene],
      render: { antialias: false, pixelArt: true },
    } as any);
    gameRef.current = game;
    game.events.once('ready', () => {
      readyRef.current = true;
      syncScene(useGameStore.getState?.().labView ?? 'CAGE');
    });
    return () => { game.destroy(true); gameRef.current = null; readyRef.current = false; };
  }, []);

  useEffect(() => { if (readyRef.current) syncScene(view); }, [view]);

  return <div ref={boxRef} style={{ width: '100%', height: '100%' }} />;
}
```

Notas: (a) `useGameStore` no expone `getState`; usa `import { gameStore } from '@app/store'` y `gameStore.getState().labView` en el `ready`. (b) Verifica que `game.scene.stop/start/isActive` se comportan igual en Phaser 4.2 que en la v3; si no, usa `this.scene.start('PcScene')` desde dentro de la escena. (c) Quita del `main.tsx` cualquier doble montaje que dejes sin cleanup; el `return` de arriba destruye el juego correctamente aunque el efecto corra dos veces.

### Paso 5 — `BaseLabScene.ts`: la lógica de cables, una sola vez

Crea `src/game/BaseLabScene.ts` y **mueve ahí** (copiando de `CageScene.ts`, que es la que ya funciona) todo lo que estaba duplicado. Esqueleto:

```ts
import Phaser from 'phaser';
import { gameStore, dispatch } from '@app/store';
import { checkConnection, remainingCables, kindOf } from '@core/cables';

export interface PortInfo { deviceId: string; portName: string; portType: 'ethernet'|'usb'|'console'|'patch'; x: number; y: number; }

export abstract class BaseLabScene extends Phaser.Scene {
  protected dirty = true;
  protected ports = new Map<string, PortInfo>();      // 'PC-1:NIC' -> info (lo llena buildLayout)
  protected drag: { start: PortInfo; x: number; y: number } | null = null;
  private unsub?: () => void;

  protected get state() { return gameStore.getState(); }
  protected abstract buildLayout(): void;   // dibuja equipos y llama this.addPort(...)

  create() {
    this.unsub = gameStore.subscribe(() => { this.dirty = true; });
    this.scale.on('resize', () => { this.dirty = true; });
    this.events.once('shutdown', () => { this.unsub?.(); this.scale.off('resize'); });
    this.setupInput();    // pointerdown/move/up y clic derecho (una sola vez)
  }

  update() {
    if (!this.dirty) return;
    this.dirty = false;
    this.children.removeAll(true);   // redibujo completo: simple y suficiente
    this.ports.clear();
    this.buildLayout();
    this.drawCables();
  }

  protected addPort(p: PortInfo) { /* guarda en this.ports y dibuja el cuadradito; marca ocupado si hay cable */ }
  protected isOccupied(deviceId: string, portName: string): boolean {
    return this.state.cables.some(c =>
      [c.endA, c.endB].some(e => e && e.deviceId.logicalRole === deviceId && e.portName === portName));
  }
  protected onDown(port: PortInfo) {
    if (this.isOccupied(port.deviceId, port.portName)) return this.flash(port, 'Puerto ocupado');
    if (remainingCables(this.state.cables)[this.state.selectedCable] <= 0) return this.flash(port, 'No quedan cables de este tipo');
    this.drag = { start: port, x: port.x, y: port.y };
  }
  protected onUp(end: PortInfo | null) {
    const d = this.drag; this.drag = null;
    if (!d || !end || end === d.start) return;
    if (this.isOccupied(end.deviceId, end.portName)) return this.flash(end, 'Puerto ocupado');
    const res = checkConnection(this.state.selectedCable, d.start, end);
    if (!res.ok) return this.flash(end, res.reason);
    dispatch.addCable(/* Cable armado como en CageScene.tryCompleteCable, tipo = this.state.selectedCable */);
  }
  // drawCables(): dibuja SOLO cables cuyos dos extremos están en this.ports.
  //   Un cable con un extremo fuera de esta vista no se dibuja, pero su puerto sí se ve ocupado.
  // Clic derecho sobre un cable -> dispatch.removeCable(id)   (igual que hoy en jaula)
  // flash(port, msg): mensaje de error corto en pantalla (ya existe showPortError)
}
```

Reglas importantes:

- **Nada de callbacks inyectados.** La escena llama `dispatch.addCable/removeCable` y lee `gameStore.getState()`.
- **Redibujar por bandera (`dirty`) en `update()`**, no dentro del manejador del clic, para no destruir la zona que está recibiendo el evento.
- **Solo se usa `selectedCable` del store.** Borra de ambas escenas `selectedCableType`, `setCableType`, `renderCableTypeSelector`, `renderCableTypeIndicator` y los atajos `keydown-ONE/TWO/THREE` (los atajos ahora los maneja `LabShell`).
- **No hay `occupiedPorts`/`rebuildOccupiedPorts`**: la ocupación se deriva de `state.cables` en cada redibujo.
- **Los ids de cable**: mantén `cable-${Date.now()}-…` por ahora (la reproducibilidad con semilla es otro hito).

### Paso 6 — `CageScene.ts` y `PcScene.ts`

**CageScene** pasa a `extends BaseLabScene`. Conserva solo: dibujo de la jaula, posiciones de switch / routers / parrillas, zoom y pan de cámara. Elimina todo lo que ahora está en la base. En `renderPatchPanel` usa `panelLetterOf('PC-1' | 'PC-2', pa)` según `PP-1`/`PP-2`. No renderiza PCs (ya es así).

**PcScene** (nueva, reemplaza `PCCableScene.ts`). Muestra solo el `activePc` (`this.state.activePc`). Coordenadas en proporción del tamaño del canvas (según tu dibujo):

```ts
protected buildLayout() {
  const W = this.scale.width, H = this.scale.height;
  const pc = this.state.activePc;                 // 'PC-1' | 'PC-2'
  const pa = this.state.physicalAssignment!;
  const pp = pc === 'PC-1' ? 'PP-1' : 'PP-2';
  const letter = panelLetterOf(pc, pa);

  // 1) Pantalla (cuadrado grande): clic -> terminal
  const screen = { x: W * 0.06, y: H * 0.05, w: W * 0.52, h: H * 0.60 };
  // rectángulo + texto 'PC n — clic en la pantalla para abrir terminal'
  // zona interactiva: on('pointerdown', p => { if (p.leftButtonDown()) dispatch.openTerminal(); })

  // 2) Franja de puertos debajo de la pantalla: NIC (a ~25% del ancho) y USB (a ~65%)
  const strip = { x: screen.x, y: screen.y + screen.h + H * 0.04, w: screen.w, h: H * 0.16 };
  this.addPort({ deviceId: pc, portName: 'NIC', portType: 'ethernet', x: strip.x + strip.w * 0.25, y: strip.y + strip.h / 2 });
  this.addPort({ deviceId: pc, portName: 'USB', portType: 'usb',      x: strip.x + strip.w * 0.65, y: strip.y + strip.h / 2 });

  // 3) Parrilla a la derecha: 24 tomas (6 columnas × 4 filas), nombres `${letter}${i}`
  const panel = { x: W * 0.66, y: H * 0.05, w: W * 0.30, h: H * 0.70 };
  for (let i = 1; i <= 24; i++) {
    // col = (i-1) % 6, row = floor((i-1)/6) -> x,y dentro de panel
    this.addPort({ deviceId: pp, portName: `${letter}${i}`, portType: 'patch', x: /*…*/ 0, y: /*…*/ 0 });
  }
}
```

Importante: la pantalla no se superpone con ninguna zona de puerto (los puertos están debajo), así un arrastre de cable nunca abre la terminal sin querer. Al cambiar `activePc` (pestañas PC 1 / PC 2) el store cambia → `dirty` → se redibuja solo.

Borra `PCCableScene.ts` cuando `PcScene` funcione.

### Paso 7 — Terminal (`PcTerminalView.tsx`)

Según tu dibujo 3: panel **IP** a la izquierda, **«Terminal PC n»** grande a la derecha, botón **Salir** abajo a la derecha.

- Props: `lines` y `setLines` (el historial por PC viene de `LabShell`, así PC-1 y PC-2 no comparten texto).
- Usa `activePc` del store (`useGameStore(s => s.activePc)`) en lugar de `activeTerminalPC`; ya nunca es null, así que desaparece el `return null` por falta de PC.
- Raíz: `<div className='terminal-overlay'>…</div>` (cubre el canvas; el canvas sigue vivo debajo).
- Panel IP: IP / máscara / gateway del `pcs.find(p => p.id === activePc)` y puerto COM. Si lo dejas editable, un botón «Guardar» llama `dispatch.setPCConfig(...)` (la acción ya existe).
- **Salir**: `dispatch.openPc(activePc)`. Elimina el botón «← Volver a Cableado» y el `setActiveTerminalPC(null)`.
- Los comandos mock (`ping`, `ipconfig`, `help`, `clear`) se quedan igual. La CLI real es H2.

### Paso 8 — `App.tsx` y limpieza

En `App.tsx`: borra `handlePortClick`, `handleCableDrop`, `PcCableView` y los imports de `Phaser`, `PCCableScene`, `DesktopView`, `PcTerminalView`. En el JSX deja

```tsx
<ToolsView />
<LabShell />
```

en lugar de `PhaserGame`, `DesktopView`, `PcCableView` y `PcTerminalView`. Borra `DesktopView.tsx` y `PCCableScene.ts`. `ToolsView` pasa a `setPhase('LAB')` igual que hoy (no cambia). Borra CSS que ya no se use (`.desktop-*`, `.pc-physical-*`, `.lab-to-desktop-btn`). Corre `npm run build`: el compilador te marcará lo que quede referenciando fases viejas.

## 4. Checklist de aceptación (haz esto a mano en Chrome)

1. Entras a la jaula: barra con «Ir a PCs (PC-1)» y 3 botones de cable con cantidades `7 / 2 / 1`.
2. Eliges **Cruzado** → «Ir a PCs» → en PC 1 **Cruzado sigue seleccionado** y las cantidades son las mismas.
3. En PC 1 eliges **Directo**, arrastras NIC → una toma de la parrilla: se crea el cable y el contador baja a 6.
4. Vas a **Jaula** (← Jaula): el contador sigue en 6, **Directo** sigue seleccionado, y la parrilla de PC 1 tiene las **mismas letras y números de toma** que en la vista PC.
5. En jaula conectas esa toma al switch. Vuelves a PC 1: el cable PC→parrilla sigue ahí, el de parrilla→switch no se dibuja (el otro extremo no está en esta vista), pero la toma se ve ocupada.
6. Clic derecho sobre el cable en PC 1 → desaparece y el contador sube a 7. Si lo quitas en jaula pasa lo mismo.
7. Pestaña **PC 2** → ves la NIC/USB/parrilla de PC 2 libres y ningún cable de PC 1.
8. Estás en PC 2 → **← Jaula** → el botón dice **«Ir a PCs (PC-2)»** → entras directo a PC 2.
9. Clic en la **pantalla** → se quita la barra de cables, aparecen IP + terminal de PC 2. Escribes `help`. **Salir** → vuelves a PC 2.
10. Terminal de PC 1: **no** aparece lo que escribiste en PC 2.
11. Usa los 2 cruzados; el tercer intento muestra «No quedan cables de este tipo» y el botón Cruzado queda deshabilitado.
12. Intentos inválidos (USB-Eth en NIC, cruzado entre switch y router) se rechazan con mensaje.
13. `npm test` y `npm run build` en verde. Actualiza `docs/ESTADO.md` y `docs/DECISIONES.md` con fecha y lo que cambió (fases eliminadas, `labView/activePc/selectedCable`).

## 5. Lo que NO se hace en este refactor

Arte/assets, CLI real, RIP/ping, guardado de partida, aleatoriedad con semilla para `seated` (hoy usa `Math.random()` dentro de la escena; moverlo al reducer con RNG sembrado queda para cuando se haga reproducibilidad, DEC-27), ni cambiar posiciones de equipos de la jaula.

## 6. Preguntas para ti (no bloquean el refactor; indico mi supuesto)

1. **¿Cómo se quita un cable?** Mencionaste «quitas cable x y equis de». Supuesto: se mantiene el clic derecho de hoy. Si quieres un botón X junto al cable o un modo «Quitar», dime.
2. **Cable de tipo incorrecto:** hoy se rechaza al soltar. DEC-07 dice que debería conectarse y dejar el enlace físico caído. Supuesto: seguir rechazando en H1.
3. **Parrilla de PC y de jaula = el mismo dispositivo (`PP-n`)**, donde la toma `E5` de un lado es la `E5` del otro (como en `patchTerminations`). ¿Correcto?
4. **¿Se mantiene la pantalla «Inventario de Cables» (fase TOOLS) tras el quiz?** Supuesto: sí, sin cambios; el menú de cables de la barra ya hace de inventario vivo.
5. **Panel IP en la terminal:** ¿solo lectura (como hoy) o editable con «Guardar»? Supuesto: solo lectura.
6. **Parrilla en vista PC:** en tu dibujo hay unos 16 puntos (4×4); el modelo tiene 24 tomas por letra. Supuesto: 24 (6×4), igual que en la jaula.
