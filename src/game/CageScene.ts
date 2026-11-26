/**
 * CageScene - Jaula/rack view for LAB phase.
 * Extends BaseLabScene for shared cable logic.
 */

import Phaser from 'phaser';
import { BaseLabScene, PortInfo } from './BaseLabScene';
import { gameStore } from '@app/store';
import { getRouterPortNames, panelLetterOf } from '@core/scenario';
import type { PhysicalAssignment, Cable } from '@core/types';

// Phaser 4 type aliases - using any to avoid namespace issues
type PhaserCamera = any;
type PhaserPointer = any;

export class CageScene extends BaseLabScene {
  private camera: PhaserCamera;
  private isPanning = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  constructor() {
    super('CageScene');
  }

  create() {
    super.create();

    // Camera setup for zoom/pan
    this.camera = this.cameras.main;
    this.camera.setBounds(0, 0, 1600, 1000);

    // Zoom with wheel
    this.input.on('wheel', (_pointer: PhaserPointer, _: unknown, _dx: number, dy: number) => {
      const zoomFactor = dy > 0 ? 1.1 : 1 / 1.1;
      this.camera.zoom = Phaser.Math.Clamp(this.camera.zoom * zoomFactor, 0.5, 2);
    });

    // Pan with right-click drag or middle mouse - ONLY if not clicking on a cable
    this.input.on('pointerdown', (pointer: PhaserPointer) => {
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        // Check if clicking on a cable (base class method)
        const cable = this.findCableAt(pointer.x, pointer.y);
        if (cable) {
          // Let base class handle cable deletion, don't start pan
          return;
        }
        this.isPanning = true;
        this.lastPointerX = pointer.x;
        this.lastPointerY = pointer.y;
        this.input.setDefaultCursor('grabbing');
      }
    });

    this.input.on('pointerup', () => {
      this.isPanning = false;
      this.input.setDefaultCursor('default');
    });

    this.input.on('pointermove', (pointer: PhaserPointer) => {
      if (this.isPanning && (pointer.rightButtonDown() || pointer.middleButtonDown())) {
        const dx = (pointer.x - this.lastPointerX) / this.camera.zoom;
        const dy = (pointer.y - this.lastPointerY) / this.camera.zoom;
        this.camera.scrollX -= dx;
        this.camera.scrollY -= dy;
        this.lastPointerX = pointer.x;
        this.lastPointerY = pointer.y;
      }
    });

    // Keyboard shortcuts for camera
    this.input.keyboard?.on('keydown-PLUS', () => { this.camera.zoom = Phaser.Math.Clamp(this.camera.zoom * 1.2, 0.5, 2); });
    this.input.keyboard?.on('keydown-MINUS', () => { this.camera.zoom = Phaser.Math.Clamp(this.camera.zoom / 1.2, 0.5, 2); });
    this.input.keyboard?.on('keydown-ZERO', () => { this.camera.zoom = 1; this.camera.scrollX = 0; this.camera.scrollY = 0; });
    this.input.keyboard?.on('keydown-LEFT', () => { this.camera.scrollX -= 50 / this.camera.zoom; });
    this.input.keyboard?.on('keydown-RIGHT', () => { this.camera.scrollX += 50 / this.camera.zoom; });
    this.input.keyboard?.on('keydown-UP', () => { this.camera.scrollY -= 50 / this.camera.zoom; });
    this.input.keyboard?.on('keydown-DOWN', () => { this.camera.scrollY += 50 / this.camera.zoom; });

