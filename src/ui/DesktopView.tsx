/**
 * Desktop/PC view - React component for PC configuration and terminal.
 * Mock for H0 - shows IP config and placeholder terminal.
 */

import { useState } from 'react';
import { usePCs, useGameStore, dispatch } from '@app/store';

export function DesktopView(): React.ReactElement | null {
  const pcs = usePCs();
  const phase = useGameStore(s => s.phase);
  const [activePC, setActivePC] = useState<'PC-1' | 'PC-2'>('PC-1');
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    'Bienvenido a la consola del router.',
    'Conecte el cable de consola y presione Enter.',
  ]);
  const [commandInput, setCommandInput] = useState('');

  const pc1 = pcs.find(p => p.id === 'PC-1');
  const pc2 = pcs.find(p => p.id === 'PC-2');
  const activePCState = activePC === 'PC-1' ? pc1 : pc2;

  const handleCommand = (cmd: string) => {
    setTerminalOutput(prev => [...prev, `> ${cmd}`]);

    // Mock responses
    const responses: Record<string, string[]> = {
      'ping': ['Pinging...', 'Reply from 192.168.30.1: bytes=32 time<1ms TTL=255'],
      'ipconfig': [
        `IPv4 Address. . . . . . . . . . . : ${activePCState?.ip}`,
        `Subnet Mask . . . . . . . . . . . : ${activePCState?.mask}`,
        `Default Gateway . . . . . . . . . : ${activePCState?.gateway}`,
      ],
      'help': ['Comandos disponibles: ping, ipconfig, help, clear'],
      'clear': ['CLEAR_SCREEN'],
    };

    const lowerCmd = cmd.toLowerCase().trim();
    const response = responses[lowerCmd] || [`Comando no reconocido: ${cmd}`];

    if (response.includes('CLEAR_SCREEN')) {
      setTerminalOutput([]);
    } else {
      setTerminalOutput(prev => [...prev, ...response]);
    }
    setCommandInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(commandInput);
    }
  };

  if (phase !== 'DESKTOP') return null;

  return (
    <div className="desktop-view">
      <div className="desktop-header">
        <h2>Escritorio - {activePC}</h2>
        <div className="pc-tabs">
          <button
            className={activePC === 'PC-1' ? 'active' : ''}
            onClick={() => setActivePC('PC-1')}
          >
            PC-1
          </button>
          <button
            className={activePC === 'PC-2' ? 'active' : ''}
            onClick={() => setActivePC('PC-2')}
          >
            PC-2
          </button>
        </div>
        <button
          className="btn-secondary"
          onClick={() => dispatch.setPhase('LAB')}
        >
          ← Volver a la jaula
        </button>
      </div>

      <div className="desktop-content">
        <div className="panel ip-config">
          <h3>Configuración IP</h3>
          <div className="config-grid">
            <label>
              Dirección IP:
              <input
                type="text"
                value={activePCState?.ip || ''}
                onChange={e => dispatch.setPCConfig(activePC, e.target.value, activePCState?.mask || '', activePCState?.gateway || '')}
              />
            </label>
            <label>
              Máscara:
              <input
                type="text"
                value={activePCState?.mask || ''}
                onChange={e => dispatch.setPCConfig(activePC, activePCState?.ip || '', e.target.value, activePCState?.gateway || '')}
              />
            </label>
            <label>
              Puerta de enlace:
              <input
                type="text"
                value={activePCState?.gateway || ''}
                onChange={e => dispatch.setPCConfig(activePC, activePCState?.ip || '', activePCState?.mask || '', e.target.value)}
              />
            </label>
          </div>
          <p className="com-info">Puerto COM: COM{activePCState?.comPort}</p>
        </div>

        <div className="panel terminal-panel">
          <div className="terminal-header">
            <span>Terminal - PuTTY (Mock)</span>
            <button
              className={showTerminal ? 'active' : ''}
              onClick={() => setShowTerminal(!showTerminal)}
            >
              {showTerminal ? 'Cerrar' : 'Abrir Terminal'}
            </button>
          </div>

          {showTerminal && (
            <div className="terminal">
              <div className="terminal-output">
                {terminalOutput.map((line, i) => (
                  <div key={i} className="terminal-line">{line}</div>
                ))}
              </div>
              <div className="terminal-input-line">
                <span className="prompt">{"PC>"}</span>
                <input
                  type="text"
                  value={commandInput}
                  onChange={e => setCommandInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}