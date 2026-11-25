/**
 * Phaser 4 Scene for the cage/jaula view.
 * H1: Cable connection system with drag-drop, patch panels, validation.
 */

import Phaser from 'phaser';
import type { PhysicalAssignment, Cable, PatchTermination } from '@core/types';
import { getRouterPortNames } from '@core/scenario';

interface CageSceneData {
  physicalAssignment: PhysicalAssignment;
  cables: Cable[];
  onPortClick: (deviceId: string, portName: string) => void;
  onCableDrop: (cableType: string, fromDevice: string, fromPort: string, toDevice: string, toPort: string) => void;
  onCableAdd: (cable: Cable) => void;
  onCableRemove: (cableId: string) => void;
  onCableSeated: (cableId: string, seated: boolean) => void;
}

// Type aliases for Phaser 4 internal types
type PhaserGraphics = any;
type PhaserZone = any;
type PhaserPointer = any;

interface PortInfo {
  deviceId: string;
  portName: string;
  portType: 'ethernet' | 'console' | 'patch' | 'usb';
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

export class CageScene extends Phaser.Scene {
  private physicalAssignment!: PhysicalAssignment;
  private cables: Cable[] = [];
  private patchTerminations: PatchTermination[] = [];

  // Callbacks
  private onPortClick!: (deviceId: string, portName: string) => void;
  private _onCableDrop!: (cableType: string, fromDevice: string, fromPort: string, toDevice: string, toPort: string) => void;
  private onCableAdd!: (cable: Cable) => void;
  private onCableRemove!: (cableId: string) => void;
  private onCableSeated!: (cableId: string, seated: boolean) => void;

  private deviceGraphics: Map<string, PhaserGraphics> = new Map();
  private portZones: Map<string, PhaserZone> = new Map();
  private portInfoMap: Map<string, PortInfo> = new Map();
  private cableGraphics!: PhaserGraphics;
  private previewGraphics!: PhaserGraphics;

  // Cable connection state
  private cableInProgress: CableInProgress | null = null;
  private selectedCableType: 'straight' | 'crossover' | 'usbEthernet' = 'straight';
  private hoveredPort: PortInfo | null = null;

  // Port occupation tracking
  private occupiedPorts: Set<string> = new Set();

  constructor() {
    super({ key: 'CageScene' });
  }

  init(data: CageSceneData): void {
    this.physicalAssignment = data.physicalAssignment;
    this.cables = data.cables || [];
    this.patchTerminations = data.physicalAssignment?.patchTerminations || [];
    this.onPortClick = data.onPortClick;
    this._onCableDrop = data.onCableDrop;
    this.onCableAdd = data.onCableAdd;
    this.onCableRemove = data.onCableRemove;
    this.onCableSeated = data.onCableSeated;
    this.rebuildOccupiedPorts();
  }

  create(): void {
    // Create preview graphics first
    this.previewGraphics = this.add.graphics({ x: 0, y: 0 });

    // Set up camera for zoom/pan - simple version without smooth interpolation
    const camera = this.cameras.main;
    camera.setBounds(0, 0, 1600, 1000);

    // Render cage and devices FIRST
    this.renderCage();
    if (this.physicalAssignment) {
      this.renderDevices();
    }

    // Create cable graphics LAST so cables render ON TOP of devices
    this.cableGraphics = this.add.graphics({ x: 0, y: 0 });
    if (this.physicalAssignment) {
      this.renderCables();
    }

    // Simple pan state
    let isPanning = false;
    let lastPointerX = 0;
    let lastPointerY = 0;

    // Zoom with wheel (clamped, no smooth lerp)
    this.input.on('wheel', (_pointer: PhaserPointer, _: unknown, _dx: number, dy: number) => {
      const zoomFactor = dy > 0 ? 1.1 : 1 / 1.1;
      camera.zoom = Phaser.Math.Clamp(camera.zoom * zoomFactor, 0.5, 2);
    });

    // Pan with right-click drag or middle mouse
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

      // Update cable preview position
      if (this.cableInProgress) {
        this.cableInProgress.currentPos = { x: pointer.worldX, y: pointer.worldY };
        this.renderCablePreview();
      }

      // Check hover for port highlighting
      this.checkPortHover(pointer.worldX, pointer.worldY);
    });

