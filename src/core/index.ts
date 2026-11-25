/**
 * Core simulation module - pure TypeScript, no external dependencies.
 * Exports all core types, functions, and state management.
 */

export * from './types';
export * from './addressing';
export * from './scenario';
export * from './reducer';
// Re-export cables, avoiding duplicate panelLetterOf from scenario
export {
  kindOf,
  remainingCables,
  checkConnection,
  type Check,
  type DeviceKind,
  type PortRef,
} from './cables';