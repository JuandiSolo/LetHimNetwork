/**
 * LabShell - Main LAB phase UI shell.
 * Handles navigation (CAGE/PC/TERMINAL), cable selector, and terminal overlay.
 */

import { useEffect, useState } from 'react';
import { useGameStore, useCables, dispatch } from '@app/store';
import { remainingCables } from '@core/cables';
import type { CableType, PcId, RouterId } from '@core/types';
import { PhaserGame } from './PhaserGame';
import { PcTerminalView } from './PcTerminalView';

const CABLES: { type: CableType; label: string; key: string }[] = [
  { type: 'straight', label: 'Directo', key: '1' },
  { type: 'crossover', label: 'Cruzado', key: '2' },
  { type: 'usbEthernet', label: 'USB-Eth', key: '3' },
];

export function LabShell() {
  const phase = useGameStore(s => s.phase);
  const view = useGameStore(s => s.labView);
  const activePc = useGameStore(s => s.activePc);
  const selected = useGameStore(s => s.selectedCable);
  const cables = useCables();
  const consoleLink = useGameStore(s => s.consoleLink);
  const sessions = useGameStore(s => s.sessions);
  const [lines, setLines] = useState<Record<PcId, string[]>>({ 'PC-1': [], 'PC-2': [] });

  // Keyboard shortcuts 1/2/3 for cable selection (only in CAGE/PC views)
  useEffect(() => {
    if (phase !== 'LAB' || view === 'TERMINAL') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      const c = CABLES.find(c => c.key === e.key);
      if (c) dispatch.selectCable(c.type);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, view]);

  if (phase !== 'LAB') return null;
  const left = remainingCables(cables);

  // Find connected router for terminal button
  const connectedRouter = consoleLink?.connectedRouter as RouterId | undefined;
  const hasActiveSession = connectedRouter && sessions[connectedRouter];

  return (
    <div className='lab-shell'>
      {view !== 'TERMINAL' && (
        <div className='lab-bar'>
          {/* Navigation */}
          {view === 'CAGE' ? (
            <>
              <button onClick={() => dispatch.openPc(activePc)}>Ir a PCs ({activePc}) →</button>
              {connectedRouter && (
                <button onClick={dispatch.openTerminal}>Terminal ({connectedRouter}) →</button>
              )}
            </>
          ) : (
            <>
              <button onClick={dispatch.openCage}>← Jaula</button>
              {(['PC-1', 'PC-2'] as PcId[]).map(id => (
                <button
                  key={id}
                  className={id === activePc ? 'active' : ''}
                  onClick={() => dispatch.openPc(id)}
                >
                  {id.replace('-', ' ')}
                </button>
              ))}
              {connectedRouter && (
                <button onClick={dispatch.openTerminal}>Terminal ({connectedRouter}) →</button>
              )}
            </>
          )}
          <span className='lab-spacer' />
          {/* Cable selector: SAME in cage and PC views */}
          {CABLES.map(c => (
            <button
              key={c.type}
              className={selected === c.type ? 'active' : ''}
              disabled={left[c.type] <= 0}
              onClick={() => dispatch.selectCable(c.type)}
            >
              {c.label} ({c.key}) {left[c.type]}
            </button>
          ))}
        </div>
      )}
      <div className='lab-canvas'><PhaserGame /></div>

      {/* Terminal view - always shows PC terminal (which includes router panel when console connected) */}
      {view === 'TERMINAL' && (
        <PcTerminalView lines={lines} setLines={setLines} />
      )}
    </div>
  );
}