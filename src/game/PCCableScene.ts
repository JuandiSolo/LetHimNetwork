/**
 * Phaser Scene for PC Cable view - Desktop area cable connections.
 * Similar to CageScene but only PCs and Patch Panels.
 * Allows: PC NIC ↔ Patch Panel (straight), PC USB ↔ Patch Panel (usbEthernet)
 */

import Phaser from 'phaser';
import type { PhysicalAssignment, Cable } from '@core/types';

interface PCCableSceneData {
  physicalAssignment: PhysicalAssignment;
  cables: Cable[];
  onPortClick: (deviceId: string, portName: string) => void;
  onCableDrop: (cableType: string, fromDevice: string, fromPort: string, toDevice: string, toPort: string) => void;
  onCableAdd: (cable: Cable) => void;
  onCableRemove: (cableId: string) => void;
  onCableSeated: (cableId: string, seated: boolean) => void;
  onBackToDesktop: () => void;
  selectedPC?: 'PC-1' | 'PC-2' | null;
}

type PhaserGraphics = any;
type PhaserZone = any;
type PhaserPointer = any;

interface PortInfo {
  deviceId: string;
  portName: string;
  portType: 'ethernet' | 'patch' | 'usb';
  zone: PhaserZone;
  x: number;
  y: number;
}

interface CableInProgress {
  type: 'straight' | 'crossover' | 'usbEthernet';
  startPort: PortInfo;
  currentPos: { x: number; y: number };
  graphics: PhaserGraphics;
}

export class PCCableScene extends Phaser.Scene {
  private physicalAssignment!: PhysicalAssignment;
  private cables: Cable[] = [];
  private onPortClick!: (deviceId: string, portName: string) => void;
  private _onCableDrop!: (cableType: string, fromDevice: string, fromPort: string, toDevice: string, toPort: string) => void;
  private onCableAdd!: (cable: Cable) => void;
  private onCableRemove!: (cableId: string) => void;
  private onCableSeated!: (cableId: string, seated: boolean) => void;
  private onBackToDesktop!: () => void;
  private selectedPC: 'PC-1' | 'PC-2' | null = null;

  private deviceGraphics: Map<string, PhaserGraphics> = new Map();
  private portZones: Map<string, PhaserZone> = new Map();
  private portInfoMap: Map<string, PortInfo> = new Map();
  private cableGraphics!: PhaserGraphics;
  private previewGraphics!: PhaserGraphics;
  private cableHitAreas: Array<{ cable: Cable; graphics: PhaserGraphics; points: { x: number; y: number }[] }> = [];

  private cableInProgress: CableInProgress | null = null;
  private selectedCableType: 'straight' | 'crossover' | 'usbEthernet' = 'straight';
  private hoveredPort: PortInfo | null = null;
  private occupiedPorts: Set<string> = new Set();

  constructor() {
    super({ key: 'PCCableScene' });
  }

  init(data: PCCableSceneData): void {
    this.physicalAssignment = data.physicalAssignment;
    this.cables = data.cables || [];
    this.onPortClick = data.onPortClick;
    this._onCableDrop = data.onCableDrop;
    this.onCableAdd = data.onCableAdd;
    this.onCableRemove = data.onCableRemove;
    this.onCableSeated = data.onCableSeated;
    this.onBackToDesktop = data.onBackToDesktop;
    this.selectedPC = data.selectedPC || null;
    this.rebuildOccupiedPorts();
  }

  create(): void {
    this.previewGraphics = this.add.graphics({ x: 0, y: 0 });
    this.previewGraphics.setDepth(10);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, 1200, 800);
    camera.setBackgroundColor('#1a1a2e');

    this.renderBackground();
    if (this.physicalAssignment) {
      this.renderDevices();
    }

    this.cableGraphics = this.add.graphics({ x: 0, y: 0 });
    this.cableGraphics.setDepth(5);
    if (this.physicalAssignment) {
      this.renderCables();
    }

