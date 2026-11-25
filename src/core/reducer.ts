/**
 * Game state reducer - pure state transitions.
 * No side effects, no external dependencies.
 */

import type {
  GameState,
  GameAction,
  GamePhase,
  Cable,
  PCState,
  PortId,
} from './types';
import { deriveAddresses } from './addressing';
import { createPhysicalAssignment } from './scenario';

// Initial state
export const initialState: GameState = {
  schemaVersion: 1,
  seed: 0,
  phase: 'HOME',
  addressPlan: null,
  physicalAssignment: null,
  cables: [],
  consoleLink: null,
  pcs: [],
  clock: 0,
  actions: [],
};

// Action types
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
} as const;

// Reducer
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case ActionType.START_GAME: {
      const { section, group, seed } = action.payload as {
        section: number;
        group: number;
        seed: number;
      };

      const addressResult = deriveAddresses({ section, group });
      if (!addressResult.ok) {
        return state; // Validation errors handled in UI
      }

      const physicalAssignment = createPhysicalAssignment(seed);

      // Initialize PC states from address plan
      const pcs: PCState[] = [
        {
          id: 'PC-1',
          ip: addressResult.value.pc1.ip,
          mask: addressResult.value.pc1.mask,
          gateway: addressResult.value.pc1.gateway,
          comPort: 3 + Math.floor(seed * 10) % 8, // COM 3-10
        },
        {
          id: 'PC-2',
          ip: addressResult.value.pc2.ip,
          mask: addressResult.value.pc2.mask,
          gateway: addressResult.value.pc2.gateway,
          comPort: 3 + Math.floor(seed * 100) % 8, // Different COM
        },
      ];

      return {
        ...state,
        seed,
        phase: 'SELECT_TOPOLOGY',
        addressPlan: addressResult.value,
        physicalAssignment,
        pcs,
        cables: [],
        consoleLink: null,
        clock: 0,
        actions: [{ ...action, actionId: 0, gameTick: 0 }],
      };
    }

    case ActionType.SET_PHASE: {
      const { phase } = action.payload as { phase: GamePhase };
      return {
        ...state,
        phase,
        actions: [...state.actions, { ...action, actionId: state.actions.length, gameTick: state.clock }],
      };
    }

    case ActionType.ADD_CABLE: {
      const { cable } = action.payload as { cable: Cable };
      // Check port availability
      if (isPortOccupied(state.cables, cable.endA) || isPortOccupied(state.cables, cable.endB)) {
        return state; // Port busy - handled in UI
      }
      return {
        ...state,
        cables: [...state.cables, cable],
        actions: [...state.actions, { ...action, actionId: state.actions.length, gameTick: state.clock }],
      };
    }

    case ActionType.REMOVE_CABLE: {
      const { cableId } = action.payload as { cableId: string };
      return {
        ...state,
        cables: state.cables.filter(c => c.id !== cableId),
        actions: [...state.actions, { ...action, actionId: state.actions.length, gameTick: state.clock }],
      };
    }

    case ActionType.SET_CABLE_SEATED: {
      const { cableId, seated } = action.payload as { cableId: string; seated: boolean };
      return {
        ...state,
        cables: state.cables.map(c => c.id === cableId ? { ...c, seated } : c),
        actions: [...state.actions, { ...action, actionId: state.actions.length, gameTick: state.clock }],
      };
    }

    case ActionType.CONNECT_CONSOLE: {
      const { pcId, comPort, routerRole } = action.payload as {
        pcId: 'PC-1' | 'PC-2';
        comPort: number;
        routerRole: 'R1' | 'R2' | 'R3';
      };
      return {
        ...state,
        consoleLink: { pcId, comPort, connectedRouter: routerRole },
        actions: [...state.actions, { ...action, actionId: state.actions.length, gameTick: state.clock }],
      };
    }

    case ActionType.DISCONNECT_CONSOLE: {
      return {
        ...state,
        consoleLink: state.consoleLink ? { ...state.consoleLink, connectedRouter: null } : null,
        actions: [...state.actions, { ...action, actionId: state.actions.length, gameTick: state.clock }],
      };
    }

    case ActionType.SET_PC_CONFIG: {
      const { pcId, ip, mask, gateway } = action.payload as {
        pcId: 'PC-1' | 'PC-2';
        ip: string;
        mask: string;
        gateway: string;
      };
      return {
        ...state,
        pcs: state.pcs.map(pc => pc.id === pcId ? { ...pc, ip, mask, gateway } : pc),
        actions: [...state.actions, { ...action, actionId: state.actions.length, gameTick: state.clock }],
      };
    }

    case ActionType.ADVANCE_CLOCK: {
      const { ticks } = action.payload as { ticks: number };
      return {
        ...state,
        clock: state.clock + ticks,
      };
    }

    case ActionType.RESET_GAME: {
      // Keep X/Y (addressPlan) but reset everything else
      const { seed } = action.payload as { seed: number };
      const physicalAssignment = createPhysicalAssignment(seed);

      return {
        ...initialState,
        schemaVersion: 1,
        seed,
        phase: 'SELECT_TOPOLOGY',
        addressPlan: state.addressPlan,
        physicalAssignment,
        pcs: state.pcs.map((pc, i) => ({
          ...pc,
          comPort: 3 + Math.floor(seed * (i + 1) * 10) % 8,
        })),
      };
    }

    default:
      return state;
  }
}

