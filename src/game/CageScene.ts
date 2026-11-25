/**
 * Phaser 4 Scene for the cage/jaula view.
 * Mock implementation for H0 - basic rectangles and labels.
 */

import Phaser from 'phaser';
import type { PhysicalAssignment, Cable } from '@core/types';

interface CageSceneData {
  physicalAssignment: PhysicalAssignment;
  cables: Cable[];
  onPortClick: (deviceId: string, portName: string) => void;
  onCableDrop: (cableType: string, fromDevice: string, fromPort: string, toDevice: string, toPort: string) => void;
}

// Type aliases for Phaser 4 internal types (using any to avoid namespace issues)
type PhaserGraphics = any;
type PhaserZone = any;
type PhaserPointer = any;

export class CageScene extends Phaser.Scene {
  private physicalAssignment!: PhysicalAssignment;
  private cables: Cable[] = [];
  private onPortClick!: (deviceId: string, portName: string) => void;
  private _onCableDrop!: (cableType: string, fromDevice: string, fromPort: string, toDevice: string, toPort: string) => void;

  private deviceGraphics: Map<string, PhaserGraphics> = new Map();
  private portZones: Map<string, PhaserZone> = new Map();
  private cableGraphics!: PhaserGraphics;
  private _selectedPort: { deviceId: string; portName: string } | null = null;
  private _cableType: 'straight' | 'crossover' | 'console' = 'straight';

  constructor() {
    super({ key: 'CageScene' });
  }

  init(data: CageSceneData): void {
    // Data from Phaser scene start (if any)
    this.physicalAssignment = data.physicalAssignment;
    this.cables = data.cables || [];
    // Callbacks will be injected directly on scene instance by PhaserGame
  }

  create(): void {
    this.cableGraphics = this.add.graphics();

    // Set up camera for zoom/pan
    this.cameras.main.setBounds(0, 0, 1600, 1000);
    this.input.on('wheel', (_pointer: PhaserPointer, _: unknown, _dx: number, dy: number) => {
      if (dy > 0) this.cameras.main.zoom = Math.min(2, this.cameras.main.zoom + 0.1);
      else this.cameras.main.zoom = Math.max(0.5, this.cameras.main.zoom - 0.1);
    });

    // Pan with middle mouse or shift+drag
    this.input.on('pointerdown', (pointer: PhaserPointer) => {
      if (pointer.middleButtonDown() || pointer.shiftKey) {
        this.input.setDefaultCursor('grabbing');
      }
    });

    this.input.on('pointerup', () => {
      this.input.setDefaultCursor('default');
    });

    this.input.on('pointermove', (pointer: PhaserPointer) => {
      if (pointer.middleButtonDown() || (pointer.shiftKey && pointer.isDown)) {
        this.cameras.main.scrollX -= pointer.velocity.x / this.cameras.main.zoom;
        this.cameras.main.scrollY -= pointer.velocity.y / this.cameras.main.zoom;
      }
    });

    // Always render cage background (doesn't need physicalAssignment)
    this.renderCage();
    // Render devices/cables only if data is available
    if (this.physicalAssignment) {
      this.renderDevices();
      this.renderCables();
    }
  }

  // Update data from React store
  updateData(data: Partial<CageSceneData>): void {
    if (data.physicalAssignment) this.physicalAssignment = data.physicalAssignment;
    if (data.cables) this.cables = data.cables;
    this.renderCage();
    this.renderDevices();
    this.renderCables();
  }

  setCableType(type: 'straight' | 'crossover' | 'console'): void {
    this.cableType = type;
  }