    // Context menu prevention for right-click pan
    this.game.canvas.addEventListener('contextmenu', (e: Event) => e.preventDefault());
  }

  protected getCurrentView(): 'cage' | 'pc' {
    return 'cage';
  }

  protected buildStaticLayout() {
    const pa = this.state.physicalAssignment;
    if (!pa) return;

    this.renderCageBackground();

    // Render Switch (center)
    this.renderSwitch(pa.switchIds[0], 800, 450);

    // Render Routers (right side, inside cage)
    const routerPositions = [
      { role: 'R1', x: 1100, y: 200 },
      { role: 'R2', x: 1100, y: 450 },
      { role: 'R3', x: 1100, y: 700 },
    ];

    routerPositions.forEach(({ role, x, y }) => {
      const physicalId = pa.routerRoles[role as keyof typeof pa.routerRoles];
      this.renderRouter(role, physicalId, x, y);
    });

    // Render Patch Panels (left side) - RACK face
    this.renderPatchPanel('PP-1', pa.pcRoles['PC-1'], 300, 200);
    this.renderPatchPanel('PP-2', pa.pcRoles['PC-2'], 300, 700);
  }

  private renderCageBackground() {
    // Background grid - lowest depth
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x333333, 0.3);
    graphics.setDepth(-10);
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
    cage.setDepth(-5);
    cage.strokeRect(100, 100, 1400, 800);

    // Label
    this.add.text(800, 50, 'JAULA DE RED - TOPOLOGÍA 1', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(-5);
  }

  private renderSwitch(physicalId: string, x: number, y: number) {
    this.addDeviceBox(x - 100, y - 30, 200, 60, 'SWITCH', 0x44aa44);
    this.add.text(x, y - 10, 'SWITCH', { fontSize: '14px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);
    this.add.text(x, y + 10, physicalId, { fontSize: '11px', color: '#aaa', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);

    // 24 visible ports
    for (let i = 0; i < 24; i++) {
      const px = x - 115 + i * 10;
      this.addPort({
        deviceId: 'SW',
        portName: `Eth${i + 1}`,
        portType: 'ethernet',
        x: px,
        y: y + 30,
      });

      // Port number label (every 5th)
      if ((i + 1) % 5 === 0) {
        this.add.text(px, y + 50, `${i + 1}`, { fontSize: '7px', color: '#666', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);
      }
    }
  }

  private renderRouter(role: string, physicalId: string, x: number, y: number) {
    this.addDeviceBox(x - 80, y - 35, 160, 70, role, 0xaa4444);
    this.add.text(x, y - 18, role, { fontSize: '16px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);
    this.add.text(x, y + 5, physicalId, { fontSize: '11px', color: '#aaa', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);

    const portNames = getRouterPortNames(physicalId);

    // WAN port (left)
    this.addPort({
      deviceId: role,
      portName: portNames.wan,
      portType: 'ethernet',
      x: x - 80,
      y: y - 10,
    });
    this.add.text(x - 80, y - 30, portNames.wan, { fontSize: '9px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);

    // LAN port (right)
    this.addPort({
      deviceId: role,
      portName: portNames.lan,
      portType: 'ethernet',
      x: x + 80,
      y: y - 10,
    });
    this.add.text(x + 80, y - 30, portNames.lan, { fontSize: '9px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);

    // Console port (bottom)
    this.addPort({
      deviceId: role,
      portName: 'Console',
      portType: 'console',
      x: x,
      y: y + 35,
    });
    this.add.text(x, y + 55, 'CON', { fontSize: '9px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);
  }

  private renderPatchPanel(role: string, physicalId: string, x: number, y: number) {
    const letter = panelLetterOf(role === 'PP-1' ? 'PC-1' : 'PC-2', this.state.physicalAssignment!);
    this.addDeviceBox(x - 80, y - 60, 160, 120, `PANEL ${letter}`, 0x666666);
    this.add.text(x, y - 75, `PANEL ${letter}`, { fontSize: '12px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);

    // 24 jacks per panel (6 cols × 4 rows)
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
        const jackName = `${letter}${i}`;

        this.addPort({
          deviceId: role,
          portName: jackName,
          portType: 'patch',
          x: px,
          y: py,
        });

        this.add.text(px, py - 14, jackName, { fontSize: '8px', color: '#aaa', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(1);
      }
    }
  }
}