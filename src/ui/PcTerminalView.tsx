/**
 * PC Terminal View - Button-based terminal for PC (H2).
 * Per spec: ipconfig, ping (with destination selector), clear, help.
 * When console cable connected: shows 3 panels - IP Config, PC Terminal, Router Terminal.
 */

import { useState, useEffect } from 'react';
import { usePCs, useGameStore, dispatch } from '@app/store';
import { RouterTerminal } from './RouterTerminal';
import type { PcId, ValueListItem } from '@core/types';

interface PcTerminalViewProps {
  lines: Record<PcId, string[]>;
  setLines: React.Dispatch<React.SetStateAction<Record<PcId, string[]>>>;
}

const PC_COMMANDS = [
  { id: 'ipconfig', label: 'ipconfig', action: 'execute' },
  { id: 'ping', label: 'ping', action: 'value-select', valueType: 'ping-dest' },
  { id: 'clear', label: 'clear', action: 'execute' },
  { id: 'help', label: 'help', action: 'execute' },
];

export function PcTerminalView({ lines, setLines }: PcTerminalViewProps) {
  const activePc = useGameStore(s => s.activePc);
  const pcs = usePCs();
  const addressPlan = useGameStore(s => s.addressPlan);
  const consoleLink = useGameStore(s => s.consoleLink);
  const sessions = useGameStore(s => s.sessions);

  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [showValueSelector, setShowValueSelector] = useState<{
    items: ValueListItem[];
  } | null>(null);

  // Check if console is connected to a router
  const connectedRouter = consoleLink?.connectedRouter;
  const hasRouterSession = connectedRouter && sessions[connectedRouter];

  // Sync local lines state with props (kept in LabShell for per-PC history)
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

  const addOutput = (newLines: string[]) => {
    setTerminalOutput(prev => [...prev, ...newLines]);
  };

  const handleCommand = (cmdId: string) => {
    addOutput([`${activePc}> ${cmdId}`]);

    switch (cmdId) {
      case 'ipconfig': {
        if (pcState) {
          addOutput([
            `Configuración IP de Windows`,
            ``,
            `Adaptador Ethernet:`,
            `   Dirección IPv4. . . . . . . . . . . : ${pcState.ip}`,
            `   Máscara de subred . . . . . . . . . : ${pcState.mask}`,
            `   Puerta de enlace predeterminada . . . : ${pcState.gateway}`,
          ]);
        }
        break;
      }
      case 'clear': {
        setTerminalOutput([]);
        break;
      }
      case 'help': {
        addOutput([
          'Comandos disponibles:',
          '  ipconfig     - Muestra configuración IP',
          '  ping <dest>  - Envía eco ICMP a destino (H3: simulación real)',
          '  clear        - Limpia la pantalla',
          '  help         - Muestra esta ayuda',
          '',
          'Nota: ping real disponible en H3. Por ahora muestra destinos disponibles.',
        ]);
        break;
      }
      case 'ping': {
        // Handled via value selector
        break;
      }
    }
  };

  const handleValueSelect = (value: string) => {
    if (!showValueSelector) return;
    if (value === 'CANCEL') {
      setShowValueSelector(null);
      return;
    }
    // Execute ping with selected destination
    addOutput([`${activePc}> ping ${value}`]);
    addOutput(['Ping no disponible hasta H3 (motor RIPv1/ping).', `Destino seleccionado: ${value}`]);
    setShowValueSelector(null);
  };

  const handleButtonClick = (cmdId: string) => {
    if (cmdId === 'ping' && addressPlan) {
      // Open value selector for ping destinations
      import('@core/cliMenu').then(({ getPingDestinations }) => {
        const items = getPingDestinations(addressPlan);
        setShowValueSelector({ items: [...items, { value: 'CANCEL', label: 'Cancelar', description: 'Volver' }] });
      });
    } else {
      handleCommand(cmdId);
    }
  };

  const handleExit = () => {
    dispatch.openPc(activePc); // Back to PC view, keeps activePc
  };

  return (
    <div className='terminal-overlay'>
      <div className={`terminal-container ${hasRouterSession ? 'three-panels' : ''}`}>
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

        {/* Middle panel: PC Terminal */}
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

            {/* Command buttons */}
            <div className='terminal-menu pc-menu' role="menu" aria-label="Comandos PC">
              {PC_COMMANDS.map(cmd => (
                <button
                  key={cmd.id}
                  className="menu-btn"
                  onClick={() => handleButtonClick(cmd.id)}
                  role="menuitem"
                  tabIndex={0}
                >
                  {cmd.label}
                </button>
              ))}
            </div>

            {/* Value selector overlay */}
            {showValueSelector && (
              <div className="value-selector" role="dialog" aria-modal="true" aria-label="Seleccione destino ping">
                <div className="selector-header">Destino para ping</div>
                <div className="selector-list" role="listbox">
                  {showValueSelector.items.map(item => (
                    <button
                      key={item.value}
                      className="selector-item"
                      onClick={() => handleValueSelect(item.value)}
                      role="option"
                    >
                      <span className="item-value">{item.label}</span>
                      {item.description && <span className="item-desc">{item.description}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Router Terminal (when console connected) */}
        {hasRouterSession && connectedRouter && (
          <div className='terminal-router-panel'>
            <RouterTerminal routerId={connectedRouter} onClose={handleExit} embedded={true} />
          </div>
        )}
      </div>
    </div>
  );
}