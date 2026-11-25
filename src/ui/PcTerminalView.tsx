/**
 * PC Terminal View - Full screen terminal + config for selected PC.
 * Reached from PC_CABLES view by clicking on a PC.
 */

import { useState } from 'react';
import { usePCs, useGameStore, dispatch } from '@app/store';

export function PcTerminalView(): React.ReactElement | null {
  // Hooks MUST be called unconditionally at the top
  const phase = useGameStore(s => s.phase);
  const pcs = usePCs();
  const activeTerminalPC = useGameStore(s => s.activeTerminalPC);

  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    'Bienvenido a la consola.',
    'Conecte el cable de consola (USB → Parrilla → Router Console) y presione Enter.',
  ]);
  const [commandInput, setCommandInput] = useState('');

  // Early return AFTER hooks
  if (phase !== 'PC_TERMINAL' || !activeTerminalPC) return null;

  const pcState = pcs.find(p => p.id === activeTerminalPC);

  const handleCommand = (cmd: string) => {
    setTerminalOutput(prev => [...prev, `> ${cmd}`]);

    const responses: Record<string, string[]> = {
      'ping': ['Pinging...', 'Reply from 192.168.30.1: bytes=32 time<1ms TTL=255'],
      'ipconfig': [
        `IPv4 Address. . . . . . . . . . . : ${pcState?.ip}`,
        `Subnet Mask . . . . . . . . . . . : ${pcState?.mask}`,
        `Default Gateway . . . . . . . . . : ${pcState?.gateway}`,
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

  const handleBack = () => {
    dispatch.setActiveTerminalPC(null);
    dispatch.setPhase('PC_CABLES');
  };

  return (
    <div className="pc-terminal-view">
      <div className="terminal-header">
        <div className="header-left">
          <button className="btn-secondary btn-sm" onClick={handleBack}>
            ← Volver a Cableado
          </button>
          <h2>Terminal - {activeTerminalPC}</h2>
        </div>
        <div className="header-right">
          <span className="com-info">COM{pcState?.comPort} | {pcState?.ip}</span>
        </div>
      </div>

      <div className="terminal-container">
        <div className="terminal">
          <div className="terminal-output">
            {terminalOutput.map((line, i) => (
              <div key={i} className="terminal-line">{line}</div>
            ))}
          </div>
          <div className="terminal-input-line">
            <span className="prompt">{activeTerminalPC + '>'}</span>
            <input
              type="text"
              value={commandInput}
              onChange={e => setCommandInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder="Escriba comando (ping, ipconfig, help, clear)..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}