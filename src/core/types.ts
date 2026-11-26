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

export type PatchFace = 'DESK' | 'RACK';

export interface PortId {
  deviceId: DeviceId;
  portName: string;       // G0/0, G0/1, F0/0, F0/1, CONSOLE, etc.
  face?: PatchFace;       // obligatorio para PP-*, ausente en PC/SW/R
}

export type CableType = 'straight' | 'crossover' | 'usbEthernet';

export type PcId = 'PC-1' | 'PC-2';
export type LabView = 'CAGE' | 'PC' | 'TERMINAL';

export interface Cable {
  id: string;
  type: CableType;
  endA: PortId | null;
  endB: PortId | null;
  color: string;          // Visual identifier
  seated: boolean;        // Physical connection quality (2% failure rate)
}

// Estado visual de un jack de parrilla (dos caras independientes)
export interface JackSideStatus {
  cableId: string;
  otherEnd: PortId;
  seated: boolean;
}

export interface JackStatus {
  here: JackSideStatus | null;      // Cable en esta vista (bloquea)
  opposite: JackSideStatus | null;  // Cable en otra vista (ilumina, no bloquea)
}

export type GamePhase = 'HOME' | 'SELECT_TOPOLOGY' | 'QUIZ' | 'TOOLS' | 'LAB' | 'REVIEW' | 'FEEDBACK';

// ==================== CLI TYPES (H2) ====================

export type RouterId = 'R1' | 'R2' | 'R3';

export interface RouterInterfaceConfig {
  ip: string | null;
  mask: string | null;
  shutdown: boolean;
}

export interface RouterRipConfig {
  enabled: boolean;
  version: 1 | null;
  networks: string[]; // Major networks (e.g., "192.168.10.0")
}

export interface RouterConfig {
  hostname: string;
  interfaces: Record<string, RouterInterfaceConfig>;
  rip: RouterRipConfig;
}

export interface RouterState {
  running: RouterConfig;
  startup: RouterConfig | null;
  eraseReloadDone: boolean;
  erasedSinceBoot: boolean;
}

export type ExecMode = 'user' | 'privileged' | 'config' | 'config-if' | 'config-router';

export interface TerminalSession {
  routerId: RouterId;
  mode: ExecMode;
  output: string[];
  pendingConfirm?: 'erase' | 'reload';
  interfaceContext?: string; // e.g., "GigabitEthernet0/0" when in config-if
  awaitingEnter: boolean;    // After "Conexión interrumpida" or "Sesión cerrada"
}

// CLI Menu option
export interface CliMenuOption {
  id: string;
  label: string;
  action: 'transition' | 'value-select' | 'execute' | 'confirm' | 'show' | 'help' | 'exit-session';
  targetMode?: ExecMode;
  valueType?: 'ip-address' | 'mask' | 'network' | 'ping-dest' | 'show-type';
  generatesCommand?: string; // IOS command template with placeholders
  requiresConfirm?: boolean;
  subMenu?: CliMenuOption[]; // For "show..." selector
  interfaceContext?: string; // For config-if transitions
}

// Value list item for selectors
export interface ValueListItem {
  value: string;
  label: string;
  description?: string;
}

// ==================== END CLI TYPES ====================

// Action types - exported for reducer and store
export const ActionType = {
  START_GAME: 'START_GAME',
  SET_PHASE: 'SET_PHASE',
  ADD_CABLE: 'ADD_CABLE',
  REMOVE_CABLE: 'REMOVE_CABLE',
  SET_CABLE_SEATED: 'SET_CABLE_SEATED',
  CONNECT_CONSOLE: 'CONNECT_CONSOLE',
  DISCONNECT_CONSOLE: 'DISCONNECT_CONSOLE',
  SET_PC_CONFIG: 'SET_PC_CONFIG',
  ADVANCE_CLOCK: 'ADVANCE_CLOCK',
  RESET_GAME: 'RESET_GAME',
  OPEN_CAGE: 'OPEN_CAGE',
  OPEN_PC: 'OPEN_PC',
  OPEN_TERMINAL: 'OPEN_TERMINAL',
  SELECT_CABLE: 'SELECT_CABLE',
  // CLI actions
  EXEC_CLI_OPTION: 'EXEC_CLI_OPTION',
} as const;

export type ActionTypeValue = typeof ActionType[keyof typeof ActionType];

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
  labView: LabView;
  activePc: PcId;
  selectedCable: CableType;
  // CLI state
  routers: Record<RouterId, RouterState>;
  sessions: Record<RouterId, TerminalSession | null>;
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
  // Caras físicas para validación de ocupación
  deskFace: 'DESK';
  rackFace: 'RACK';
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