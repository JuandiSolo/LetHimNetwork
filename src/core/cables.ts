/**
 * Cable validation rules - single source of truth for H1.
 * Pure TypeScript - no Phaser, React, or DOM dependencies.
 */

import type { Cable, CableType, PortId, PcId, PhysicalAssignment, JackStatus, JackSideStatus, PatchFace } from './types';
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

// ===== NUEVO: Claves y estado por terminación física =====

/** Clave única por terminación física (incluye cara para PP) */
export function portKey(port: PortId): string {
  const face = port.face ? `:${port.face}` : '';
  return `${port.deviceId.logicalRole}:${port.portName}${face}`;
}

/** ¿Misma terminación física (misma cara)? */
export function sameTermination(a: PortId, b: PortId): boolean {
  return portKey(a) === portKey(b);
}

/** Vista a la que pertenece un puerto individual */
export function viewOfPort(port: PortId): 'cage' | 'pc' {
  const role = port.deviceId.logicalRole;
  if (role.startsWith('PC-')) return 'pc';
  if (role.startsWith('PP-')) return port.face === 'DESK' ? 'pc' : 'cage';
  return 'cage'; // SW, R1, R2, R3
}

/** Vista de un cable (ambos extremos deben coincidir) */
export function viewOfCable(cable: { endA: PortId | null; endB: PortId | null }): 'cage' | 'pc' {
  if (!cable.endA || !cable.endB) throw new Error('Cable incompleto');
  const vA = viewOfPort(cable.endA);
  const vB = viewOfPort(cable.endB);
  if (vA !== vB) throw new Error(`Cable entre vistas inválido: ${vA} vs ${vB}`);
  return vA;
}

/** Estado completo de un jack visible (para UI) */
export function getJackStatus(cables: Cable[], port: PortId, currentView: 'cage' | 'pc'): JackStatus {
  let here: JackSideStatus | null = null;
  let opposite: JackSideStatus | null = null;

  for (const c of cables) {
    if (!c.endA || !c.endB) continue;
    const matchesA = sameTermination(c.endA, port);
    const matchesB = sameTermination(c.endB, port);
    if (!matchesA && !matchesB) continue;

    const other = matchesA ? c.endB : c.endA;
    const cableView = viewOfCable(c);

    if (cableView === currentView) {
      here = { cableId: c.id, otherEnd: other, seated: c.seated };
    } else {
      opposite = { cableId: c.id, otherEnd: other, seated: c.seated };
    }
  }

  return { here, opposite };
}

/** Validación unificada para añadir cable (usa checkConnection + ocupación por cara + inventario + vista) */
export function canConnect(
  cables: Cable[],
  newCable: { type: CableType; endA: PortId; endB: PortId },
  currentView: 'cage' | 'pc'
): Check {
  // 1. Validación de tipo (checkConnection existente adaptado a PortId)
  const typeCheck = checkConnection(newCable.type,
    { deviceId: newCable.endA.deviceId.logicalRole, portName: newCable.endA.portName },
    { deviceId: newCable.endB.deviceId.logicalRole, portName: newCable.endB.portName }
  );
  if (!typeCheck.ok) return typeCheck;

  // 2. Mismo extremo (misma cara)
  if (sameTermination(newCable.endA, newCable.endB)) return no('Mismo puerto');

  // 3. Ocupación por cara (solo 'here' bloquea en la vista actual)
  for (const end of [newCable.endA, newCable.endB]) {
    const status = getJackStatus(cables, end, currentView);
    if (status.here) return no(`Puerto ocupado por ${status.here.cableId}`);
  }

  // 4. Inventario
  const rem = remainingCables(cables);
  if (rem[newCable.type] <= 0) return no(`No quedan cables de tipo ${newCable.type}`);

  // 5. Vista consistente (ambos extremos misma vista = currentView)
  const cableView = viewOfCable(newCable);
  if (cableView !== currentView) return no('Conexión entre vistas no permitida');

  return OK;
}

// NOTA: panelLetterOf se exporta SOLO desde core/scenario.ts para evitar duplicación

import type { PCState } from './types';

// ==================== CONSOLE PATH DETECTION ====================

/** Information about a complete console cable path */
export interface ConsolePathInfo {
  pcId: 'PC-1' | 'PC-2';
  comPort: number;
  routerRole: 'R1' | 'R2' | 'R3';
  patchPanelDesk: string; // e.g., 'PP-1:DESK:A6'
  patchPanelRack: string; // e.g., 'PP-1:RACK:A6'
  usbEthernetCableId: string;
  straightCableId: string;
}

