/**
 * Cable validation rules - single source of truth for H1.
 * Pure TypeScript - no Phaser, React, or DOM dependencies.
 */

import type { Cable, CableType, PortId, PcId, PhysicalAssignment } from './types';
import { CABLE_INVENTORY_T1 } from './scenario';

export type DeviceKind = 'pc' | 'switch' | 'router' | 'patch';

export interface PortRef {
  deviceId: string;  // logical role: 'PC-1', 'PP-1', 'SW', 'R1', 'R2', 'R3'
  portName: string;  // 'NIC', 'USB', 'Console', 'G0/0', 'E1'...
}

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

/**
 * Validates if a cable connection is allowed.
 * Rules per H1 spec:
 * - straight: PC↔Patch, Patch↔Switch, Patch↔Router, Switch↔Router, Patch↔Router(Console)
 * - crossover: Router↔Router (not Console)
 * - usbEthernet: PC.USB↔Patch only
 */
export function checkConnection(type: CableType, a: PortRef, b: PortRef): Check {
  if (a.deviceId === b.deviceId) return no('Mismo equipo');

  const ka = kindOf(a.deviceId);
  const kb = kindOf(b.deviceId);
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

/**
 * Gets the patch panel letter for a given PC from physical assignment.
 * The patch panels PP-1 and PP-2 are the SAME logical device in cage and PC views.
 */
export function panelLetterOf(pc: PcId, pa: PhysicalAssignment): string {
  const physical = pa.pcRoles[pc]; // e.g., 'PC 5'
  // Find in PHYSICAL_PC_POOL (need to import or replicate logic)
  // For now, extract from physicalLabel which has format "PC N"
  const match = physical.match(/PC\s+(\d+)/);
  if (!match) return 'A'; // fallback
  const pcNum = parseInt(match[1], 10);
  // Letters assigned cyclically A-H for 8 PCs
  return String.fromCharCode(65 + ((pcNum - 1) % 8)); // A=65
}