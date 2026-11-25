/**
 * Core types for Let Him Network simulation.
 * Pure TypeScript - no Phaser, React, or DOM dependencies.
 */

export interface SectionGroupInput {
  section: number; // X
  group: number;   // Y
}

export interface ValidationError {
  field: 'section' | 'group' | 'yx' | 'loopback' | 'gateway' | 'duplicate';
  message: string;
}

export interface AddressPlan {
  // Router interfaces
  r1: {
    g0_0: string;      // 192.168.10.Y
    g0_1: string;      // 192.168.20.Y
  };
  r2: {
    g0_0: string;      // 192.168.10.(Y+1)
    g0_1: string;      // 192.168.30.1
    loopback2: string; // 172.16.X.Y
  };
  r3: {
    g0_0: string;      // 192.168.20.(Y+1)
    g0_1: string;      // 192.168.40.1
    loopback3: string; // 172.17.X.Y
  };
  // PCs
  pc1: {
    ip: string;        // 192.168.30.YX
    mask: string;      // 255.255.255.0
    gateway: string;   // 192.168.30.1
  };
  pc2: {
    ip: string;        // 192.168.40.YX
    mask: string;      // 255.255.255.0
    gateway: string;   // 192.168.40.1
  };
  // Metadata
  yx: string;          // Concatenated Y+X as string
  input: SectionGroupInput;
}

export type Result<T, E = ValidationError[]> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface DeviceId {
  type: 'router' | 'switch' | 'pc' | 'patch-panel';
  logicalRole: string;    // R1, R2, R3, SW, PC-1, PC-2
  physicalLabel: string;  // e.g., "Router 7", "PC 4", "SW 2"
}

export interface PortId {
  deviceId: DeviceId;
  portName: string;       // G0/0, G0/1, F0/0, F0/1, CONSOLE, etc.
}

export type CableType = 'straight' | 'crossover' | 'usbEthernet';

export interface Cable {
  id: string;
  type: CableType;
  endA: PortId | null;
  endB: PortId | null;
  color: string;          // Visual identifier
  seated: boolean;        // Physical connection quality (2% failure rate)
}

export type GamePhase = 'HOME' | 'SELECT_TOPOLOGY' | 'QUIZ' | 'TOOLS' | 'LAB' | 'DESKTOP' | 'REVIEW' | 'FEEDBACK';

export interface GameState {
  schemaVersion: number;
  seed: number;
  phase: GamePhase;
  addressPlan: AddressPlan | null;
  physicalAssignment: PhysicalAssignment | null;
  cables: Cable[];
  consoleLink: ConsoleLink | null;
  pcs: PCState[];
  clock: number;
  actions: GameAction[];
}

export interface PhysicalAssignment {
  pcRoles: { 'PC-1': string; 'PC-2': string };
  routerRoles: { R1: string; R2: string; R3: string };
  switchIds: string[];
  patchTerminations: PatchTermination[];
  damagedRouterGag?: string;
}

export interface PatchTermination {
  stationId: string;
  deskJackId: string;
  rackJackId: string;
  internalLinkId: string;
  verifiedBy: 'photo' | 'user' | 'pending';
}

export interface ConsoleLink {
  pcId: 'PC-1' | 'PC-2';
  comPort: number;
  connectedRouter: 'R1' | 'R2' | 'R3' | null;
}

export interface PCState {
  id: 'PC-1' | 'PC-2';
  ip: string;
  mask: string;
  gateway: string;
  comPort: number;
}

export interface GameAction {
  type: string;
  payload: unknown;
  actionId: number;
  gameTick: number;
}

export interface LinkState {
  portA: PortId;
  portB: PortId;
  up: boolean;
  reason?: string;
}

export interface RouteEntry {
  network: string;
  mask: string;
  nextHop: string;
  interface: string;
  metric: number;
  type: 'C' | 'L' | 'R'; // Connected, Local, RIP
}

export interface RouterState {
  hostname: string;
  runningConfig: string;
  startupConfig: string;
  interfaces: Map<string, InterfaceState>;
  rip: RipState;
  execMode: ExecMode;
}

export interface InterfaceState {
  name: string;
  ip: string | null;
  mask: string | null;
  shutdown: boolean;
  linkUp: boolean;
}

export interface RipState {
  enabled: boolean;
  version: 1;
  networks: string[]; // Major networks
}

export type ExecMode = 'user' | 'privileged' | 'config' | 'config-if' | 'config-router';

export interface PingTrace {
  source: string;
  destination: string;
  hops: PingHop[];
  success: boolean;
  replyReceived: boolean;
}

export interface PingHop {
  device: string;
  interface: string;
  action: 'forward' | 'drop' | 'reply';
  reason?: string;
}

export interface GradeResult {
  score: number;
  maxScore: number;
  items: GradeItem[];
  connectivity: ConnectivityCheck[];
  traceIds: string[];
  caveats: string[];
}

export interface GradeItem {
  category: 'physical' | 'ip' | 'rip' | 'ping';
  earned: number;
  max: number;
  description: string;
  evidence: string[];
}

export interface ConnectivityCheck {
  from: string;
  to: string;
  success: boolean;
  trace: PingTrace | null;
  failureReason?: string;
}