/**
 * Finds a complete console path: PC.USB --(usbEthernet)--> PatchPanel:DESK --(internal)--> PatchPanel:RACK --(straight)--> Router.Console
 * Returns the path info if a complete console connection exists for the given router.
 */
export function findConsolePath(cables: Cable[], pcs: PCState[], routerRole: 'R1' | 'R2' | 'R3'): ConsolePathInfo | null {
  // Step 1: Find straight cable connecting PatchPanel:RACK to Router.Console
  const consoleCable = cables.find(c =>
    c.type === 'straight' &&
    c.seated &&
    c.endA && c.endB &&
    (
      (c.endA.deviceId.logicalRole.startsWith('PP-') && c.endA.face === 'RACK' && c.endB.deviceId.logicalRole === routerRole && c.endB.portName === 'Console') ||
      (c.endB.deviceId.logicalRole.startsWith('PP-') && c.endB.face === 'RACK' && c.endA.deviceId.logicalRole === routerRole && c.endA.portName === 'Console')
    )
  );

  if (!consoleCable) {
    // DEBUG
    if (typeof window !== 'undefined') console.log('[findConsolePath] No console cable found for', routerRole, 'cables:', cables.filter(c => c.type === 'straight' && c.endA && c.endB).map(c => ({ type: c.type, seated: c.seated, endA: c.endA, endB: c.endB })));
    return null;
  }

  // Determine which end is the patch panel (RACK face)
  const patchPanelRackEnd = consoleCable.endA!.deviceId.logicalRole.startsWith('PP-') ? consoleCable.endA! : consoleCable.endB!;
  const patchPanelId = patchPanelRackEnd.deviceId.logicalRole; // e.g., 'PP-1'
  const patchPortName = patchPanelRackEnd.portName; // e.g., 'A6'

  // Step 2: Find usbEthernet cable connecting PC.USB to same PatchPanel:DESK on same port
  const usbEthernetCable = cables.find(c =>
    c.type === 'usbEthernet' &&
    c.seated &&
    c.endA && c.endB &&
    (
      (c.endA.deviceId.logicalRole.startsWith('PC-') && c.endA.portName === 'USB' &&
       c.endB.deviceId.logicalRole === patchPanelId && c.endB.face === 'DESK' && c.endB.portName === patchPortName) ||
      (c.endB.deviceId.logicalRole.startsWith('PC-') && c.endB.portName === 'USB' &&
       c.endA.deviceId.logicalRole === patchPanelId && c.endA.face === 'DESK' && c.endA.portName === patchPortName)
    )
  );

  if (!usbEthernetCable) {
    // DEBUG
    if (typeof window !== 'undefined') console.log('[findConsolePath] No usbEthernet cable found for', patchPanelId, patchPortName, 'cables:', cables.filter(c => c.type === 'usbEthernet' && c.endA && c.endB).map(c => ({ type: c.type, seated: c.seated, endA: c.endA, endB: c.endB })));
    return null;
  }

  // Determine which PC
  const pcEnd = usbEthernetCable.endA!.deviceId.logicalRole.startsWith('PC-') ? usbEthernetCable.endA! : usbEthernetCable.endB!;
  const pcId = pcEnd.deviceId.logicalRole as 'PC-1' | 'PC-2';

  // Find COM port for this PC
  const pcInfo = pcs.find(p => p.id === pcId);
  if (!pcInfo) return null;

  return {
    pcId,
    comPort: pcInfo.comPort,
    routerRole,
    patchPanelDesk: `${patchPanelId}:DESK:${patchPortName}`,
    patchPanelRack: `${patchPanelId}:RACK:${patchPortName}`,
    usbEthernetCableId: usbEthernetCable.id,
    straightCableId: consoleCable.id,
  };
}

/**
 * Checks if any router has a complete console path and returns the first one found.
 * Used to auto-detect console connection after cable changes.
 */
export function detectAnyConsolePath(cables: Cable[], pcs: PCState[]): ConsolePathInfo | null {
  for (const routerRole of ['R1', 'R2', 'R3'] as const) {
    const path = findConsolePath(cables, pcs, routerRole);
    if (path) return path;
  }
  return null;
}