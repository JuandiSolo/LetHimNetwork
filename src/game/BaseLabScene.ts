/**
 * BaseLabScene - Shared logic for CageScene and PcScene.
 * All cable interaction logic lives here, single source of truth.
 * Click-to-connect (two clicks) + per-face port state (DESK/RACK).
 */

import Phaser from 'phaser';
import { gameStore, dispatch } from '@app/store';
import {
  checkConnection,
  remainingCables,
  kindOf,
  canConnect,
  getJackStatus,
  viewOfPort,
  portKey,
  sameTermination
} from '@core/cables';
import { panelLetterOf } from '@core/scenario';
import type { Cable, CableType, PhysicalAssignment, PortId, JackStatus, PatchFace } from '@core/types';

// Phaser 4 type aliases - using any to avoid namespace issues
type PhaserPointer = any;

export interface PortInfo {
  deviceId: string;      // logical role: 'PC-1', 'PP-1', 'SW', 'R1', 'R2', 'R3'
  portName: string;      // 'NIC', 'USB', 'Console', 'G0/0', 'E1', '1'...
  portType: 'ethernet' | 'usb' | 'console' | 'patch';
  x: number;
  y: number;
}

export abstract class BaseLabScene extends Phaser.Scene {
  constructor(key: string) {
    super({ key });
  }

  protected dirty = true;
  protected dirtyDynamic = false; // Solo estado dinámico (cables, selección)
  protected ports = new Map<string, PortInfo>();    // key: 'PP-1:A2:RACK' -> PortInfo
  protected connectionMode: { start: PortInfo } | null = null;
  private unsub?: () => void;
  private cableGraphics?: any;        // Reusable graphics for cables
  private dragGraphics?: any;         // Reusable graphics for preview line (dashed during connectionMode)
  private portGraphics?: any;         // Reusable graphics for port indicators
  private portTexts = new Map<string, any>(); // Port labels + status texts
  protected staticLayoutBuilt = false;

  protected get state() { return gameStore.getState(); }

  protected abstract buildStaticLayout(): void;   // Called ONCE: devices, boxes, texts, zones
  protected abstract getCurrentView(): 'cage' | 'pc'; // 'cage' or 'pc'

  create() {
    this.unsub = gameStore.subscribe(() => { this.dirtyDynamic = true; });
    this.scale.on('resize', () => { this.dirty = true; this.dirtyDynamic = true; });
    this.events.once('shutdown', () => {
      this.unsub?.();
      this.scale.off('resize');
      this.cleanupInput();
    });
    this.setupInput();

    // Create reusable graphics objects ONCE
    this.cableGraphics = this.add.graphics();
    this.cableGraphics.setDepth(5); // Above devices
    this.dragGraphics = this.add.graphics();
    this.dragGraphics.setDepth(10); // Above cables
    this.portGraphics = this.add.graphics();
    this.portGraphics.setDepth(1); // Above device boxes

    // Build static layout once
    this.buildStaticLayout();
    this.staticLayoutBuilt = true;

    // Initial dynamic render
    this.renderDynamicState();
  }

  update() {
    // Rebuild static layout if needed (e.g., activePc changed in PcScene)
    if (this.dirty) {
      this.dirty = false;
      this.staticLayoutBuilt = false;
      this.ports.clear();
      this.portTexts.forEach(t => t.destroy());
      this.portTexts.clear();
      // Destroy all children except reusable graphics
      const toDestroy = this.children.list.filter((child: any) =>
        child !== this.cableGraphics && child !== this.dragGraphics && child !== this.portGraphics
      );
      toDestroy.forEach((child: any) => child.destroy());
      this.buildStaticLayout();
      this.staticLayoutBuilt = true;
      this.dirtyDynamic = true; // Also render dynamic state after rebuild
    }

    if (!this.dirtyDynamic && !this.connectionMode) return;
    this.dirtyDynamic = false;
    this.renderDynamicState();
  }

  // ---- Static Layout (built once) ----

