/**
 * PC Terminal View - Full screen terminal + IP config for active PC.
 * Shown when labView === 'TERMINAL' as React overlay.
 */

import { useState, useEffect } from 'react';
import { usePCs, useGameStore, dispatch } from '@app/store';
import type { PcId } from '@core/types';

interface PcTerminalViewProps {
  lines: Record<PcId, string[]>;
  setLines: React.Dispatch<React.SetStateAction<Record<PcId, string[]>>>;
}

export function PcTerminalView({ lines, setLines }: PcTerminalViewProps) {
  const activePc = useGameStore(s => s.activePc);
  const pcs = usePCs();

  // Sync local lines state with props (kept in LabShell for per-PC history)
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [commandInput, setCommandInput] = useState('');

  // Load history when activePc changes
  useEffect(() => {
    setTerminalOutput(lines[activePc] || []);
  }, [activePc, lines]);

  // Save history when output changes
  useEffect(() => {
    if (terminalOutput.length > 0) {
      setLines(prev => ({ ...prev, [activePc]: terminalOutput }));
    }
  }, [terminalOutput, activePc, setLines]);

  const pcState = pcs.find(p => p.id === activePc);

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

  const handleExit = () => {
    dispatch.openPc(activePc); // Back to PC view, keeps activePc
  };

  return (
    <div className='terminal-overlay'>
      <div className='terminal-container'>
        {/* Left panel: IP Config */}
        <div className='terminal-ip-panel'>
          <h3>Configuración IP - {activePc}</h3>
          <div className='config-grid'>
            <label>
              <span>Dirección IP</span>
              <input type='text' value={pcState?.ip || ''} readOnly />
            </label>
            <label>
              <span>Máscara</span>
              <input type='text' value={pcState?.mask || ''} readOnly />
            </label>
            <label>
              <span>Puerta de enlace</span>
              <input type='text' value={pcState?.gateway || ''} readOnly />
            </label>
            <label>
              <span>Puerto COM</span>
              <input type='text' value={`COM${pcState?.comPort || ''}`} readOnly />
            </label>
          </div>
        </div>

        {/* Right panel: Terminal */}
        <div className='terminal-main'>
          <div className='terminal-header'>
            <h3>{activePc} - Terminal</h3>
            <button className='btn-secondary btn-sm' onClick={handleExit}>Salir</button>
          </div>
          <div className='terminal'>
            <div className='terminal-output'>
              {terminalOutput.map((line, i) => (
                <div key={i} className='terminal-line'>{line}</div>
              ))}
            </div>
            <div className='terminal-input-line'>
              <span className='prompt'>{`${activePc}>`}</span>
              <input
                type='text'
                value={commandInput}
                onChange={e => setCommandInput(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                placeholder='Escriba comando (ping, ipconfig, help, clear)...'
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}