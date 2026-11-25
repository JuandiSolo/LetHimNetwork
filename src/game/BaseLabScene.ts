/**
 * BaseLabScene - Shared logic for CageScene and PcScene.
 * All cable interaction logic lives here, single source of truth.
 */

import Phaser from 'phaser';
import { gameStore, dispatch } from '@app/store';
import { checkConnection, remainingCables, kindOf, panelLetterOf } from '@core/cables';
import type { Cable, CableType, PhysicalAssignment, PortId } from '@core/types';

export interface PortInfo {
  deviceId: string;      // logical role: 'PC-1', 'PP-1', 'SW', 'R1', 'R2', 'R3'
  portName: string;      // 'NIC', 'USB', 'Console', 'G0/0', 'E1', '1'...
  portType: 'ethernet' | 'usb' | 'console' | 'patch';
  x: number;
  y: number;
}

interface CableDrawInfo {
  id: string;
  type: CableType;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

// Phaser 4 type aliases - using any to avoid namespace issues
type PhaserPointer = any;

export abstract class BaseLabScene extends Phaser.Scene {
  constructor(key: string) {
    super({ key });
  }
  protected dirty = true;
  protected ports = new Map<string, PortInfo>();    // key: 'PC-1:NIC' -> PortInfo
  protected drag: { start: PortInfo; x: number; y: number } | null = null;
  private unsub?: () => void;

  protected get state() { return gameStore.getState(); }

  protected abstract buildLayout(): void;   // draws devices and calls this.addPort(...)

  create() {
    this.unsub = gameStore.subscribe(() => { this.dirty = true; });
    this.scale.on('resize', () => { this.dirty = true; });
    this.events.once('shutdown', () => { this.unsub?.(); this.scale.off('resize'); });
    this.setupInput();
  }

  update() {
    if (!this.dirty) return;
    this.dirty = false;
    this.children.removeAll(true);
    this.ports.clear();
    this.buildLayout();
    this.drawCables();
  }

  // ---- Port management ----

  protected addPort(p: PortInfo) {
    const key = `${p.deviceId}:${p.portName}`;
    this.ports.set(key, p);

    // Visual port indicator
    const color = this.getPortColor(p);
    const occupied = this.isOccupied(p.deviceId, p.portName);
    const g = this.add.graphics();
    g.lineStyle(2, occupied ? 0xff4444 : color, 1);
    g.fillStyle(occupied ? 0xff4444 : color, occupied ? 0.3 : 0.1);
    g.strokeCircle(p.x, p.y, 8);
    g.fillCircle(p.x, p.y, 6);

    // Port label
    this.add.text(p.x, p.y - 18, p.portName, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#888',
    }).setOrigin(0.5);

    // Interactive zone for drag
    const zone = this.add.zone(p.x - 12, p.y - 12, 24, 24);
    zone.setData('port', p);
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerdown', (pointer: PhaserPointer) => {
      if (pointer.leftButtonDown()) this.onDown(p);
    });
    zone.on('pointerup', (pointer: PhaserPointer) => {
      if (pointer.wasTouch || pointer.leftButtonReleased()) this.onUp(p);
    });
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

  protected isOccupied(deviceId: string, portName: string): boolean {
    return this.state.cables.some(c =>
      [c.endA, c.endB].some(e => e && e.deviceId.logicalRole === deviceId && e.portName === portName)
    );
  }

  // ---- Input handling ----

  private setupInput() {
    // Drag preview line
    this.input.on('pointermove', (pointer: PhaserPointer) => {
      if (this.drag) {
        this.drag.x = pointer.x;
        this.drag.y = pointer.y;
      }
    });

    // Right-click on cable to remove
    this.input.on('pointerdown', (pointer: PhaserPointer) => {
      if (pointer.rightButtonDown()) {
        const cable = this.findCableAt(pointer.x, pointer.y);
        if (cable) {
          dispatch.removeCable(cable.id);
          this.showMessage(`Cable removed: ${cable.id}`);
        }
      }
    });
  }

  protected onDown(port: PortInfo) {
    if (this.isOccupied(port.deviceId, port.portName)) {
      return this.showMessage('Puerto ocupado');
    }
    const remaining = remainingCables(this.state.cables);
    if (remaining[this.state.selectedCable] <= 0) {
      return this.showMessage(`No quedan cables de tipo ${this.state.selectedCable}`);
    }
    this.drag = { start: port, x: port.x, y: port.y };
  }

  protected onUp(end: PortInfo | null) {
    const d = this.drag;
    this.drag = null;
    if (!d || !end || end.deviceId === d.start.deviceId && end.portName === d.start.portName) return;
    if (this.isOccupied(end.deviceId, end.portName)) return this.showMessage('Puerto ocupado');

    const res = checkConnection(this.state.selectedCable, d.start, end);
    if (!res.ok) return this.showMessage(res.reason);

    // Build Cable object
    const cable: Cable = {
      id: `cable-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: this.state.selectedCable,
      endA: this.portInfoToPortId(d.start),
      endB: this.portInfoToPortId(end),
      color: this.getCableColor(this.state.selectedCable),
      seated: Math.random() > 0.02, // 2% failure rate
    };
    dispatch.addCable(cable);
  }

  protected portInfoToPortId(p: PortInfo): PortId {
    return {
      deviceId: {
        type: kindOf(p.deviceId) as any,
        logicalRole: p.deviceId,
        physicalLabel: this.getPhysicalLabel(p.deviceId),
      },
      portName: p.portName,
    };
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

  // ---- Cable rendering ----

  protected drawCables() {
    const cables = this.state.cables;
    for (const cable of cables) {
      if (!cable.endA || !cable.endB) continue;
      const startKey = `${cable.endA.deviceId.logicalRole}:${cable.endA.portName}`;
      const endKey = `${cable.endB.deviceId.logicalRole}:${cable.endB.portName}`;
      const start = this.ports.get(startKey);
      const end = this.ports.get(endKey);
      if (!start || !end) continue; // One end not in this view - don't draw

      const color = parseInt(cable.color.replace('#', ''), 16);
      const g = this.add.graphics();
      g.lineStyle(cable.seated ? 3 : 2, color, cable.seated ? 1 : 0.5);
      if (!cable.seated) g.setLineStyle(2, color, 0.5, 1, [5, 5]);

      // Quadratic bezier curve
      const cx = (start.x + end.x) / 2;
      const cy = Math.min(start.y, end.y) - 40;
      g.beginPath();
      g.moveTo(start.x, start.y);
      g.quadraticCurveTo(cx, cy, end.x, end.y);
      g.strokePath();

      // Cable label
      const labelX = (start.x + end.x) / 2;
      const labelY = cy - 8;
      this.add.text(labelX, labelY, cable.type.charAt(0).toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fff',
        backgroundColor: cable.color + 'AA',
        padding: { x: 4, y: 1 },
      }).setOrigin(0.5);
    }
  }

  private findCableAt(x: number, y: number): Cable | null {
    const cables = this.state.cables;
    for (const cable of cables) {
      if (!cable.endA || !cable.endB) continue;
      const startKey = `${cable.endA.deviceId.logicalRole}:${cable.endA.portName}`;
      const endKey = `${cable.endB.deviceId.logicalRole}:${cable.endB.portName}`;
      const start = this.ports.get(startKey);
      const end = this.ports.get(endKey);
      if (!start || !end) continue;

      // Simple distance check to curve midpoint
      const cx = (start.x + end.x) / 2;
      const cy = Math.min(start.y, end.y) - 40;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < 15) return cable;
    }
    return null;
  }

  // ---- Helpers ----

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
}