  protected addPort(p: PortInfo) {
    const key = this.portKeyFromPortInfo(p);
    this.ports.set(key, p);

    // Interactive zone for click
    const zone = this.add.zone(p.x - 16, p.y - 16, 32, 32);
    zone.setData('port', p);
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerdown', (pointer: PhaserPointer) => {
      if (pointer.leftButtonDown()) this.onPortClick(p, pointer);
    });
  }

  protected addDeviceBox(x: number, y: number, w: number, h: number, label: string, color = 0x2a2a4a) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(2, 0x3a3a5a, 1);
    g.strokeRoundedRect(x, y, w, h, 8);

    this.add.text(x + w / 2, y + 16, label, {
      fontFamily: 'monospace',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#eaeaea',
    }).setOrigin(0.5);
  }

  protected addStaticText(x: number, y: number, text: string, style: any = {}, depth = 1) {
    return this.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#888',
      ...style,
    }).setOrigin(0.5).setDepth(depth);
  }

  // ---- Dynamic Render (called on state changes) ----

  protected renderDynamicState() {
    if (!this.cableGraphics || !this.dragGraphics || !this.portGraphics) return;

    const renderStart = performance.now();

    const g = this.cableGraphics;
    const dg = this.dragGraphics;
    const pg = this.portGraphics;

    g.clear();
    dg.clear();
    pg.clear();

    // Clear old port texts (status labels)
    this.portTexts.forEach(t => t.destroy());
    this.portTexts.clear();

    this.drawCables();
    this.drawPorts();
    this.drawConnectionPreview();

    // Performance measurement (exposed for console debugging)
    const renderTime = performance.now() - renderStart;
    (this as any).__lastRenderTime = renderTime;
    (this as any).__renderCount = ((this as any).__renderCount || 0) + 1;
  }

  protected drawCables() {
    if (!this.cableGraphics) return;
    const g = this.cableGraphics;
    const currentView = this.getCurrentView();

    const cables = this.state.cables;
    for (const cable of cables) {
      if (!cable.endA || !cable.endB) continue;

      // Only draw cables visible in THIS view
      const cableView = viewOfPort(cable.endA); // both ends same view
      if (cableView !== currentView) continue;

      const startKey = portKey(cable.endA);
      const endKey = portKey(cable.endB);
      const start = this.ports.get(startKey);
      const end = this.ports.get(endKey);
      if (!start || !end) continue;

      const color = parseInt(cable.color.replace('#', ''), 16);
      g.lineStyle(cable.seated ? 3 : 2, color, cable.seated ? 1 : 0.5);
      if (!cable.seated) g.setLineStyle(2, color, 0.5, 1, [5, 5]);

      this.drawBezier(g, start.x, start.y, end.x, end.y);

      // LED indicator at midpoint
      const cx = (start.x + end.x) / 2;
      const cy = Math.min(start.y, end.y) - 40;
      g.fillStyle(cable.seated ? 0x00ff00 : 0xff0000, 1);
      g.fillCircle(cx, cy, 6);

      // Cable label at midpoint
      const labelX = (start.x + end.x) / 2;
      const labelY = cy - 8;
      const txt = this.add.text(labelX, labelY, cable.type.charAt(0).toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fff',
        backgroundColor: cable.color + 'AA',
        padding: { x: 4, y: 1 },
      }).setOrigin(0.5).setDepth(6);
      this.portTexts.set(`cable-label-${cable.id}`, txt);
    }
  }

  protected drawPorts() {
    if (!this.portGraphics) return;
    const pg = this.portGraphics;
    const currentView = this.getCurrentView();

    for (const [key, port] of this.ports.entries()) {
      const status = getJackStatus(this.state.cables, this.portInfoToPortId(port), currentView);
      const baseColor = this.getPortColor(port);

      // Determine visual state
      let lineColor: number;
      let fillColor: number;
      let fillAlpha: number;
      let lineWidth = 2;
      let radius = 10;

      if (status.here) {
        // Connected in THIS view - solid green, filled
        lineColor = 0x00ff00;
        fillColor = 0x00ff00;
        fillAlpha = 0.3;
        lineWidth = 3;
      } else if (status.opposite) {
        // Connected in OTHER view - cyan border, pulse hint
        lineColor = 0x00ffff;
        fillColor = 0x00ffff;
        fillAlpha = 0.15;
        lineWidth = 3;
      } else {
        // Free
        lineColor = baseColor;
        fillColor = baseColor;
        fillAlpha = 0.1;
      }

      pg.lineStyle(lineWidth, lineColor, 1);
      pg.fillStyle(fillColor, fillAlpha);
      pg.strokeCircle(port.x, port.y, radius);
      pg.fillCircle(port.x, port.y, radius - 4);

      // Status text for opposite-side connection
      if (status.opposite) {
        const other = status.opposite.otherEnd;
        const otherLabel = `${other.deviceId.logicalRole}:${other.portName}`;
        const viewLabel = currentView === 'cage' ? 'JAULA' : 'PC';
        const txt = this.add.text(port.x, port.y + 22, `🔗 ${viewLabel}: ${otherLabel}`, {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#00ffff',
          backgroundColor: '#000000AA',
          padding: { x: 4, y: 1 },
        }).setOrigin(0.5).setDepth(3);
        this.portTexts.set(`opposite-${key}`, txt);
      }

      // Port name label (always)
      const nameTxt = this.add.text(port.x, port.y - 18, port.portName, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#888',
      }).setOrigin(0.5).setDepth(2);
      this.portTexts.set(`name-${key}`, nameTxt);

      // Highlight compatible targets during connection mode
      if (this.connectionMode && this.isCompatibleTarget(this.connectionMode.start, port)) {
        pg.lineStyle(2, 0x00ffff, 0.8);
        pg.strokeCircle(port.x, port.y, radius + 4);
      }
    }

    // Highlight selected origin port
    if (this.connectionMode) {
      const start = this.connectionMode.start;
      pg.lineStyle(3, 0x00ffff, 1);
      pg.strokeCircle(start.x, start.y, 16);

      const hint = this.add.text(this.scale.width / 2, 40, 'Selecciona el segundo extremo', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#00ffff',
        backgroundColor: '#1a1a2eCC',
        padding: { x: 16, y: 8 },
      }).setOrigin(0.5).setDepth(1000);
      this.portTexts.set('connection-hint', hint);
    }
  }

  protected drawConnectionPreview() {
    if (!this.connectionMode || !this.dragGraphics || !this.cameras?.main) return;
    const g = this.dragGraphics;
    g.clear();
    // Convert cursor to world coordinates for preview line
    const camera = this.cameras.main;
    const worldPoint = camera.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
    // Dashed line from origin to cursor
    g.lineStyle(2, 0x00ffff, 0.5, 1, [8, 8]);
    this.drawBezier(g, this.connectionMode.start.x, this.connectionMode.start.y,
                    worldPoint.x, worldPoint.y);
  }

  // ---- Input Handling: Click-to-Connect ----

  private setupInput() {
    // Single pointerdown handler for ports (zones handle their own)
    // ESC to cancel connection mode
    this.input.keyboard?.on('keydown-ESC', () => this.cancelConnectionMode());

    // Click on empty space to cancel
    this.input.on('pointerdown', (pointer: PhaserPointer) => {
      if (pointer.leftButtonDown() && this.connectionMode) {
        // Check if clicked on a port zone
        const hitPort = this.getPortAtPosition(pointer.x, pointer.y);
        if (!hitPort) {
          this.cancelConnectionMode();
        }
      }
    }, this);

    // Right-click on cable to remove (global, checks cable graphics)
    this.input.on('pointerdown', (pointer: PhaserPointer) => {
      if (pointer.rightButtonDown()) {
        const cable = this.findCableAt(pointer.x, pointer.y);
        if (cable) {
          dispatch.removeCable(cable.id);
          this.showMessage(`Cable removed: ${cable.id}`);
          this.cancelConnectionMode(); // Ensure connection mode is cleared
        }
      }
    }, this);
  }

  private cleanupInput() {
    this.input.off('pointerdown');
    this.input.off('pointermove');
    this.input.keyboard?.off('keydown-ESC');
    // Remove contextmenu listener if added by subclass
    this.game.canvas.removeEventListener('contextmenu', () => {});
  }

  protected onPortClick(port: PortInfo, _pointer: PhaserPointer) {
    const currentView = this.getCurrentView();
    const portId = this.portInfoToPortId(port);
    const status = getJackStatus(this.state.cables, portId, currentView);

    if (this.connectionMode) {
      // SECOND CLICK: try to connect
      if (sameTermination(portId, this.portInfoToPortId(this.connectionMode.start))) {
        this.cancelConnectionMode();
        return;
      }
      if (status.here) return this.showMessage('Puerto ocupado en esta vista');

      const res = canConnect(this.state.cables, {
        type: this.state.selectedCable,
        endA: this.portInfoToPortId(this.connectionMode.start),
        endB: portId,
      }, currentView);
      if (!res.ok) return this.showMessage(res.reason);

      // Build Cable object with correct face for PP
      const cable: Cable = {
        id: `cable-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: this.state.selectedCable,
        endA: this.portInfoToPortId(this.connectionMode.start),
        endB: portId,
        color: this.getCableColor(this.state.selectedCable),
        seated: Math.random() > 0.02, // 2% failure rate (TODO: resolve with spec §10)
      };
      dispatch.addCable(cable);
      this.cancelConnectionMode();
    } else {
      // FIRST CLICK: start connection mode
      if (status.here) return this.showMessage('Puerto ocupado en esta vista');
      this.connectionMode = { start: port };
      this.dirtyDynamic = true; // Trigger render for highlight
    }
  }

  protected cancelConnectionMode() {
    this.connectionMode = null;
    this.dirtyDynamic = true;
  }

  protected isCompatibleTarget(origin: PortInfo, target: PortInfo): boolean {
    if (sameTermination(this.portInfoToPortId(origin), this.portInfoToPortId(target))) return false;
    const currentView = this.getCurrentView();
    const res = canConnect(this.state.cables, {
      type: this.state.selectedCable,
      endA: this.portInfoToPortId(origin),
      endB: this.portInfoToPortId(target),
    }, currentView);
    return res.ok;
  }

  // ---- Port/PortId Conversion ----

  protected portInfoToPortId(p: PortInfo): PortId {
    const face = this.inferFace(p.deviceId);
    return {
      deviceId: {
        type: kindOf(p.deviceId) as any,
        logicalRole: p.deviceId,
        physicalLabel: this.getPhysicalLabel(p.deviceId),
      },
      portName: p.portName,
      face,
    };
  }

  /** Infers PatchFace from deviceId and current view */
  protected inferFace(deviceId: string): PatchFace | undefined {
    if (!deviceId.startsWith('PP-')) return undefined;
    return this.getCurrentView() === 'pc' ? 'DESK' : 'RACK';
  }

  protected getPhysicalLabel(deviceId: string): string {
    const pa = this.state.physicalAssignment;
    if (!pa) return deviceId;
    if (deviceId.startsWith('PC-')) return pa.pcRoles[deviceId as 'PC-1' | 'PC-2'];
    if (deviceId.startsWith('PP-')) return `PP-${deviceId.slice(3)}`;
    if (deviceId === 'SW') return pa.switchIds[0];
    if (deviceId.startsWith('R')) return pa.routerRoles[deviceId as 'R1' | 'R2' | 'R3'];
    return deviceId;
  }

  protected getCableColor(type: CableType): string {
    switch (type) {
      case 'straight': return '#00d9a5';
      case 'crossover': return '#ffaa00';
      case 'usbEthernet': return '#00ffff';
      default: return '#ffffff';
    }
  }

  protected getPortColor(p: PortInfo): number {
    switch (p.portType) {
      case 'ethernet': return 0x00d9a5;
      case 'usb': return 0x00ffff;
      case 'console': return 0xffaa00;
      case 'patch': return 0x8888ff;
      default: return 0xffffff;
    }
  }

  protected drawBezier(g: any, x1: number, y1: number, x2: number, y2: number) {
    const cx = (x1 + x2) / 2;
    const cy = Math.min(y1, y2) - 40;
    g.beginPath();
    g.moveTo(x1, y1);
    const segments = 20;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
      const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
      g.lineTo(x, y);
    }
    g.strokePath();
  }

  protected findCableAt(screenX: number, screenY: number): Cable | null {
    if (!this.cameras?.main) return null;
    const cables = this.state.cables;
    const currentView = this.getCurrentView();

    // Convert screen coordinates to world coordinates (handles camera zoom/pan)
    const camera = this.cameras.main;
    const worldPoint = camera.getWorldPoint(screenX, screenY);
    const worldX = worldPoint.x;
    const worldY = worldPoint.y;

    for (const cable of cables) {
      if (!cable.endA || !cable.endB) continue;
      // Only check cables visible in this view
      if (viewOfPort(cable.endA) !== currentView) continue;

      const startKey = portKey(cable.endA);
      const endKey = portKey(cable.endB);
      const start = this.ports.get(startKey);
      const end = this.ports.get(endKey);
      if (!start || !end) continue;

      const cx = (start.x + end.x) / 2;
      const cy = Math.min(start.y, end.y) - 40;
      const dist = Math.hypot(worldX - cx, worldY - cy);
      if (dist < 15) return cable;
    }
    return null;
  }

  protected getPortAtPosition(screenX: number, screenY: number): PortInfo | null {
    if (!this.cameras?.main) return null;
    // Convert screen coordinates to world coordinates (handles camera zoom/pan)
    const camera = this.cameras.main;
    const worldPoint = camera.getWorldPoint(screenX, screenY);
    const worldX = worldPoint.x;
    const worldY = worldPoint.y;

    for (const port of this.ports.values()) {
      const dist = Math.hypot(worldX - port.x, worldY - port.y);
      if (dist < 16) return port;
    }
    return null;
  }

  protected showMessage(msg: string) {
    const txt = this.add.text(this.scale.width / 2, 60, msg, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ff4444',
      backgroundColor: '#1a1a2eCC',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(1000);

    this.time.delayedCall(2000, () => txt.destroy());
  }

  /** Exposed for console debugging: prints render performance stats */
  public debugRenderStats(): void {
    const count = (this as any).__renderCount || 0;
    const last = (this as any).__lastRenderTime || 0;
    const children = this.children.list.length;
    const ports = this.ports.size;
    const portTexts = this.portTexts.size;
    console.log(`[${this.scene.key}] renders: ${count}, last: ${last.toFixed(2)}ms, children: ${children}, ports: ${ports}, portTexts: ${portTexts}`);
  }

  // Helper to create port key from PortInfo (includes face based on current view)
  protected portKeyFromPortInfo(p: PortInfo): string {
    let face = '';
    if (p.deviceId.startsWith('PP-')) {
      face = this.getCurrentView() === 'pc' ? ':DESK' : ':RACK';
    }
    return `${p.deviceId}:${p.portName}${face}`;
  }
}