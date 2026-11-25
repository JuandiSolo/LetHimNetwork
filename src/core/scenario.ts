/**
 * Scenario definitions for Topology 1.
 * Pure data - no side effects.
 */

import type { PhysicalAssignment, PatchTermination, PcId } from './types';

export type { PhysicalAssignment, PatchTermination };

// Logical topology for T1 - matches PDF page 3 exactly
export const TOPOLOGY_T1 = {
  routers: ['R1', 'R2', 'R3'] as const,
  switch: 'SW',
  pcs: ['PC-1', 'PC-2'] as const,

  // Logical links that must exist for full connectivity
  logicalLinks: [
    { from: { device: 'R2', port: 'G0/0' }, to: { device: 'R1', port: 'G0/0' }, network: '192.168.10.0/24' },
    { from: { device: 'R1', port: 'G0/1' }, to: { device: 'R3', port: 'G0/0' }, network: '192.168.20.0/24' },
    { from: { device: 'PC-1', port: 'NIC' }, to: { device: 'R2', port: 'G0/1' }, network: '192.168.30.0/24' },
    { from: { device: 'PC-2', port: 'NIC' }, to: { device: 'R3', port: 'G0/1' }, network: '192.168.40.0/24' },
  ],

  // Router interfaces by role (physical port names depend on router model)
  routerInterfaces: {
    R1: ['G0/0', 'G0/1'],
    R2: ['G0/0', 'G0/1', 'Loopback2'],
    R3: ['G0/0', 'G0/1', 'Loopback3'],
  },

  // Required RIPv1 network declarations (major networks only, classful)
  ripNetworks: {
    R1: ['192.168.10.0', '192.168.20.0'],
    R2: ['192.168.10.0', '192.168.30.0', '172.16.0.0'],
    R3: ['192.168.20.0', '192.168.40.0', '172.17.0.0'],
  },
};

// Physical device pools (to be populated from photos/Q-01)
export const PHYSICAL_ROUTER_POOL = [
  { id: 'Router 1', series: '2900', ports: ['G0/0', 'G0/1', 'Console'] },
  { id: 'Router 2', series: '2900', ports: ['G0/0', 'G0/1', 'Console'] },
  { id: 'Router 3', series: '2900', ports: ['G0/0', 'G0/1', 'Console'] },
  { id: 'Router 4', series: '2900', ports: ['G0/0', 'G0/1', 'Console'] },
  { id: 'Router 5', series: '2900', ports: ['G0/0', 'G0/1', 'Console'] },
  { id: 'Router 6', series: '2900', ports: ['G0/0', 'G0/1', 'Console'] },
  { id: 'Router 7', series: '2900', ports: ['G0/0', 'G0/1', 'Console'] },
  { id: 'Router 8', series: '2900', ports: ['G0/0', 'G0/1', 'Console'] },
  { id: 'Router 9', series: '2800', ports: ['F0/0', 'F0/1', 'Console'] },
  { id: 'Router 10', series: '2800', ports: ['F0/0', 'F0/1', 'Console'] },
  { id: 'Router 11', series: '2800', ports: ['F0/0', 'F0/1', 'Console'] },
  { id: 'Router 12', series: '2800', ports: ['F0/0', 'F0/1', 'Console'] },
] as const;

export const PHYSICAL_SWITCH_POOL = [
  { id: 'SW 1', ports: 48 },
  { id: 'SW 2', ports: 48 },
  { id: 'SW 3', ports: 24 },
  { id: 'SW 4', ports: 24 },
] as const;

export const PHYSICAL_PC_POOL = [
  { id: 'PC 1', patchPanelLetter: 'A' },
  { id: 'PC 2', patchPanelLetter: 'B' },
  { id: 'PC 3', patchPanelLetter: 'C' },
  { id: 'PC 4', patchPanelLetter: 'D' },
  { id: 'PC 5', patchPanelLetter: 'E' },
  { id: 'PC 6', patchPanelLetter: 'F' },
  { id: 'PC 7', patchPanelLetter: 'G' },
  { id: 'PC 8', patchPanelLetter: 'H' },
] as const;

// Patch panel configuration (A-J, 1-24 per letter)
export const PATCH_PANEL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;
export const PATCH_PANEL_NUMBERS = Array.from({ length: 24 }, (_, i) => i + 1);

// Cable inventory for T1 (exact count, no spares per DEC-10).
// Fuente: docs/reference/diagrama_conexiones_red.jpeg y diagrama_consola.jpeg
// - Red: 6 directos (PC-1→parrilla1, parrilla1→SW, PC-2→parrilla2, parrilla2→SW,
//   SW→R2, SW→R3) + 2 cruzados (R2↔R1, R1↔R3).
// - Consola: 1 ethernet directo (parrilla→CONSOLE del router) + 1 USB→Ethernet (PC→parrilla).
export const CABLE_INVENTORY_T1 = {
  straight: 7,     // 6 de red + 1 ethernet directo del tramo de consola
  crossover: 2,    // R2↔R1, R1↔R3 (routers = mismo tipo)
  usbEthernet: 1,  // adaptador USB→Ethernet del PC (solo consola)
} as const;