    // Back button
    const backBtn = this.add.text(50, 40, '← Volver al Escritorio', {
      fontSize: '16px',
      color: '#00d9a5',
      fontFamily: 'monospace',
      backgroundColor: '#16213e',
      padding: { x: 12, y: 8 },
    })
      .setOrigin(0, 0.5)
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onBackToDesktop())
      .on('pointerover', () => backBtn.setStyle({ color: '#00ffcc' }))
      .on('pointerout', () => backBtn.setStyle({ color: '#00d9a5' }));

    // Title
    this.add.text(600, 50, 'CABLEADO ESCRITORIO - PCs Y PARRILLAS', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(1);

    // Cable type selector
    this.renderCableTypeSelector();

    // Input handling
    this.setupInput();
  }

  private setupInput(): void {
    const camera = this.cameras.main;

    // Zoom
    this.input.on('wheel', (_pointer: PhaserPointer, _: unknown, _dx: number, dy: number) => {
      const zoomFactor = dy > 0 ? 1.1 : 1 / 1.1;
      camera.zoom = Phaser.Math.Clamp(camera.zoom * zoomFactor, 0.5, 2);
    });

    // Pan with right/middle click
    let isPanning = false;
    let lastPointerX = 0;
    let lastPointerY = 0;

    this.input.on('pointerdown', (pointer: PhaserPointer) => {
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        isPanning = true;
        lastPointerX = pointer.x;
        lastPointerY = pointer.y;
        this.input.setDefaultCursor('grabbing');
      }
    });

    this.input.on('pointerup', () => {
      isPanning = false;
      this.input.setDefaultCursor('default');
    });

    this.input.on('pointermove', (pointer: PhaserPointer) => {
      if (isPanning && (pointer.rightButtonDown() || pointer.middleButtonDown())) {
        const dx = (pointer.x - lastPointerX) / camera.zoom;
        const dy = (pointer.y - lastPointerY) / camera.zoom;
        camera.scrollX -= dx;
        camera.scrollY -= dy;
        lastPointerX = pointer.x;
        lastPointerY = pointer.y;
      }

      if (this.cableInProgress) {
        this.cableInProgress.currentPos = { x: pointer.worldX, y: pointer.worldY };
        this.renderCablePreview();
      }

      this.checkPortHover(pointer.worldX, pointer.worldY);
    });

    this.game.canvas.addEventListener('contextmenu', (e: Event) => e.preventDefault());

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-ONE', () => { this.setCableType('straight'); });
    this.input.keyboard?.on('keydown-TWO', () => { this.setCableType('usbEthernet'); });
    // No crossover in PC cable view
    this.input.keyboard?.on('keydown-ESC', () => { this.cancelCable(); });
    this.input.keyboard?.on('keydown-BACKSPACE', () => { this.onBackToDesktop(); });

    // Cable removal: right-click on cable
    this.input.on('pointerdown', (pointer: PhaserPointer) => {
      if (pointer.rightButtonDown() && !this.cableInProgress && !pointer.middleButtonDown()) {
        const hitCable = this.getCableAtPosition(pointer.worldX, pointer.worldY);
        if (hitCable) {
          this.removeCable(hitCable.id);
          return;
        }
      }
    });

    // Complete cable
    this.input.on('pointerup', (pointer: PhaserPointer) => {
      if (this.cableInProgress) {
        this.tryCompleteCable(pointer.worldX, pointer.worldY);
      }
    });
  }

  private checkPortHover(x: number, y: number): void {
    for (const [, portInfo] of this.portInfoMap) {
      const zone = portInfo.zone;
      const isOver = x >= zone.x - zone.width / 2 && x <= zone.x + zone.width / 2 &&
                     y >= zone.y - zone.height / 2 && y <= zone.y + zone.height / 2;

      if (isOver && this.hoveredPort !== portInfo) {
        this.hoveredPort = portInfo;
        if (!this.cableInProgress) {
          zone.setAlpha(0.7);
        }
      } else if (!isOver && this.hoveredPort === portInfo) {
        this.hoveredPort = null;
        if (!this.cableInProgress) {
          zone.setAlpha(1);
        }
      }
    }
  }

  updateData(data: Partial<PCCableSceneData>): void {
    if (data.physicalAssignment) this.physicalAssignment = data.physicalAssignment;
    if (data.cables) {
      this.cables = data.cables;
      this.rebuildOccupiedPorts();
    }
    if (data.selectedPC !== undefined) this.selectedPC = data.selectedPC;
    this.renderBackground();
    if (this.physicalAssignment) {
      this.renderDevices();
      this.renderCables();
    }
    this.renderCableTypeSelector();
  }

  setCableType(type: 'straight' | 'usbEthernet'): void {
    this.selectedCableType = type;
    this.renderCableTypeSelector();
  }

  private rebuildOccupiedPorts(): void {
    this.occupiedPorts.clear();
    this.cables.forEach(cable => {
      if (cable.endA) {
        const key = `${cable.endA.deviceId.logicalRole}:${cable.endA.portName}`;
        this.occupiedPorts.add(key);
      }
      if (cable.endB) {
        const key = `${cable.endB.deviceId.logicalRole}:${cable.endB.portName}`;
        this.occupiedPorts.add(key);
      }
    });
  }

  private getPortInfoKey(port: PortInfo): string {
    return `${port.deviceId}:${port.portName}`;
  }

  private isPortOccupied(port: PortInfo): boolean {
    return this.occupiedPorts.has(this.getPortInfoKey(port));
  }

  private markPortOccupied(port: PortInfo, occupied: boolean): void {
    const key = this.getPortInfoKey(port);
    if (occupied) this.occupiedPorts.add(key);
    else this.occupiedPorts.delete(key);
  }

  private renderBackground(): void {
    const graphics = this.add.graphics();
    graphics.setDepth(-10);
    graphics.lineStyle(1, 0x333333, 0.3);
    for (let x = 0; x <= 1200; x += 50) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, 800);
    }
    for (let y = 0; y <= 800; y += 50) {
      graphics.moveTo(0, y);
      graphics.lineTo(1200, y);
    }
    graphics.strokePath();

    const cage = this.add.graphics();
    cage.setDepth(-5);
    cage.lineStyle(3, 0x666666, 1);
    cage.strokeRect(50, 80, 1100, 650);

    this.add.text(600, 50, 'CABLEADO ESCRITORIO - PCs Y PARRILLAS', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(-5);
  }

  private renderDevices(): void {
    if (!this.physicalAssignment?.pcRoles) return;

    this.deviceGraphics.forEach(g => g.destroy());
    this.deviceGraphics.clear();
    this.portZones.forEach(z => z.destroy());
    this.portZones.clear();
    this.portInfoMap.clear();

    const { pcRoles } = this.physicalAssignment;

    // PC-1 (left side)
    this.renderPC('PC-1', pcRoles['PC-1'], 150, 300, 'A');

    // PC-2 (left side)
    this.renderPC('PC-2', pcRoles['PC-2'], 150, 580, 'B');

    // Patch Panel A (right side, upper)
    this.renderPatchPanel('PP-1', pcRoles['PC-1'], 950, 300, 'A');

    // Patch Panel B (right side, lower)
    this.renderPatchPanel('PP-2', pcRoles['PC-2'], 950, 580, 'B');
  }

  private renderPC(role: string, physicalId: string, x: number, y: number, panelLetter: string): void {
    const g = this.add.graphics();
    g.setDepth(0);
    g.fillStyle(0x4444aa, 1);
    g.fillRoundedRect(x - 80, y - 70, 160, 140, 8);
    g.lineStyle(2, 0x6666cc, 1);
    g.strokeRoundedRect(x - 80, y - 70, 160, 140, 8);

    const isSelected = this.selectedPC === role;
    if (isSelected) {
      g.lineStyle(3, 0x00d9a5, 1);
      g.strokeRoundedRect(x - 80, y - 70, 160, 140, 8);
    }

    this.add.text(x, y - 50, role, { fontSize: '18px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);
    this.add.text(x, y - 25, physicalId, { fontSize: '12px', color: '#aaa', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);

    // NIC port (right side)
    const nicZone = this.add.zone(x + 80, y - 35, 24, 24);
    nicZone.setRectangleDropZone(24, 24);
    nicZone.setData({ deviceId: role, portName: 'NIC', type: 'ethernet' });
    this.setupPortZone(nicZone, role, 'NIC', 'ethernet', x + 80, y - 35);
    this.portZones.set(`${role}:NIC`, nicZone);
    this.add.text(x + 80, y - 60, 'NIC', { fontSize: '9px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);
    this.add.text(x + 80, y - 10, 'RJ45', { fontSize: '8px', color: '#00d9a5', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);

    // USB port (right side below NIC)
    const usbZone = this.add.zone(x + 80, y + 15, 24, 24);
    usbZone.setRectangleDropZone(24, 24);
    usbZone.setData({ deviceId: role, portName: 'USB', type: 'usb' });
    this.setupPortZone(usbZone, role, 'USB', 'usb', x + 80, y + 15);
    this.portZones.set(`${role}:USB`, usbZone);
    this.add.text(x + 80, y - 10, 'USB', { fontSize: '9px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);
    this.add.text(x + 80, y + 40, 'CONSOLA', { fontSize: '8px', color: '#00ffff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);

    // Click on PC body to go to terminal
    const pcBodyZone = this.add.zone(x, y, 160, 140);
    pcBodyZone.setRectangleDropZone(160, 140);
    pcBodyZone.setInteractive({ useHandCursor: true });
    pcBodyZone.on('pointerdown', () => {
      this.onPortClick(role, 'TERMINAL'); // Special signal to open terminal
    });
    pcBodyZone.on('pointerover', () => {
      this.input.setDefaultCursor('pointer');
      if (!isSelected) g.lineStyle(2, 0x00d9a5, 0.5).strokeRoundedRect(x - 80, y - 70, 160, 140, 8);
    });
    pcBodyZone.on('pointerout', () => {
      this.input.setDefaultCursor('default');
      if (!isSelected) g.lineStyle(2, 0x6666cc, 1).strokeRoundedRect(x - 80, y - 70, 160, 140, 8);
    });

    this.deviceGraphics.set(role, g);
  }

  private renderPatchPanel(role: string, physicalId: string, x: number, y: number, letter: string): void {
    const g = this.add.graphics();
    g.setDepth(0);
    g.fillStyle(0x666666, 1);
    g.fillRoundedRect(x - 80, y - 70, 160, 140, 4);
    g.lineStyle(1, 0x888888, 1);
    g.strokeRoundedRect(x - 80, y - 70, 160, 140, 4);

    this.add.text(x, y - 85, `PANEL ${letter}`, { fontSize: '14px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);

    // 24 jacks (showing 8 visible in 2x4 grid)
    const cols = 4;
    const rows = 2;
    const spacingX = 30;
    const spacingY = 35;
    const startX = x - 55;
    const startY = y - 55;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col + 1;
        if (i > 8) break; // Show first 8 of 24

        const px = startX + col * spacingX;
        const py = startY + row * spacingY;

        const portZone = this.add.zone(px, py, 24, 24);
        portZone.setRectangleDropZone(24, 24);
        const jackName = `${letter}${i}`;
        portZone.setData({ deviceId: role, portName: jackName, type: 'patch' });
        this.setupPortZone(portZone, role, jackName, 'patch', px, py);
        this.portZones.set(`${role}:${jackName}`, portZone);

        this.add.text(px, py - 16, jackName, { fontSize: '9px', color: '#aaa', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);
      }
    }

    // Note about more jacks
    this.add.text(x, y + 55, '+16 más...', { fontSize: '10px', color: '#666', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);

    this.deviceGraphics.set(role + '-panel', g);
  }

  private setupPortZone(zone: PhaserZone, deviceId: string, portName: string, portType: 'ethernet' | 'patch' | 'usb', x: number, y: number): void {
    const portInfo: PortInfo = { deviceId, portName, portType, zone, x, y };
    this.portInfoMap.set(`${deviceId}:${portName}`, portInfo);

    zone.on('pointerdown', (pointer: PhaserPointer) => {
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) return;
      this.startCable(portInfo);
    });

    zone.on('pointerover', () => {
      if (!this.cableInProgress) {
        this.input.setDefaultCursor('pointer');
        zone.setAlpha(0.7);
      }
      this.hoveredPort = portInfo;
    });

    zone.on('pointerout', () => {
      if (!this.cableInProgress) {
        this.input.setDefaultCursor('default');
      }
      zone.setAlpha(1);
      if (this.hoveredPort === portInfo) this.hoveredPort = null;
    });
  }

  private startCable(portInfo: PortInfo): void {
    if (this.isPortOccupied(portInfo)) {
      this.showPortError(portInfo, 'Puerto ocupado');
      return;
    }

    if (!this.canConnectPortType(portInfo.portType, this.selectedCableType)) {
      this.showPortError(portInfo, `Tipo ${this.selectedCableType} no válido para ${portInfo.portType}`);
      return;
    }

    this.cableInProgress = {
      type: this.selectedCableType,
      startPort: portInfo,
      currentPos: { x: portInfo.x, y: portInfo.y },
      graphics: this.previewGraphics,
    };

    this.input.setDefaultCursor('crosshair');
    portInfo.zone.setAlpha(0.5);
  }

  private canConnectPortType(portType: string, cableType: string): boolean {
    if (cableType === 'usbEthernet') {
      return portType === 'patch' || portType === 'usb';
    }
    if (cableType === 'straight') {
      return portType === 'ethernet' || portType === 'patch';
    }
    if (cableType === 'crossover') {
      return portType === 'ethernet' || portType === 'patch';
    }
    return false;
  }

  private tryCompleteCable(worldX: number, worldY: number): void {
    if (!this.cableInProgress) return;

    const endPort = this.getPortAtPosition(worldX, worldY);

    if (endPort && endPort !== this.cableInProgress.startPort) {
      if (this.isPortOccupied(endPort)) {
        this.showPortError(endPort, 'Puerto ocupado');
        this.cancelCable();
        return;
      }

      if (!this.canConnectPortType(endPort.portType, this.cableInProgress.type)) {
        this.showPortError(endPort, `Tipo ${this.cableInProgress.type} no válido`);
        this.cancelCable();
        return;
      }

      if (!this.validateCableType(this.cableInProgress.startPort, endPort, this.cableInProgress.type)) {
        this.showPortError(endPort, `Cable ${this.cableInProgress.type} incorrecto para esta conexión`);
        this.cancelCable();
        return;
      }

      const cableId = `cable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const seated = Math.random() > 0.02;

      const cable: Cable = {
        id: cableId,
        type: this.cableInProgress.type,
        endA: {
          deviceId: {
            type: this.getDeviceType(this.cableInProgress.startPort.deviceId) as 'router' | 'switch' | 'pc' | 'patch-panel',
            logicalRole: this.cableInProgress.startPort.deviceId,
            physicalLabel: this.getPhysicalLabel(this.cableInProgress.startPort.deviceId)
          },
          portName: this.cableInProgress.startPort.portName,
        },
        endB: {
          deviceId: {
            type: this.getDeviceType(endPort.deviceId) as 'router' | 'switch' | 'pc' | 'patch-panel',
            logicalRole: endPort.deviceId,
            physicalLabel: this.getPhysicalLabel(endPort.deviceId)
          },
          portName: endPort.portName,
        },
        color: this.getCableColor(this.cableInProgress.type),
        seated,
      };

      this.markPortOccupied(this.cableInProgress.startPort, true);
      this.markPortOccupied(endPort, true);

      this.onCableAdd(cable);
      if (!seated) {
        setTimeout(() => {
          this.onCableSeated(cableId, true);
        }, 500);
      }

      this._onCableDrop(
        this.cableInProgress.type,
        this.cableInProgress.startPort.deviceId,
        this.cableInProgress.startPort.portName,
        endPort.deviceId,
        endPort.portName
      );
    }

    this.cancelCable();
  }

  private validateCableType(portA: PortInfo, portB: PortInfo, cableType: string): boolean {
    const deviceTypeA = this.getDeviceType(portA.deviceId);
    const deviceTypeB = this.getDeviceType(portB.deviceId);

    if (cableType === 'usbEthernet') {
      return (deviceTypeA === 'pc' && deviceTypeB === 'patch' && portA.portName === 'USB') ||
             (deviceTypeA === 'patch' && deviceTypeB === 'pc' && portB.portName === 'USB');
    }

    if (cableType === 'straight') {
      // PC NIC ↔ Patch Panel (different types)
      return (deviceTypeA === 'pc' && deviceTypeB === 'patch' && portA.portName === 'NIC') ||
             (deviceTypeA === 'patch' && deviceTypeB === 'pc' && portB.portName === 'NIC');
    }

    if (cableType === 'crossover') {
      // Not used in PC cable view (same device types not present)
      return false;
    }

    return false;
  }

  private getDeviceType(deviceId: string): 'pc' | 'switch' | 'router' | 'patch' | 'unknown' {
    if (deviceId.startsWith('PC-')) return 'pc';
    if (deviceId.startsWith('PP-')) return 'patch';
    return 'unknown';
  }

  private getPhysicalLabel(logicalRole: string): string {
    if (!this.physicalAssignment) return logicalRole;

    if (logicalRole.startsWith('PC-')) {
      return this.physicalAssignment.pcRoles[logicalRole as keyof typeof this.physicalAssignment.pcRoles] || logicalRole;
    }
    if (logicalRole.startsWith('PP-')) {
      return logicalRole;
    }
    return logicalRole;
  }

  private getCableColor(type: string): string {
    const colors: Record<string, string> = {
      straight: '#00ff00',
      crossover: '#ff8800',
      usbEthernet: '#00ffff',
    };
    return colors[type] || '#ffffff';
  }

  private getPortAtPosition(x: number, y: number): PortInfo | null {
    for (const [, portInfo] of this.portInfoMap) {
      const zone = portInfo.zone;
      if (x >= zone.x - zone.width / 2 && x <= zone.x + zone.width / 2 &&
          y >= zone.y - zone.height / 2 && y <= zone.y + zone.height / 2) {
        return portInfo;
      }
    }
    return null;
  }

  private cancelCable(): void {
    if (this.cableInProgress) {
      this.cableInProgress.startPort.zone.setAlpha(1);
      this.cableInProgress = null;
      this.previewGraphics.clear();
      this.input.setDefaultCursor('default');
    }
  }

  private showPortError(portInfo: PortInfo, message: string): void {
    portInfo.zone.setAlpha(0.3);

    const errorText = this.add.text(portInfo.x, portInfo.y - 40, message, {
      fontSize: '12px',
      color: '#ff4444',
      fontFamily: 'monospace',
      backgroundColor: '#1a1a2e',
      padding: { x: 6, y: 2 },
    }).setOrigin(0.5).setDepth(20);

    this.time.delayedCall(1500, () => {
      portInfo.zone.setAlpha(1);
      errorText.destroy();
    });
  }

  private renderCablePreview(): void {
    if (!this.cableInProgress) return;

    this.previewGraphics.clear();

    const start = this.cableInProgress.startPort;
    const end = this.cableInProgress.currentPos;

    const colors: Record<string, number> = {
      straight: 0x00ff00,
      crossover: 0xff8800,
      usbEthernet: 0x00ffff,
    };

    const color = colors[this.cableInProgress.type] || 0xffffff;

    this.previewGraphics.lineStyle(3, color, 0.6);
    this.previewGraphics.beginPath();
    this.previewGraphics.moveTo(start.x, start.y);

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2 - 50;
    const segments = 10;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * midX + t * t * end.x;
      const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * midY + t * t * end.y;
      this.previewGraphics.lineTo(x, y);
    }
    this.previewGraphics.strokePath();

    this.previewGraphics.fillStyle(color, 0.6);
    this.previewGraphics.fillCircle(end.x, end.y, 8);
  }

  private renderCables(): void {
    this.cableGraphics.clear();
    this.cableHitAreas = [];

    if (!this.cables || this.cables.length === 0) return;

    this.cables.forEach(cable => {
      if (!cable.endA || !cable.endB) return;

      const posA = this.getPortPosition(cable.endA);
      const posB = this.getPortPosition(cable.endB);

      if (!posA || !posB) return;

      const colorNum = Phaser.Display.Color.HexStringToColor(this.getCableColor(cable.type)).color;

      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2 - 50;
      const segments = 10;
      const points: { x: number; y: number }[] = [{ x: posA.x, y: posA.y }];
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const x = (1 - t) * (1 - t) * posA.x + 2 * (1 - t) * t * midX + t * t * posB.x;
        const y = (1 - t) * (1 - t) * posA.y + 2 * (1 - t) * t * midY + t * t * posB.y;
        points.push({ x, y });
      }

      this.cableGraphics.lineStyle(5, colorNum, cable.seated ? 1 : 0.4);
      this.cableGraphics.beginPath();
      this.cableGraphics.moveTo(posA.x, posA.y);
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const x = (1 - t) * (1 - t) * posA.x + 2 * (1 - t) * t * midX + t * t * posB.x;
        const y = (1 - t) * (1 - t) * posA.y + 2 * (1 - t) * t * midY + t * t * posB.y;
        this.cableGraphics.lineTo(x, y);
      }
      this.cableGraphics.strokePath();

      if (cable.seated) {
        this.cableGraphics.fillStyle(0x00ff00, 1);
        this.cableGraphics.fillCircle(midX, midY, 8);
      } else {
        this.cableGraphics.fillStyle(0xff0000, 1);
        this.cableGraphics.fillCircle(midX, midY, 8);
      }

      this.cableHitAreas.push({ cable, graphics: this.cableGraphics, points });
    });
  }

  private getPortPosition(port: { deviceId: { logicalRole: string }; portName: string }): { x: number; y: number } | null {
    const key = `${port.deviceId.logicalRole}:${port.portName}`;
    const portInfo = this.portInfoMap.get(key);
    if (portInfo) return { x: portInfo.x, y: portInfo.y };
    return null;
  }

  private getCableAtPosition(x: number, y: number): Cable | null {
    for (const hitArea of this.cableHitAreas) {
      for (let i = 0; i < hitArea.points.length - 1; i++) {
        const p1 = hitArea.points[i];
        const p2 = hitArea.points[i + 1];
        const dist = this.distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        if (dist < 12) return hitArea.cable;
      }
    }
    return null;
  }

  private distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private removeCable(cableId: string): void {
    const cableIndex = this.cables.findIndex(c => c.id === cableId);
    if (cableIndex === -1) return;

    const cable = this.cables[cableIndex];

    if (cable.endA) {
      const keyA = `${cable.endA.deviceId.logicalRole}:${cable.endA.portName}`;
      this.occupiedPorts.delete(keyA);
    }
    if (cable.endB) {
      const keyB = `${cable.endB.deviceId.logicalRole}:${cable.endB.portName}`;
      this.occupiedPorts.delete(keyB);
    }

    this.cables.splice(cableIndex, 1);
    this.onCableRemove(cableId);
    this.renderCables();
  }

  private renderCableTypeSelector(): void {
    const old = this.children.getByName('cableTypeSelector');
    if (old) old.destroy();

    // Only 2 cable types in PC cable view
    const cableTypes = [
      { type: 'straight' as const, label: 'RECTO (1) - NIC ↔ Parrilla', color: 0x00ff00 },
      { type: 'usbEthernet' as const, label: 'USB-ETH (2) - USB ↔ Parrilla', color: 0x00ffff },
    ];

    const selected = cableTypes.find(c => c.type === this.selectedCableType) || cableTypes[0];

    const container = this.add.container(600, 750);
    container.setName('cableTypeSelector');
    container.setScrollFactor(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1117, 0.95);
    bg.fillRoundedRect(-220, -25, 440, 55, 8);
    bg.lineStyle(2, selected.color, 1);
    bg.strokeRoundedRect(-220, -25, 440, 55, 8);

    const text = this.add.text(0, -12, `Cable: ${selected.label}`, {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const hint = this.add.text(0, 12, '1=Recto (NIC↔Parrilla)  2=USB-ETH (USB↔Parrilla)  |  Click PC → Terminal  |  Backspace=Volver', {
      fontSize: '10px',
      color: '#888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    container.add([bg, text, hint]);
  }
}