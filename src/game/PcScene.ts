/**
 * PcScene - PC cable view for LAB phase.
 * Shows one PC (NIC + USB) + its patch panel (24 ports).
 * Click on screen opens terminal.
 */

import Phaser from 'phaser';
import { BaseLabScene, PortInfo } from './BaseLabScene';
import { gameStore, dispatch } from '@app/store';
import { panelLetterOf } from '@core/scenario';
import type { PhysicalAssignment, PcId } from '@core/types';

// Phaser 4 type aliases - using any to avoid namespace issues
type PhaserPointer = any;

export class PcScene extends BaseLabScene {
  constructor() {
    super('PcScene');
  }

  protected buildLayout() {
    const pa = this.state.physicalAssignment;
    if (!pa) return;

    const pc = this.state.activePc; // 'PC-1' | 'PC-2'
    const pp = pc === 'PC-1' ? 'PP-1' : 'PP-2';
    const letter = panelLetterOf(pc, pa);

    const W = this.scale.width;
    const H = this.scale.height;

    // 1) Screen area (large rectangle on left) - click opens terminal
    const screen = {
      x: W * 0.06,
      y: H * 0.05,
      w: W * 0.52,
      h: H * 0.60,
    };

    // Screen background
    this.addDeviceBox(screen.x, screen.y, screen.w, screen.h, '', 0x0d1117);
    this.add.text(screen.x + screen.w / 2, screen.y + screen.h / 2 - 20, `${pc} — Pantalla`, {
      fontSize: '18px',
      color: '#00d9a5',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(1);

    this.add.text(screen.x + screen.w / 2, screen.y + screen.h / 2 + 20, 'Clic para abrir terminal', {
      fontSize: '12px',
      color: '#888',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(1);

    // Screen click zone for terminal
    const screenZone = this.add.zone(screen.x + screen.w / 2, screen.y + screen.h / 2, screen.w, screen.h);
    screenZone.setRectangleDropZone(screen.w, screen.h);
    screenZone.setInteractive({ useHandCursor: true });
    screenZone.on('pointerdown', (pointer: PhaserPointer) => {
      if (pointer.leftButtonDown()) {
        dispatch.openTerminal();
      }
    });

    // 2) Port strip below screen: NIC (left) and USB (right)
    const strip = {
      x: screen.x,
      y: screen.y + screen.h + H * 0.04,
      w: screen.w,
      h: H * 0.16,
    };

    // NIC port
    this.addPort({
      deviceId: pc,
      portName: 'NIC',
      portType: 'ethernet',
      x: strip.x + strip.w * 0.25,
      y: strip.y + strip.h / 2,
    });

    // NIC label
    this.add.text(strip.x + strip.w * 0.25, strip.y - 20, 'NIC', {
      fontSize: '12px',
      color: '#00d9a5',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(1);

    // USB port
    this.addPort({
      deviceId: pc,
      portName: 'USB',
      portType: 'usb',
      x: strip.x + strip.w * 0.65,
      y: strip.y + strip.h / 2,
    });

    // USB label
    this.add.text(strip.x + strip.w * 0.65, strip.y - 20, 'USB', {
      fontSize: '12px',
      color: '#00ffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(1);

    // 3) Patch panel on right side
    const panel = {
      x: W * 0.66,
      y: H * 0.05,
      w: W * 0.30,
      h: H * 0.70,
    };

    this.addDeviceBox(panel.x, panel.y, panel.w, panel.h, `PANEL ${letter}`, 0x666666);
    this.add.text(panel.x + panel.w / 2, panel.y - 30, `PANEL ${letter} (${pc})`, {
      fontSize: '14px',
      color: '#fff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(1);

    // 24 jacks (6 cols × 4 rows)
    const cols = 6;
    const rows = 4;
    const spacingX = panel.w / (cols + 1);
    const spacingY = panel.h / (rows + 1);
    const startX = panel.x + spacingX;
    const startY = panel.y + spacingY;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col + 1;
        if (i > 24) break;

        const px = startX + col * spacingX;
        const py = startY + row * spacingY;
        const jackName = `${letter}${i}`;

        this.addPort({
          deviceId: pp,
          portName: jackName,
          portType: 'patch',
          x: px,
          y: py,
        });

        this.add.text(px, py - 16, jackName, {
          fontSize: '9px',
          color: '#aaa',
          fontFamily: 'monospace',
        }).setOrigin(0.5).setDepth(1);
      }
    }
  }
}