    // Context menu prevention for right-click pan
    this.game.canvas.addEventListener('contextmenu', (e: Event) => e.preventDefault());

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-PLUS', () => { camera.zoom = Phaser.Math.Clamp(camera.zoom * 1.2, 0.5, 2); });
    this.input.keyboard?.on('keydown-MINUS', () => { camera.zoom = Phaser.Math.Clamp(camera.zoom / 1.2, 0.5, 2); });
    this.input.keyboard?.on('keydown-ZERO', () => { camera.zoom = 1; camera.scrollX = 0; camera.scrollY = 0; });
    this.input.keyboard?.on('keydown-LEFT', () => { camera.scrollX -= 50 / camera.zoom; });
    this.input.keyboard?.on('keydown-RIGHT', () => { camera.scrollX += 50 / camera.zoom; });
    this.input.keyboard?.on('keydown-UP', () => { camera.scrollY -= 50 / camera.zoom; });
    this.input.keyboard?.on('keydown-DOWN', () => { camera.scrollY += 50 / camera.zoom; });

    // Cable type shortcuts: 1=straight, 2=crossover, 3=console
    this.input.keyboard?.on('keydown-ONE', () => { this.setCableType('straight'); });
    this.input.keyboard?.on('keydown-TWO', () => { this.setCableType('crossover'); });
    this.input.keyboard?.on('keydown-THREE', () => { this.setCableType('usbEthernet'); });

    // Escape to cancel cable
    this.input.keyboard?.on('keydown-ESC', () => { this.cancelCable(); });

    // Global pointerup to complete cable connection
    this.input.on('pointerup', (pointer: PhaserPointer) => {
      if (this.cableInProgress) {
        this.tryCompleteCable(pointer.worldX, pointer.worldY);
      }
    });

    // Always render cage background
    this.renderCage();
    // Render devices/cables only if data is available
    if (this.physicalAssignment) {
      this.renderDevices();
      this.renderCables();
    }

