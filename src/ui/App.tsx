/**
 * Main App component - orchestrates all views and phases.
 */

import { useGameStore } from '@app/store';
import { XYForm } from './XYForm';
import { TopologySelector } from './TopologySelector';
import { Quiz } from './Quiz';
import { ToolsView } from './ToolsView';
import { PhaserGame } from './PhaserGame';
import { LabShell } from './LabShell';

export function App(): React.ReactElement {
  const phase = useGameStore(s => s.phase);
  const isDev = import.meta.env.DEV;

  return (
    <div className="app">
      {/* Phase: HOME - X/Y Input */}
      <XYForm />

      {/* Phase: SELECT_TOPOLOGY */}
      <TopologySelector />

      {/* Phase: QUIZ */}
      <Quiz />

      {/* Phase: TOOLS - Cable Inventory */}
      <ToolsView />

      {/* Phase: LAB - Cage/PC/Terminal (single Phaser game, React shell) */}
      <LabShell />

      {/* Debug info (dev only) */}
      {isDev && (
        <div className="debug-info">
          <strong>Phase:</strong> {phase}
        </div>
      )}
    </div>
  );
}