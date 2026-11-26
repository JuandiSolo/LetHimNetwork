/**
 * Tests for cable validation rules (core/cables.ts)
 */

import { describe, it, expect } from 'vitest';
import {
  kindOf,
  remainingCables,
  checkConnection,
} from '@core/cables';
import { panelLetterOf } from '@core/scenario';
import type { Cable, CableType, PhysicalAssignment } from '@core/types';
import { CABLE_INVENTORY_T1 } from '@core/scenario';

describe('kindOf', () => {
  it('returns pc for PC-1, PC-2', () => {
    expect(kindOf('PC-1')).toBe('pc');
    expect(kindOf('PC-2')).toBe('pc');
  });

  it('returns patch for PP-1, PP-2', () => {
    expect(kindOf('PP-1')).toBe('patch');
    expect(kindOf('PP-2')).toBe('patch');
  });

  it('returns switch for SW', () => {
    expect(kindOf('SW')).toBe('switch');
  });

  it('returns router for R1, R2, R3', () => {
    expect(kindOf('R1')).toBe('router');
    expect(kindOf('R2')).toBe('router');
    expect(kindOf('R3')).toBe('router');
  });
});

describe('remainingCables', () => {
  it('returns full inventory when no cables', () => {
    const result = remainingCables([]);
    expect(result).toEqual(CABLE_INVENTORY_T1);
  });

  it('decrements for each cable added', () => {
    const cables: Cable[] = [
      { id: '1', type: 'straight', endA: null, endB: null, color: '#fff', seated: true },
      { id: '2', type: 'straight', endA: null, endB: null, color: '#fff', seated: true },
      { id: '3', type: 'crossover', endA: null, endB: null, color: '#fff', seated: true },
    ];
    const result = remainingCables(cables);
    expect(result.straight).toBe(CABLE_INVENTORY_T1.straight - 2);
    expect(result.crossover).toBe(CABLE_INVENTORY_T1.crossover - 1);
    expect(result.usbEthernet).toBe(CABLE_INVENTORY_T1.usbEthernet);
  });
});

describe('checkConnection', () => {
  const pc1Nic = { deviceId: 'PC-1', portName: 'NIC' };
  const pc1Usb = { deviceId: 'PC-1', portName: 'USB' };
  const pp1 = { deviceId: 'PP-1', portName: 'E1' };
  const sw = { deviceId: 'SW', portName: '1' };
  const r1G0 = { deviceId: 'R1', portName: 'G0/0' };
  const r1G1 = { deviceId: 'R1', portName: 'G0/1' };
  const r1Console = { deviceId: 'R1', portName: 'Console' };
  const r2G0 = { deviceId: 'R2', portName: 'G0/0' };

  it('straight: PC.NIC ↔ Patch ok', () => {
    expect(checkConnection('straight', pc1Nic, pp1).ok).toBe(true);
  });

  it('straight: PC.USB ↔ Patch rejected', () => {
    expect(checkConnection('straight', pc1Usb, pp1).ok).toBe(false);
  });

  it('straight: Patch ↔ Switch ok', () => {
    expect(checkConnection('straight', pp1, sw).ok).toBe(true);
  });

  it('straight: Patch ↔ Router ok', () => {
    expect(checkConnection('straight', pp1, r1G0).ok).toBe(true);
  });

  it('straight: Switch ↔ Router ok', () => {
    expect(checkConnection('straight', sw, r1G0).ok).toBe(true);
  });

  it('straight: Patch ↔ Router.Console ok', () => {
    expect(checkConnection('straight', pp1, r1Console).ok).toBe(true);
  });

  it('straight: Router ↔ Router rejected', () => {
    expect(checkConnection('straight', r1G0, r2G0).ok).toBe(false);
  });

  it('crossover: Router ↔ Router ok', () => {
    expect(checkConnection('crossover', r1G0, r2G0).ok).toBe(true);
  });

  it('crossover: Router.Console ↔ Router rejected', () => {
    expect(checkConnection('crossover', r1Console, r2G0).ok).toBe(false);
  });

  it('crossover: Switch ↔ Router rejected', () => {
    expect(checkConnection('crossover', sw, r1G0).ok).toBe(false);
  });

  it('usbEthernet: PC.USB ↔ Patch ok', () => {
    expect(checkConnection('usbEthernet', pc1Usb, pp1).ok).toBe(true);
  });

  it('usbEthernet: PC.NIC ↔ Patch rejected', () => {
    expect(checkConnection('usbEthernet', pc1Nic, pp1).ok).toBe(false);
  });

  it('usbEthernet: Patch ↔ Switch rejected', () => {
    expect(checkConnection('usbEthernet', pp1, sw).ok).toBe(false);
  });

  it('same device rejected', () => {
    expect(checkConnection('straight', pc1Nic, pc1Usb).ok).toBe(false);
  });
});

describe('panelLetterOf', () => {
  const mockPA: PhysicalAssignment = {
    pcRoles: { 'PC-1': 'PC 5', 'PC-2': 'PC 2' },
    routerRoles: { R1: 'Router 1', R2: 'Router 2', R3: 'Router 3' },
    switchIds: ['SW 1'],
    patchTerminations: [],
  };

  it('returns correct letter for PC 5 (E)', () => {
    expect(panelLetterOf('PC-1', mockPA)).toBe('E');
  });

  it('returns correct letter for PC 2 (B)', () => {
    expect(panelLetterOf('PC-2', mockPA)).toBe('B');
  });

  it('cycles after H back to A', () => {
    const pa2: PhysicalAssignment = {
      ...mockPA,
      pcRoles: { 'PC-1': 'PC 9', 'PC-2': 'PC 2' },
    };
    expect(panelLetterOf('PC-1', pa2)).toBe('A');
  });
});