    // Render cable type indicator
    this.renderCableTypeIndicator();
  }

  private checkPortHover(x: number, y: number): void {
    // Check if mouse is over a port zone for visual feedback
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

  // Update data from React store
  updateData(data: Partial<CageSceneData>): void {
    if (data.physicalAssignment) this.physicalAssignment = data.physicalAssignment;
    if (data.cables) {
      this.cables = data.cables;
      this.rebuildOccupiedPorts();
    }
    this.renderCage();
    if (this.physicalAssignment) {
      this.renderDevices();
      this.renderCables();
    }
    this.renderCableTypeIndicator();
  }

  setCableType(type: 'straight' | 'crossover' | 'usbEthernet'): void {
    this.selectedCableType = type;
    this.renderCableTypeIndicator();
  }

  // Rebuild occupied ports set from current cables
  private rebuildOccupiedPorts(): void {
    this.occupiedPorts.clear();
    this.cables.forEach(cable => {
      if (cable.endA) {
        // Convert Cable.PortId to PortInfo key format
        const key = `${cable.endA.deviceId.logicalRole}:${cable.endA.portName}`;
        this.occupiedPorts.add(key);
      }
      if (cable.endB) {
        const key = `${cable.endB.deviceId.logicalRole}:${cable.endB.portName}`;
        this.occupiedPorts.add(key);
      }
    });
  }

  private getPortKey(port: { deviceId: { logicalRole: string; physicalLabel: string }; portName: string }): string {
    return `${port.deviceId.logicalRole}:${port.deviceId.physicalLabel}:${port.portName}`;
  }

  private getPortInfoKey(port: PortInfo): string {
    return `${port.deviceId}:${port.portName}`;
  }

  private isPortOccupied(port: PortInfo): boolean {
    return this.occupiedPorts.has(this.getPortInfoKey(port));
  }

  private markPortOccupied(port: PortInfo, occupied: boolean): void {
    const key = this.getPortInfoKey(port);
    if (occupied) {
      this.occupiedPorts.add(key);
    } else {
      this.occupiedPorts.delete(key);
    }
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
    this.add.text(800, 50, 'JAULA DE RED - TOPOLOGÍA 1', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private renderDevices(): void {
    if (!this.physicalAssignment?.pcRoles || !this.physicalAssignment?.routerRoles || !this.physicalAssignment?.switchIds) {
      return;
    }

    // Clear existing device graphics
    this.deviceGraphics.forEach(g => g.destroy());
    this.deviceGraphics.clear();
    this.portZones.forEach(z => z.destroy());
    this.portZones.clear();
    this.portInfoMap.clear();

    const { pcRoles, routerRoles, switchIds } = this.physicalAssignment;

    // Render Switch (center)
    this.renderSwitch(switchIds[0], 800, 450);

    // Render Routers (right side, inside cage)
    const routerPositions = [
      { role: 'R1', x: 1100, y: 200 },
      { role: 'R2', x: 1100, y: 450 },
      { role: 'R3', x: 1100, y: 700 },
    ];

    routerPositions.forEach(({ role, x, y }) => {
      const physicalId = routerRoles[role as keyof typeof routerRoles];
      this.renderRouter(role, physicalId, x, y);
    });

    // Render Patch Panels (left side, inside cage area)
    this.renderPatchPanel('PP-1', pcRoles['PC-1'], 300, 200);
    this.renderPatchPanel('PP-2', pcRoles['PC-2'], 300, 700);
  }

  private renderPC(role: string, physicalId: string, x: number, y: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x4444aa, 1);
    g.fillRoundedRect(x - 60, y - 40, 120, 80, 8);
    g.lineStyle(2, 0x6666cc, 1);
    g.strokeRoundedRect(x - 60, y - 40, 120, 80, 8);

    this.add.text(x, y - 15, role, { fontSize: '16px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);
    this.add.text(x, y + 10, physicalId, { fontSize: '12px', color: '#aaa', fontFamily: 'monospace' }).setOrigin(0.5);

    // NIC port (right side)
    const nicZone = this.add.zone(x + 60, y - 15, 20, 20);
    nicZone.setRectangleDropZone(20, 20);
    nicZone.setData({ deviceId: role, portName: 'NIC', type: 'ethernet' });
    this.setupPortZone(nicZone, role, 'NIC', 'ethernet', x + 60, y - 15);
    this.portZones.set(`${role}:NIC`, nicZone);
    this.add.text(x + 60, y - 35, 'NIC', { fontSize: '8px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5);

    // USB port (for console cable, right side below NIC)
    const usbZone = this.add.zone(x + 60, y + 15, 20, 20);
    usbZone.setRectangleDropZone(20, 20);
    usbZone.setData({ deviceId: role, portName: 'USB', type: 'usb' });
    this.setupPortZone(usbZone, role, 'USB', 'usb', x + 60, y + 15);
    this.portZones.set(`${role}:USB`, usbZone);
    this.add.text(x + 60, y + 35, 'USB', { fontSize: '8px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5);

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

    // 24 visible ports (representing 24/48)
    for (let i = 0; i < 24; i++) {
      const px = x - 115 + i * 10;
      const portZone = this.add.zone(px, y + 30, 10, 15);
      portZone.setRectangleDropZone(10, 15);
      portZone.setData({ deviceId: 'SW', portName: `Eth${i + 1}`, type: 'ethernet' });
      this.setupPortZone(portZone, 'SW', `Eth${i + 1}`, 'ethernet', px, y + 30);
      this.portZones.set(`SW:Eth${i + 1}`, portZone);

      // Port number label (every 5th)
      if ((i + 1) % 5 === 0) {
        this.add.text(px, y + 50, `${i + 1}`, { fontSize: '7px', color: '#666', fontFamily: 'monospace' }).setOrigin(0.5);
      }
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

    // Get port names based on physical router series
    const portNames = getRouterPortNames(physicalId);

    // WAN port (left)
    const wanZone = this.add.zone(x - 80, y - 10, 20, 20);
    wanZone.setRectangleDropZone(20, 20);
    wanZone.setData({ deviceId: role, portName: portNames.wan, type: 'ethernet' });
    this.setupPortZone(wanZone, role, portNames.wan, 'ethernet', x - 80, y - 10);
    this.portZones.set(`${role}:${portNames.wan}`, wanZone);
    this.add.text(x - 80, y - 30, portNames.wan, { fontSize: '9px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5);

    // LAN port (right)
    const lanZone = this.add.zone(x + 80, y - 10, 20, 20);
    lanZone.setRectangleDropZone(20, 20);
    lanZone.setData({ deviceId: role, portName: portNames.lan, type: 'ethernet' });
    this.setupPortZone(lanZone, role, portNames.lan, 'ethernet', x + 80, y - 10);
    this.portZones.set(`${role}:${portNames.lan}`, lanZone);
    this.add.text(x + 80, y - 30, portNames.lan, { fontSize: '9px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5);

    // Console port (bottom)
    const consoleZone = this.add.zone(x, y + 35, 20, 20);
    consoleZone.setRectangleDropZone(20, 20);
    consoleZone.setData({ deviceId: role, portName: 'Console', type: 'console' });
    this.setupPortZone(consoleZone, role, 'Console', 'console', x, y + 35);
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

    // Determine patch panel letter from physical assignment
    const terminations = this.patchTerminations.filter(t => t.stationId === physicalId);
    const letter = terminations.length > 0 ? terminations[0].deskJackId.charAt(0) :
                   (physicalId === this.physicalAssignment.pcRoles['PC-1'] ? 'A' : 'B');

    this.add.text(x, y - 75, `PANEL ${letter}`, { fontSize: '12px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);

    // 24 jacks per panel (A1-A24 or B1-B24, etc.)
    const cols = 6;
    const rows = 4;
    const spacingX = 24;
    const spacingY = 26;
    const startX = x - 65;
    const startY = y - 45;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col + 1;
        if (i > 24) break;

        const px = startX + col * spacingX;
        const py = startY + row * spacingY;

        const portZone = this.add.zone(px, py, 20, 22);
        portZone.setRectangleDropZone(20, 22);
        const jackName = `${letter}${i}`;
        portZone.setData({ deviceId: role, portName: jackName, type: 'patch' });
        this.setupPortZone(portZone, role, jackName, 'patch', px, py);
        this.portZones.set(`${role}:${jackName}`, portZone);

        this.add.text(px, py - 14, jackName, { fontSize: '8px', color: '#aaa', fontFamily: 'monospace' }).setOrigin(0.5);
      }
    }

    this.deviceGraphics.set(role + '-panel', g);
  }

  private setupPortZone(zone: PhaserZone, deviceId: string, portName: string, portType: 'ethernet' | 'console' | 'patch' | 'usb', x: number, y: number): void {
    const portInfo: PortInfo = { deviceId, portName, portType, zone, x, y };
    this.portInfoMap.set(`${deviceId}:${portName}`, portInfo);

    zone.on('pointerdown', (pointer: PhaserPointer) => {
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) return; // Pan takes priority
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
    // Check if port is already occupied
    if (this.isPortOccupied(portInfo)) {
      // Show error feedback
      this.showPortError(portInfo, 'Puerto ocupado');
      return;
    }

    // Validate cable type compatibility
    if (!this.canConnectPortType(portInfo.portType, this.selectedCableType)) {
      this.showPortError(portInfo, `Tipo ${this.selectedCableType} no válido para ${portInfo.portType}`);
      return;
    }

    // Start cable connection
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
      return portType === 'patch' || portType === 'usb'; // USB-Ethernet: PC USB -> patch panel
    }
    if (cableType === 'straight' || cableType === 'crossover') {
      return portType === 'ethernet' || portType === 'patch'; // RJ45 cables connect ethernet or patch
    }
    return false;
  }

  private tryCompleteCable(worldX: number, worldY: number): void {
    if (!this.cableInProgress) return;

    // Find port under cursor
    const endPort = this.getPortAtPosition(worldX, worldY);

    if (endPort && endPort !== this.cableInProgress.startPort) {
      // Validate end port
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

      // Validate cable type for the connection (straight vs crossover)
      if (!this.validateCableType(this.cableInProgress.startPort, endPort, this.cableInProgress.type)) {
        this.showPortError(endPort, `Cable ${this.cableInProgress.type} incorrecto para esta conexión`);
        this.cancelCable();
        return;
      }

      // Create cable
      const cableId = `cable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Determine seated state (2% failure rate)
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

      // Mark ports as occupied
      this.markPortOccupied(this.cableInProgress.startPort, true);
      this.markPortOccupied(endPort, true);

      // Notify store
      this.onCableAdd(cable);
      if (!seated) {
        // Simulate re-seating after a moment (or user action)
        setTimeout(() => {
          this.onCableSeated(cableId, true);
        }, 500);
      }

      // Call drop callback for logging
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
    // Get device types for each port
    const deviceTypeA = this.getDeviceType(portA.deviceId);
    const deviceTypeB = this.getDeviceType(portB.deviceId);

    if (cableType === 'usbEthernet') {
      // USB-Ethernet: PC USB -> patch panel (first leg)
      // Second leg (patch -> router console) uses straight cable
      return (deviceTypeA === 'pc' && deviceTypeB === 'patch' && portA.portName === 'USB') ||
             (deviceTypeA === 'patch' && deviceTypeB === 'pc' && portB.portName === 'USB');
    }

    if (cableType === 'straight') {
      // Straight: different device types
      // Allow patch -> router console for console cable (second leg of console connection)
      if ((deviceTypeA === 'patch' && deviceTypeB === 'router' && portB.portName === 'Console') ||
          (deviceTypeA === 'router' && deviceTypeB === 'patch' && portA.portName === 'Console')) {
        return true;
      }
      // Allow switch <-> patch panel (both are different types in our model)
      if ((deviceTypeA === 'switch' && deviceTypeB === 'patch') ||
          (deviceTypeA === 'patch' && deviceTypeB === 'switch')) {
        return true;
      }
      return deviceTypeA !== deviceTypeB;
    }

    if (cableType === 'crossover') {
      // Crossover: same device types (router-router)
      return deviceTypeA === 'router' && deviceTypeB === 'router';
    }

    return false;
  }

  private getDeviceType(deviceId: string): 'pc' | 'switch' | 'router' | 'patch' | 'unknown' {
    if (deviceId.startsWith('PC-')) return 'pc';
    if (deviceId === 'SW') return 'switch';
    if (deviceId.startsWith('R')) return 'router';
    if (deviceId.startsWith('PP-')) return 'patch';
    return 'unknown';
  }

  private getPhysicalLabel(logicalRole: string): string {
    if (!this.physicalAssignment) return logicalRole;

    if (logicalRole.startsWith('PC-')) {
      return this.physicalAssignment.pcRoles[logicalRole as keyof typeof this.physicalAssignment.pcRoles] || logicalRole;
    }
    if (logicalRole === 'SW') {
      return this.physicalAssignment.switchIds[0] || 'SW';
    }
    if (logicalRole.startsWith('R')) {
      return this.physicalAssignment.routerRoles[logicalRole as keyof typeof this.physicalAssignment.routerRoles] || logicalRole;
    }
    if (logicalRole.startsWith('PP-')) {
      return logicalRole; // Patch panel logical role
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
    // Visual feedback - flash port red
    const originalColor = portInfo.zone.getData('originalColor') || 0xffffff;
    portInfo.zone.setAlpha(0.3);

    const errorText = this.add.text(portInfo.x, portInfo.y - 30, message, {
      fontSize: '12px',
      color: '#ff4444',
      fontFamily: 'monospace',
      backgroundColor: '#1a1a2e',
      padding: { x: 6, y: 2 },
    }).setOrigin(0.5);

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

    // Color by cable type
    const colors: Record<string, number> = {
      straight: 0x00ff00,
      crossover: 0xff8800,
      usbEthernet: 0x00ffff,
    };

    const color = colors[this.cableInProgress.type] || 0xffffff;

    // Draw curved cable using line segments (Phaser 4 Graphics doesn't have quadraticCurveTo)
    this.previewGraphics.lineStyle(3, color, 0.6);
    this.previewGraphics.beginPath();
    this.previewGraphics.moveTo(start.x, start.y);

    // Simulate curve with multiple line segments
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2 - 50;
    const segments = 10;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      // Quadratic bezier formula
      const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * midX + t * t * end.x;
      const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * midY + t * t * end.y;
      this.previewGraphics.lineTo(x, y);
    }
    this.previewGraphics.strokePath();

    // End point indicator
    this.previewGraphics.fillStyle(color, 0.6);
    this.previewGraphics.fillCircle(end.x, end.y, 8);
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
      const colorNum = Phaser.Display.Color.HexStringToColor(this.getCableColor(cable.type)).color;

      // Draw curved cable using line segments (Phaser 4 Graphics doesn't have quadraticCurveTo)
      this.cableGraphics.lineStyle(3, colorNum, cable.seated ? 1 : 0.4);
      this.cableGraphics.beginPath();
      this.cableGraphics.moveTo(posA.x, posA.y);

      // Simulate curve with multiple line segments
      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2 - 50;
      const segments = 10;
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        // Quadratic bezier formula
        const x = (1 - t) * (1 - t) * posA.x + 2 * (1 - t) * t * midX + t * t * posB.x;
        const y = (1 - t) * (1 - t) * posA.y + 2 * (1 - t) * t * midY + t * t * posB.y;
        this.cableGraphics.lineTo(x, y);
      }
      this.cableGraphics.strokePath();

      // LED indicator at midpoint
      if (cable.seated) {
        this.cableGraphics.fillStyle(0x00ff00, 1);
        this.cableGraphics.fillCircle(midX, midY, 6);
      } else {
        this.cableGraphics.fillStyle(0xff0000, 1);
        this.cableGraphics.fillCircle(midX, midY, 6);
      }

      // Cable type label near midpoint
      const label = cable.type === 'straight' ? '●' : cable.type === 'crossover' ? '✕' : '⎋';
      this.cableGraphics.fillStyle(0xffffff, 0.8);
      this.cableGraphics.fillCircle(midX, midY - 18, 10);
      // Note: Phaser graphics can't render text easily, skip for now
    });
  }

  private getPortPosition(port: { deviceId: { logicalRole: string }; portName: string }): { x: number; y: number } | null {
    const key = `${port.deviceId.logicalRole}:${port.portName}`;
    const portInfo = this.portInfoMap.get(key);
    if (portInfo) {
      return { x: portInfo.x, y: portInfo.y };
    }
    return null;
  }

  private renderCableTypeIndicator(): void {
    // Remove old indicator
    const old = this.children.getByName('cableTypeIndicator');
    if (old) old.destroy();

    const labels: Record<string, string> = {
      straight: 'RECTO (1)',
      crossover: 'CRUZADO (2)',
      usbEthernet: 'USB-ETH (3)',
    };

    const colors: Record<string, number> = {
      straight: 0x00ff00,
      crossover: 0xff8800,
      usbEthernet: 0x00ffff,
    };

    const indicator = this.add.container(20, 20);
    indicator.setName('cableTypeIndicator');

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1117, 0.9);
    bg.fillRoundedRect(-5, -5, 160, 30, 6);
    bg.lineStyle(2, colors[this.selectedCableType], 1);
    bg.strokeRoundedRect(-5, -5, 160, 30, 6);

    const text = this.add.text(75, 10, `Cable: ${labels[this.selectedCableType]}`, {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    indicator.add([bg, text]);
    indicator.setScrollFactor(0); // Fixed to camera
  }
}