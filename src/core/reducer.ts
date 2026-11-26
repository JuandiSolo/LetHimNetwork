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
  CableType,
  PcId,
  LabView,
  RouterId,
  RouterState,
  TerminalSession,
  ExecMode,
} from './types';
import { ActionType } from './types';
import { deriveAddresses } from './addressing';
import { createPhysicalAssignment, CABLE_INVENTORY_T1 } from './scenario';
import { canConnect, remainingCables as coreRemainingCables } from './cables';
import { executeCliOption, createTerminalSession, invalidateSession } from './cli';
import { createInitialRouterState } from './cliMenu';
import { deepClone } from './cli';
import { detectAnyConsolePath, type ConsolePathInfo } from './cables';

// Initial state
export const initialState: GameState = {
  schemaVersion: 2, // Bumped for CLI types
  seed: 0,
  phase: 'HOME',
  addressPlan: null,
  physicalAssignment: null,
  cables: [],
  consoleLink: null,
  pcs: [],
  clock: 0,
  actions: [],
  labView: 'CAGE',
  activePc: 'PC-1',
  selectedCable: 'straight',
  routers: {
    R1: { running: {} as any, startup: null, eraseReloadDone: false, erasedSinceBoot: false },
    R2: { running: {} as any, startup: null, eraseReloadDone: false, erasedSinceBoot: false },
    R3: { running: {} as any, startup: null, eraseReloadDone: false, erasedSinceBoot: false },
  },
  sessions: {
    R1: null,
    R2: null,
    R3: null,
  },
};

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

      // Initialize router states
      const routers: Record<RouterId, RouterState> = {
        R1: createInitialRouterState('R1', physicalAssignment, seed),
        R2: createInitialRouterState('R2', physicalAssignment, seed),
        R3: createInitialRouterState('R3', physicalAssignment, seed),
      };

      return {
        ...state,
        schemaVersion: 2,
        seed,
        phase: 'SELECT_TOPOLOGY',
        addressPlan: addressResult.value,
        physicalAssignment,
        pcs,
        cables: [],
        consoleLink: null,
        clock: 0,
        labView: 'CAGE',
        activePc: 'PC-1',
        selectedCable: 'straight',
        routers,
        sessions: { R1: null, R2: null, R3: null },
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
      // Determine current view from labView
      const currentView = state.labView === 'CAGE' ? 'cage' : 'pc';
      // Validate using unified logic (type, face occupation, inventory, view consistency)
      const validation = canConnect(state.cables, { type: cable.type, endA: cable.endA!, endB: cable.endB! }, currentView);
      if (!validation.ok) {
        return state; // Validation failed - handled in UI with message
      }

      const newCables = [...state.cables, cable];

      // Auto-detect console connection after adding cable
      let newConsoleLink = state.consoleLink;
      let newSessions = state.sessions;

      if (state.physicalAssignment) {
        const consolePath = detectAnyConsolePath(newCables, state.pcs);
        if (consolePath) {
          // Check if this is a new connection or same router
          const isNewConnection = !state.consoleLink || state.consoleLink.connectedRouter !== consolePath.routerRole;

          if (isNewConnection) {
            // Invalidate previous session if connected to different router
            if (state.consoleLink?.connectedRouter) {
              const oldRouterId = state.consoleLink.connectedRouter as RouterId;
              newSessions = {
                ...newSessions,
                [oldRouterId]: invalidateSession(state.sessions[oldRouterId]),
              };
            }
            // Create new session for the connected router
            const routerId = consolePath.routerRole as RouterId;
            newSessions = {
              ...newSessions,
              [routerId]: createTerminalSession(routerId, state.routers[routerId]),
            };
            newConsoleLink = {
              pcId: consolePath.pcId,
              comPort: consolePath.comPort,
              connectedRouter: consolePath.routerRole,
            };
          }
        }
      }

      return {
        ...state,
        cables: newCables,
        consoleLink: newConsoleLink,
        sessions: newSessions,
        actions: [...state.actions, { ...action, actionId: state.actions.length, gameTick: state.clock }],
      };
    }

    case ActionType.REMOVE_CABLE: {
      const { cableId } = action.payload as { cableId: string };
      const newCables = state.cables.filter(c => c.id !== cableId);

      // Auto-detect console connection after removing cable
      let newConsoleLink = state.consoleLink;
      let newSessions = state.sessions;

      if (state.physicalAssignment) {
        const consolePath = detectAnyConsolePath(newCables, state.pcs);
        if (!consolePath && state.consoleLink) {
          // Console connection was broken - invalidate session
          const routerId = state.consoleLink.connectedRouter as RouterId;
          newSessions = {
            ...newSessions,
            [routerId]: invalidateSession(state.sessions[routerId]),
          };
          newConsoleLink = state.consoleLink ? { ...state.consoleLink, connectedRouter: null } : null;
        } else if (consolePath && state.consoleLink?.connectedRouter !== consolePath.routerRole) {
          // Console moved to different router
          if (state.consoleLink?.connectedRouter) {
            const oldRouterId = state.consoleLink.connectedRouter as RouterId;
            newSessions = {
              ...newSessions,
              [oldRouterId]: invalidateSession(state.sessions[oldRouterId]),
            };
          }
          const routerId = consolePath.routerRole as RouterId;
          newSessions = {
            ...newSessions,
            [routerId]: createTerminalSession(routerId, state.routers[routerId]),
          };
          newConsoleLink = {
            pcId: consolePath.pcId,
            comPort: consolePath.comPort,
            connectedRouter: consolePath.routerRole,
          };
        }
      }

      return {
        ...state,
        cables: newCables,
        consoleLink: newConsoleLink,
        sessions: newSessions,
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

      const routerId = routerRole as RouterId;

      // Invalidate previous session if connected to different router
      const newSessions = { ...state.sessions };
      if (state.consoleLink && state.consoleLink.connectedRouter !== routerRole) {
        // Invalidate old router session
        const oldRouterId = state.consoleLink.connectedRouter as RouterId;
        newSessions[oldRouterId] = invalidateSession(state.sessions[oldRouterId]);
      }

      // Create new session for the connected router
      newSessions[routerId] = createTerminalSession(routerId, state.routers[routerId]);

      return {
        ...state,
        consoleLink: { pcId, comPort, connectedRouter: routerRole },
        sessions: newSessions,
        actions: [...state.actions, { ...action, actionId: state.actions.length, gameTick: state.clock }],
      };
    }

    case ActionType.DISCONNECT_CONSOLE: {
      const newSessions = { ...state.sessions };
      if (state.consoleLink?.connectedRouter) {
        const routerId = state.consoleLink.connectedRouter as RouterId;
        newSessions[routerId] = invalidateSession(state.sessions[routerId]);
      }
      return {
        ...state,
        consoleLink: state.consoleLink ? { ...state.consoleLink, connectedRouter: null } : null,
        sessions: newSessions,
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

      const routers: Record<RouterId, RouterState> = {
        R1: createInitialRouterState('R1', physicalAssignment, seed),
        R2: createInitialRouterState('R2', physicalAssignment, seed),
        R3: createInitialRouterState('R3', physicalAssignment, seed),
      };

      return {
        ...initialState,
        schemaVersion: 2,
        seed,
        phase: 'SELECT_TOPOLOGY',
        addressPlan: state.addressPlan,
        physicalAssignment,
        pcs: state.pcs.map((pc, i) => ({
          ...pc,
          comPort: 3 + Math.floor(seed * (i + 1) * 10) % 8,
        })),
        routers,
        sessions: { R1: null, R2: null, R3: null },
      };
    }

    case ActionType.OPEN_CAGE: {
      return {
        ...state,
        labView: 'CAGE',
        // Note: navigation actions not recorded in actions[] per spec
      };
    }

    case ActionType.OPEN_PC: {
      const { pcId } = action.payload as { pcId: PcId };
      return {
        ...state,
        labView: 'PC',
        activePc: pcId,
      };
    }

    case ActionType.OPEN_TERMINAL: {
      return {
        ...state,
        labView: 'TERMINAL',
        // Uses activePc from state
      };
    }

    case ActionType.SELECT_CABLE: {
      const { cableType } = action.payload as { cableType: CableType };
      return {
        ...state,
        selectedCable: cableType,
      };
    }

    // ==================== CLI ACTIONS ====================
    case ActionType.EXEC_CLI_OPTION: {
      const { routerId, optionId, providedValue, secondValue } = action.payload as {
        routerId: RouterId;
        optionId: string;
        providedValue?: string;
        secondValue?: string;
      };

      const session = state.sessions[routerId];
      if (!session) {
        return state; // No active session
      }

      const routerState = state.routers[routerId];
      const physicalAssignment = state.physicalAssignment!;
      const addressPlan = state.addressPlan!;

      const result = executeCliOption(
        routerId,
        routerState,
        session,
        optionId,
        physicalAssignment,
        addressPlan,
        providedValue,
        secondValue
      );

      const newSessions = { ...state.sessions };
      newSessions[routerId] = result.newSession;

      const newRouters = { ...state.routers };
      newRouters[routerId] = result.newRouterState;

      // If session closed, clear console link
      let newConsoleLink = state.consoleLink;
      if (result.sessionClosed) {
        newConsoleLink = state.consoleLink ? { ...state.consoleLink, connectedRouter: null } : null;
      }

      return {
        ...state,
        routers: newRouters,
        sessions: newSessions,
        consoleLink: newConsoleLink,
        actions: [...state.actions, { ...action, actionId: state.actions.length, gameTick: state.clock }],
      };
    }

    default:
      return state;
  }
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

  openCage: (): GameAction => ({
    type: ActionType.OPEN_CAGE,
    payload: {},
    actionId: 0,
    gameTick: 0,
  }),

  openPc: (pcId: PcId): GameAction => ({
    type: ActionType.OPEN_PC,
    payload: { pcId },
    actionId: 0,
    gameTick: 0,
  }),

  openTerminal: (): GameAction => ({
    type: ActionType.OPEN_TERMINAL,
    payload: {},
    actionId: 0,
    gameTick: 0,
  }),

  selectCable: (cableType: CableType): GameAction => ({
    type: ActionType.SELECT_CABLE,
    payload: { cableType },
    actionId: 0,
    gameTick: 0,
  }),

  // CLI action creator
  execCliOption: (routerId: RouterId, optionId: string, providedValue?: string, secondValue?: string): GameAction => ({
    type: ActionType.EXEC_CLI_OPTION,
    payload: { routerId, optionId, providedValue, secondValue },
    actionId: 0,
    gameTick: 0,
  }),
};