// Helper to check if a port is already occupied
function isPortOccupied(cables: Cable[], port: PortId | null): boolean {
  if (!port) return false;
  return cables.some(c =>
    (c.endA && portsEqual(c.endA, port)) ||
    (c.endB && portsEqual(c.endB, port))
  );
}

function portsEqual(a: PortId, b: PortId): boolean {
  return a.deviceId.logicalRole === b.deviceId.logicalRole &&
         a.deviceId.physicalLabel === b.deviceId.physicalLabel &&
         a.portName === b.portName;
}

// Action creators
export const actions = {
  startGame: (section: number, group: number, seed: number): GameAction => ({
    type: ActionType.START_GAME,
    payload: { section, group, seed },
    actionId: 0,
    gameTick: 0,
  }),

  setPhase: (phase: GamePhase): GameAction => ({
    type: ActionType.SET_PHASE,
    payload: { phase },
    actionId: 0,
    gameTick: 0,
  }),

  addCable: (cable: Cable): GameAction => ({
    type: ActionType.ADD_CABLE,
    payload: { cable },
    actionId: 0,
    gameTick: 0,
  }),

  removeCable: (cableId: string): GameAction => ({
    type: ActionType.REMOVE_CABLE,
    payload: { cableId },
    actionId: 0,
    gameTick: 0,
  }),

  setCableSeated: (cableId: string, seated: boolean): GameAction => ({
    type: ActionType.SET_CABLE_SEATED,
    payload: { cableId, seated },
    actionId: 0,
    gameTick: 0,
  }),

  connectConsole: (pcId: 'PC-1' | 'PC-2', comPort: number, routerRole: 'R1' | 'R2' | 'R3'): GameAction => ({
    type: ActionType.CONNECT_CONSOLE,
    payload: { pcId, comPort, routerRole },
    actionId: 0,
    gameTick: 0,
  }),

  disconnectConsole: (): GameAction => ({
    type: ActionType.DISCONNECT_CONSOLE,
    payload: {},
    actionId: 0,
    gameTick: 0,
  }),

  setPCConfig: (pcId: 'PC-1' | 'PC-2', ip: string, mask: string, gateway: string): GameAction => ({
    type: ActionType.SET_PC_CONFIG,
    payload: { pcId, ip, mask, gateway },
    actionId: 0,
    gameTick: 0,
  }),

  advanceClock: (ticks: number): GameAction => ({
    type: ActionType.ADVANCE_CLOCK,
    payload: { ticks },
    actionId: 0,
    gameTick: 0,
  }),

  resetGame: (seed: number): GameAction => ({
    type: ActionType.RESET_GAME,
    payload: { seed },
    actionId: 0,
    gameTick: 0,
  }),
};