  private renderCage(): void {
    // Background grid
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x333333, 0.3);
    for (let x = 0; x <= 1600; x += 50) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, 1000);
    }
    for (let y = 0; y <= 1000; y += 50) {
      graphics.moveTo(0, y);
      graphics.lineTo(1600, y);
    }
    graphics.strokePath();

    // Cage outline
    const cage = this.add.graphics();
    cage.lineStyle(3, 0x666666, 1);
    cage.strokeRect(100, 100, 1400, 800);

    // Label
    this.add.text(800, 50, 'JAULA DE RED - TOPLOGÍA 1', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private renderDevices(): void {
    // Guard: physicalAssignment not ready yet
    if (!this.physicalAssignment?.pcRoles || !this.physicalAssignment?.routerRoles || !this.physicalAssignment?.switchIds) {
      return;
    }

    // Clear existing device graphics
    this.deviceGraphics.forEach(g => g.destroy());
    this.deviceGraphics.clear();
    this.portZones.forEach(z => z.destroy());
    this.portZones.clear();

    const { pcRoles, routerRoles, switchIds } = this.physicalAssignment;

    // Render PCs (left side, outside cage)
    this.renderPC('PC-1', pcRoles['PC-1'], 50, 300);
    this.renderPC('PC-2', pcRoles['PC-2'], 50, 600);

    // Render Switch (center)
    this.renderSwitch(switchIds[0], 800, 450);

    // Render Routers (right side, inside cage)
    const routerPositions = [
      { role: 'R1', x: 1200, y: 200 },
      { role: 'R2', x: 1200, y: 450 },
      { role: 'R3', x: 1200, y: 700 },
    ];

    routerPositions.forEach(({ role, x, y }) => {
      const physicalId = routerRoles[role as keyof typeof routerRoles];
      this.renderRouter(role, physicalId, x, y);
    });

    // Render Patch Panels (near PCs)
    this.renderPatchPanel('PP-1', pcRoles['PC-1'], 200, 300);
    this.renderPatchPanel('PP-2', pcRoles['PC-2'], 200, 600);
  }

  private renderPC(role: string, physicalId: string, x: number, y: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x4444aa, 1);
    g.fillRoundedRect(x - 60, y - 40, 120, 80, 8);
    g.lineStyle(2, 0x6666cc, 1);
    g.strokeRoundedRect(x - 60, y - 40, 120, 80, 8);

    this.add.text(x, y - 15, role, { fontSize: '16px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);
    this.add.text(x, y + 10, physicalId, { fontSize: '12px', color: '#aaa', fontFamily: 'monospace' }).setOrigin(0.5);

    // NIC port
    const portZone = this.add.zone(x + 60, y, 20, 20);
    portZone.setRectangleDropZone(20, 20);
    portZone.setData({ deviceId: role, portName: 'NIC', type: 'ethernet' });
    this.setupPortZone(portZone);
    this.portZones.set(`${role}:NIC`, portZone);

    this.deviceGraphics.set(role, g);
  }

  private renderSwitch(physicalId: string, x: number, y: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x44aa44, 1);
    g.fillRoundedRect(x - 100, y - 30, 200, 60, 6);
    g.lineStyle(2, 0x66cc66, 1);
    g.strokeRoundedRect(x - 100, y - 30, 200, 60, 6);

    this.add.text(x, y - 10, 'SWITCH', { fontSize: '14px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);
    this.add.text(x, y + 10, physicalId, { fontSize: '11px', color: '#aaa', fontFamily: 'monospace' }).setOrigin(0.5);

    // 8 visible ports (representing 24/48)
    for (let i = 0; i < 8; i++) {
      const px = x - 90 + i * 25;
      const portZone = this.add.zone(px, y + 30, 20, 15);
      portZone.setRectangleDropZone(20, 15);
      portZone.setData({ deviceId: 'SW', portName: `Eth${i + 1}`, type: 'ethernet' });
      this.setupPortZone(portZone);
      this.portZones.set(`SW:Eth${i + 1}`, portZone);

      // Port number label
      this.add.text(px, y + 50, `${i + 1}`, { fontSize: '9px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5);
    }

    this.deviceGraphics.set('SW', g);
  }

  private renderRouter(role: string, physicalId: string, x: number, y: number): void {
    const g = this.add.graphics();
    g.fillStyle(0xaa4444, 1);
    g.fillRoundedRect(x - 80, y - 35, 160, 70, 6);
    g.lineStyle(2, 0xcc6666, 1);
    g.strokeRoundedRect(x - 80, y - 35, 160, 70, 6);

    this.add.text(x, y - 18, role, { fontSize: '16px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);
    this.add.text(x, y + 5, physicalId, { fontSize: '11px', color: '#aaa', fontFamily: 'monospace' }).setOrigin(0.5);

    // Determine port names based on physical router series
    const is2900 = physicalId.startsWith('Router ') && parseInt(physicalId.split(' ')[1]) <= 8;
    const wanPort = is2900 ? 'G0/0' : 'F0/0';
    const lanPort = is2900 ? 'G0/1' : 'F0/1';

    // WAN port (left)
    const wanZone = this.add.zone(x - 80, y - 10, 20, 20);
    wanZone.setRectangleDropZone(20, 20);
    wanZone.setData({ deviceId: role, portName: wanPort, type: 'ethernet' });
    this.setupPortZone(wanZone);
    this.portZones.set(`${role}:${wanPort}`, wanZone);
    this.add.text(x - 80, y - 30, wanPort, { fontSize: '9px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5);

    // LAN port (right)
    const lanZone = this.add.zone(x + 80, y - 10, 20, 20);
    lanZone.setRectangleDropZone(20, 20);
    lanZone.setData({ deviceId: role, portName: lanPort, type: 'ethernet' });
    this.setupPortZone(lanZone);
    this.portZones.set(`${role}:${lanPort}`, lanZone);
    this.add.text(x + 80, y - 30, lanPort, { fontSize: '9px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5);

    // Console port (bottom)
    const consoleZone = this.add.zone(x, y + 35, 20, 20);
    consoleZone.setRectangleDropZone(20, 20);
    consoleZone.setData({ deviceId: role, portName: 'Console', type: 'console' });
    this.setupPortZone(consoleZone);
    this.portZones.set(`${role}:Console`, consoleZone);
    this.add.text(x, y + 55, 'CON', { fontSize: '9px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5);

    this.deviceGraphics.set(role, g);
  }

  private renderPatchPanel(role: string, physicalId: string, x: number, y: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x666666, 1);
    g.fillRoundedRect(x - 80, y - 60, 160, 120, 4);
    g.lineStyle(1, 0x888888, 1);
    g.strokeRoundedRect(x - 80, y - 60, 160, 120, 4);

    this.add.text(x, y - 75, `PANEL ${physicalId}`, { fontSize: '12px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);

    // 4 jacks per panel (A1-A4 or B1-B4)
    const letter = physicalId === this.physicalAssignment.pcRoles['PC-1'] ? 'A' : 'B';
    for (let i = 1; i <= 4; i++) {
      const px = x - 60 + (i - 1) * 40;
      const portZone = this.add.zone(px, y, 30, 20);
      portZone.setRectangleDropZone(30, 20);
      portZone.setData({ deviceId: role, portName: `${letter}${i}`, type: 'patch' });
      this.setupPortZone(portZone);
      this.portZones.set(`${role}:${letter}${i}`, portZone);

      this.add.text(px, y - 20, `${letter}${i}`, { fontSize: '10px', color: '#ccc', fontFamily: 'monospace' }).setOrigin(0.5);
    }

    this.deviceGraphics.set(role + '-panel', g);
  }

  private setupPortZone(zone: PhaserZone): void {
    zone.on('pointerdown', () => {
      const deviceId = zone.getData('deviceId');
      const portName = zone.getData('portName');
      // const type = zone.getData('type'); // unused for now
      this.onPortClick(deviceId, portName);
    });

    zone.on('pointerover', () => {
      this.input.setDefaultCursor('pointer');
      zone.setAlpha(0.7);
    });

    zone.on('pointerout', () => {
      this.input.setDefaultCursor('default');
      zone.setAlpha(1);
    });
  }

  private renderCables(): void {
    this.cableGraphics.clear();

    if (!this.cables || this.cables.length === 0) return;

    this.cables.forEach(cable => {
      if (!cable.endA || !cable.endB) return;

      const posA = this.getPortPosition(cable.endA);
      const posB = this.getPortPosition(cable.endB);

      if (!posA || !posB) return;

      // Color by cable type
      const colors: Record<string, number> = {
        straight: 0x00ff00,
        crossover: 0xff8800,
        console: 0x00ffff,
      };

      this.cableGraphics.lineStyle(3, colors[cable.type] || 0xffffff, cable.seated ? 1 : 0.4);
      this.cableGraphics.beginPath();
      this.cableGraphics.moveTo(posA.x, posA.y);

      // Curved cable
      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2 - 50;
      this.cableGraphics.quadraticCurveTo(midX, midY, posB.x, posB.y);
      this.cableGraphics.strokePath();

      // LED indicator at midpoint
      if (cable.seated) {
        this.cableGraphics.fillStyle(0x00ff00, 1);
        this.cableGraphics.fillCircle(midX, midY, 6);
      } else {
        this.cableGraphics.fillStyle(0xff0000, 1);
        this.cableGraphics.fillCircle(midX, midY, 6);
      }
    });
  }

  private getPortPosition(port: { deviceId: { logicalRole: string }; portName: string }): { x: number; y: number } | null {
    const key = `${port.deviceId.logicalRole}:${port.portName}`;
    const zone = this.portZones.get(key);
    if (zone) {
      return { x: zone.x, y: zone.y };
    }
    return null;
  }
}