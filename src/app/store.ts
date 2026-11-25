/**
 * Game store using useSyncExternalStore pattern for React integration.
 * Single source of truth for game state.
 */

import { useSyncExternalStore } from 'react';
import type { GameState, GameAction } from '@core/types';
import { initialState, gameReducer, actions } from '@core/reducer';

// Store implementation
type Listener = () => void;
type Selector<T> = (state: GameState) => T;

class GameStore {
  private state: GameState = initialState;
  private listeners: Set<Listener> = new Set();

  getState(): GameState {
    return this.state;
  }

  dispatch(action: GameAction): void {
    this.state = gameReducer(this.state, {
      ...action,
      actionId: this.state.actions.length,
      gameTick: this.state.clock,
    });
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Selector method for useSyncExternalStore
  select<T>(selector: Selector<T>): T {
    return selector(this.state);
  }
}

// Singleton instance
export const gameStore = new GameStore();

// Main hook with optional selector
export function useGameStore(): GameState;
export function useGameStore<T>(selector: (state: GameState) => T): T;
export function useGameStore<T>(selector?: (state: GameState) => T): GameState | T {
  if (selector) {
    return useSyncExternalStore(
      gameStore.subscribe.bind(gameStore),
      () => gameStore.select(selector),
      () => gameStore.select(selector)
    );
  }
  return useSyncExternalStore(
    gameStore.subscribe.bind(gameStore),
    gameStore.getState.bind(gameStore),
    gameStore.getState.bind(gameStore)
  );
}

// Pre-defined selector hooks
export const useGamePhase = () => useGameStore(s => s.phase);
export const useAddressPlan = () => useGameStore(s => s.addressPlan);
export const usePhysicalAssignment = () => useGameStore(s => s.physicalAssignment);
export const useCables = () => useGameStore(s => s.cables);
export const useConsoleLink = () => useGameStore(s => s.consoleLink);
export const usePCs = () => useGameStore(s => s.pcs);
export const useSeed = () => useGameStore(s => s.seed);

// Action dispatchers (convenience)
export const dispatch = {
  startGame: (section: number, group: number, seed: number) =>
    gameStore.dispatch(actions.startGame(section, group, seed)),
  setPhase: (phase: GameState['phase']) =>
    gameStore.dispatch(actions.setPhase(phase)),
  addCable: (cable: any) =>
    gameStore.dispatch(actions.addCable(cable)),
  removeCable: (cableId: string) =>
    gameStore.dispatch(actions.removeCable(cableId)),
  setCableSeated: (cableId: string, seated: boolean) =>
    gameStore.dispatch(actions.setCableSeated(cableId, seated)),
  connectConsole: (pcId: 'PC-1' | 'PC-2', comPort: number, routerRole: 'R1' | 'R2' | 'R3') =>
    gameStore.dispatch(actions.connectConsole(pcId, comPort, routerRole)),
  disconnectConsole: () =>
    gameStore.dispatch(actions.disconnectConsole()),
  setPCConfig: (pcId: 'PC-1' | 'PC-2', ip: string, mask: string, gateway: string) =>
    gameStore.dispatch(actions.setPCConfig(pcId, ip, mask, gateway)),
  resetGame: (seed: number) =>
    gameStore.dispatch(actions.resetGame(seed)),
  setActiveTerminalPC: (pcId: 'PC-1' | 'PC-2' | null) =>
    gameStore.dispatch(actions.setActiveTerminalPC(pcId)),
};