// Desglose por función (para UI y evaluación)
export const CABLE_BREAKDOWN_T1 = {
  network: { straight: 6, crossover: 2 },
  console: { straight: 1, usbEthernet: 1 },
} as const;

// Port naming for display (handles F/G difference by physical router)
export function getRouterPortNames(physicalRouterId: string): { lan: string; wan: string; console: string } {
  const router = PHYSICAL_ROUTER_POOL.find(r => r.id === physicalRouterId);
  if (!router) return { lan: 'G0/1', wan: 'G0/0', console: 'Console' };

  if (router.series === '2900') {
    return { lan: 'G0/1', wan: 'G0/0', console: 'Console' };
  } else {
    return { lan: 'F0/1', wan: 'F0/0', console: 'Console' };
  }
}

// Generate patch termination mapping (desk jack ↔ rack jack with same label)
export function generatePatchTerminations(
  pc1Physical: string,
  pc2Physical: string,
  pc1Letter: string,
  pc2Letter: string
): PatchTermination[] {
  const terminations: PatchTermination[] = [];

  // Each PC gets a few jacks on its letter (exact mapping TBD from photos)
  // For now, assume first few jacks of each letter
  for (let i = 1; i <= 4; i++) {
    const jack = `${pc1Letter}${i}`;
    terminations.push({
      stationId: pc1Physical,
      deskJackId: jack,
      rackJackId: jack,
      internalLinkId: `internal-${jack}`,
      verifiedBy: 'pending',
    });
  }
  for (let i = 1; i <= 4; i++) {
    const jack = `${pc2Letter}${i}`;
    terminations.push({
      stationId: pc2Physical,
      deskJackId: jack,
      rackJackId: jack,
      internalLinkId: `internal-${jack}`,
      verifiedBy: 'pending',
    });
  }

  return terminations;
}

// Create initial physical assignment (called with seed)
export function createPhysicalAssignment(seed: number): PhysicalAssignment {
  // Simple deterministic shuffle using seed
  const rng = mulberry32(seed);
  const pickN = <T,>(arr: readonly T[], n: number): T[] => {
    const copy = [...arr];
    const result: T[] = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
      const idx = Math.floor(rng() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  };

  // Pick 2 PCs
  const pickedPCs = pickN(PHYSICAL_PC_POOL, 2);
  const pc1Physical = pickedPCs[0].id;
  const pc2Physical = pickedPCs[1].id;
  const pc1Letter = pickedPCs[0].patchPanelLetter;
  const pc2Letter = pickedPCs[1].patchPanelLetter;

  // Pick 3 routers for R1, R2, R3
  const pickedRouters = pickN(PHYSICAL_ROUTER_POOL, 3);

  // Pick 1 switch
  const pickedSwitch = pickN(PHYSICAL_SWITCH_POOL, 1)[0].id;

  // Damaged router gag (one of the remaining)
  const remainingRouters = PHYSICAL_ROUTER_POOL.filter(
    r => !pickedRouters.some(pr => pr.id === r.id)
  );
  const damagedRouter = remainingRouters[Math.floor(rng() * remainingRouters.length)]?.id;

  return {
    pcRoles: { 'PC-1': pc1Physical, 'PC-2': pc2Physical },
    routerRoles: {
      R1: pickedRouters[0].id,
      R2: pickedRouters[1].id,
      R3: pickedRouters[2].id,
    },
    switchIds: [pickedSwitch],
    patchTerminations: generatePatchTerminations(pc1Physical, pc2Physical, pc1Letter, pc2Letter),
    damagedRouterGag: damagedRouter,
  };
}

// Simple seeded PRNG (mulberry32)
function mulberry32(a: number) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type CableTypeKey = keyof typeof CABLE_INVENTORY_T1;

/**
 * Gets the patch panel letter for a given PC from physical assignment.
 * The patch panels PP-1 and PP-2 are the SAME logical device in cage and PC views.
 */
export function panelLetterOf(pc: PcId, pa: PhysicalAssignment): string {
  const physical = pa.pcRoles[pc]; // e.g., 'PC 5'
  const match = physical.match(/PC\s+(\d+)/);
  if (!match) return 'A'; // fallback
  const pcNum = parseInt(match[1], 10);
  // Letters assigned cyclically A-H for 8 PCs
  return String.fromCharCode(65 + ((pcNum - 1) % 8)); // A=65
}