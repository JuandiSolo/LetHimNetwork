/**
 * RouterTerminal - React overlay for CLI simulation (H2).
 * DOM-based, accessible, no WebGL dependency.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore, dispatch } from '@app/store';
import type { RouterId, ExecMode, ValueListItem, TerminalSession } from '@core/types';

interface RouterTerminalProps {
  routerId: RouterId;
  onClose: () => void;
  embedded?: boolean; // When true, render inline without overlay
}

export const RouterTerminal: React.FC<RouterTerminalProps> = ({ routerId, onClose, embedded = false }) => {
  const state = useGameStore();
  const session = state.sessions[routerId];
  const routerState = state.routers[routerId];
  const consoleLink = state.consoleLink;
  const physicalAssignment = state.physicalAssignment;
  const addressPlan = state.addressPlan;
  const activePc = state.activePc;

  const [menuOptions, setMenuOptions] = useState<Array<{id: string; label: string}>>([]);
  const [showValueSelector, setShowValueSelector] = useState<{
    valueType: string;
    items: ValueListItem[];
    commandTemplate: string;
    firstValue?: string;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState<'erase' | 'reload' | null>(null);
  const [awaitingEnter, setAwaitingEnter] = useState(false);
  const [puttyCom, setPuttyCom] = useState('');
  const [showPutty, setShowPutty] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLButtonElement>(null);

  // Build menu options when session/mode changes
  useEffect(() => {
    if (!session || !physicalAssignment) {
      setMenuOptions([]);
      return;
    }

    // Import buildMenuOptions dynamically to avoid circular deps
    import('@core/cliMenu').then(({ buildMenuOptions }) => {
      const options = buildMenuOptions(session.mode, routerId, physicalAssignment);
      // Filter out help-mark (?) from main buttons, keep it as a separate key
      const mainButtons = options.filter(o => o.id !== 'help-mark');
      setMenuOptions(mainButtons.map(o => ({ id: o.id, label: o.label })));
    });
  }, [session?.mode, routerId, physicalAssignment]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [session?.output]);

  // Focus first button on mount/mode change
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [menuOptions.length, session?.mode]);

  const handleOptionClick = useCallback((optionId: string) => {
    if (awaitingEnter) {
      setAwaitingEnter(false);
      // Re-dispatch the same option after Enter
      setTimeout(() => handleOptionClick(optionId), 0);
      return;
    }

    if (showConfirm) {
      if (optionId === 'confirm') {
        dispatch.execCliOption(routerId, 'confirm');
        setShowConfirm(null);
      } else if (optionId === 'cancel') {
        dispatch.execCliOption(routerId, 'cancel');
        setShowConfirm(null);
      }
      return;
    }

    if (showValueSelector) {
      // Value selection handled separately
      return;
    }

    dispatch.execCliOption(routerId, optionId);
  }, [routerId, awaitingEnter, showConfirm, showValueSelector]);

  const handleValueSelect = useCallback((value: string) => {
    if (!showValueSelector) return;

    if (value === 'CANCEL') {
      setShowValueSelector(null);
      return;
    }

    if (showValueSelector.firstValue === undefined) {
      // First value (IP or network)
      if (showValueSelector.valueType === 'ip-address') {
        // Need mask second
        import('@core/cliMenu').then(({ getValueList }) => {
          const masks = getValueList('mask', addressPlan!);
          setShowValueSelector({
            ...showValueSelector,
            firstValue: value,
            items: [...masks, { value: 'CANCEL', label: 'Cancelar', description: 'Volver' }],
            valueType: 'mask',
          });
        });
      } else {
        // Single value (network, ping-dest)
        dispatch.execCliOption(routerId, showValueSelector.commandTemplate.split(' ')[0], value);
        setShowValueSelector(null);
      }
    } else {
      // Second value (mask for ip address)
      dispatch.execCliOption(routerId, 'ip-address', showValueSelector.firstValue, value);
      setShowValueSelector(null);
    }
  }, [showValueSelector, addressPlan, routerId]);

  // Check for pending confirmations and value selections after dispatch
  useEffect(() => {
    if (!session) return;

    if (session.pendingConfirm) {
      setShowConfirm(session.pendingConfirm);
    } else {
      setShowConfirm(null);
    }

    if (session.awaitingEnter) {
      setAwaitingEnter(true);
    } else {
      setAwaitingEnter(false);
    }
  }, [session?.pendingConfirm, session?.awaitingEnter]);

  const handlePuttyOpen = () => {
    const pc = state.pcs.find((p: { id: string; comPort: number }) => p.id === activePc);
    if (pc && consoleLink?.connectedRouter) {
      setPuttyCom(String(pc.comPort));
      setShowPutty(true);
    }
  };

  const handlePuttyConnect = () => {
    const pc = state.pcs.find((p: { id: string; comPort: number }) => p.id === activePc);
    if (pc && consoleLink?.connectedRouter) {
      const comNum = parseInt(puttyCom, 10);
      if (comNum === pc.comPort) {
        setShowPutty(false);
        // Session already opened via CONNECT_CONSOLE
      } else {
        alert(`No se pudo abrir el puerto COM${comNum}`);
      }
    }
  };

  const handlePuttyClose = () => {
    setShowPutty(false);
    setPuttyCom('');
  };

  if (!session || !routerState) {
    const noSessionContent = (
      <div className="router-terminal">
        <div className="terminal-header">
          <span>Router {routerId}</span>
          {!embedded && <button onClick={onClose} aria-label="Cerrar terminal">×</button>}
        </div>
        <div className="terminal-output" ref={outputRef} role="log" aria-live="polite">
          <p>Sin conexión de consola. Conecte el cable USB→RJ45 del PC al router.</p>
        </div>
      </div>
    );
    return embedded ? noSessionContent : (
      <div className="router-terminal-overlay" role="dialog" aria-modal="true" aria-label="Terminal del router">
        {noSessionContent}
      </div>
    );
  }

  const isConnected = consoleLink?.connectedRouter === routerId;
  const prompt = `${routerState.running.hostname}${getPromptChar(session.mode)}`;

  const terminalContent = (
    <div className="router-terminal">
      {/* Header */}
      <div className="terminal-header">
        <div className="header-left">
          <span className="router-badge">{routerId}</span>
          <span className="mode-badge">{session.mode}</span>
          {session.interfaceContext && <span className="iface-badge">{session.interfaceContext}</span>}
        </div>
        <div className="header-right">
          {!isConnected && !embedded && (
            <button className="btn-putty" onClick={handlePuttyOpen} disabled={!consoleLink?.connectedRouter}>
              🔌 PuTTY
            </button>
          )}
          {!embedded && (
            <button className="btn-close" onClick={onClose} aria-label="Cerrar terminal">×</button>
          )}
        </div>
      </div>

      {/* Connection status */}
      {!isConnected && (
        <div className="connection-banner">
          ⚠️ Conexión interrumpida. {session.awaitingEnter ? 'Pulse Enter para continuar.' : 'Conecte el cable de consola.'}
        </div>
      )}

      {/* Output area */}
      <div className="terminal-output" ref={outputRef} role="log" aria-live="polite" aria-label="Salida del terminal">
        {session.output.map((line: string, i: number) => (
          <div key={i} className="output-line">{line}</div>
        ))}
        {session.awaitingEnter && <div className="output-line awaiting-enter">▌</div>}
      </div>

      {/* Current prompt line */}
      <div className="prompt-line">
        <span className="prompt">{prompt}</span>
        {showValueSelector && (
          <ValueSelector
            items={showValueSelector.items}
            onSelect={handleValueSelect}
            onCancel={() => setShowValueSelector(null)}
            label={showValueSelector.valueType === 'mask' ? `Máscara para ${showValueSelector.firstValue}` : 'Seleccione un valor'}
          />
        )}
        {showConfirm && (
          <ConfirmDialog
            action={showConfirm}
            onConfirm={() => handleOptionClick('confirm')}
            onCancel={() => handleOptionClick('cancel')}
          />
        )}
        {awaitingEnter && (
          <span className="press-enter">[Pulse Enter]</span>
        )}
      </div>

      {/* Menu buttons */}
      <div className="terminal-menu" role="menu" aria-label="Comandos disponibles">
        {menuOptions.map((opt, i) => (
          <button
            key={opt.id}
            ref={i === 0 ? inputRef : undefined}
            className="menu-btn"
            onClick={() => handleOptionClick(opt.id)}
            disabled={!isConnected || awaitingEnter || !!showConfirm || !!showValueSelector}
            role="menuitem"
            tabIndex={0}
          >
            {opt.label}
          </button>
        ))}
        {/* Help (?) button always available */}
        <button
          className="menu-btn help-btn"
          onClick={() => handleOptionClick('help-mark')}
          disabled={!isConnected || awaitingEnter || !!showConfirm || !!showValueSelector}
          role="menuitem"
          aria-label="Ayuda contextual"
        >
          ?
        </button>
      </div>
    </div>
  );

  if (embedded) {
    return <>{terminalContent}</>;
  }

  return (
    <div className="router-terminal-overlay" role="dialog" aria-modal="true" aria-label={`Terminal ${routerId} - ${session.mode}`}>
      {terminalContent}

      {/* PuTTY Dialog */}
      {showPutty && (
        <div className="putty-overlay" onClick={handlePuttyClose}>
          <div className="putty-dialog" onClick={e => e.stopPropagation()}>
            <h3>PuTTY Configuration</h3>
            <div className="putty-field">
              <label>Serial line: COM<input type="text" value={puttyCom} onChange={e => setPuttyCom(e.target.value)} maxLength={2} /></label>
            </div>
            <div className="putty-field">
              <label>Speed: <input type="text" value="9600" readOnly /></label>
            </div>
            <div className="putty-field">
              <label>Data bits: <input type="text" value="8" readOnly /></label>
            </div>
            <div className="putty-field">
              <label>Stop bits: <input type="text" value="1" readOnly /></label>
            </div>
            <div className="putty-field">
              <label>Parity: <input type="text" value="None" readOnly /></label>
            </div>
            <div className="putty-field">
              <label>Flow control: <input type="text" value="None" readOnly /></label>
            </div>
            <div className="putty-buttons">
              <button onClick={handlePuttyConnect}>Open</button>
              <button onClick={handlePuttyClose}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== SUB-COMPONENTS ====================

function getPromptChar(mode: ExecMode): string {
  switch (mode) {
    case 'user': return '>';
    case 'privileged': return '#';
    case 'config': return '(config)#';
    case 'config-if': return '(config-if)#';
    case 'config-router': return '(config-router)#';
    default: return '#';
  }
}

interface ValueSelectorProps {
  items: ValueListItem[];
  onSelect: (value: string) => void;
  onCancel: () => void;
  label: string;
}

const ValueSelector: React.FC<ValueSelectorProps> = ({ items, onSelect, onCancel, label }) => (
  <div className="value-selector" role="dialog" aria-modal="true" aria-label={label}>
    <div className="selector-header">{label}</div>
    <div className="selector-list" role="listbox">
      {items.map(item => (
        <button
          key={item.value}
          className="selector-item"
          onClick={() => onSelect(item.value)}
          role="option"
          aria-selected={false}
        >
          <span className="item-value">{item.label}</span>
          {item.description && <span className="item-desc">{item.description}</span>}
        </button>
      ))}
    </div>
  </div>
);

interface ConfirmDialogProps {
  action: 'erase' | 'reload';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ action, onConfirm, onCancel }) => {
  const messages = {
    erase: '¿Borrar la configuración de inicio (NVRAM)? Esta acción no se puede deshacer.',
    reload: '¿Recargar el router? Se perderán los cambios no guardados.',
  };
  return (
    <div className="confirm-dialog" role="dialog" aria-modal="true" aria-label="Confirmar acción">
      <p>{messages[action]}</p>
      <div className="confirm-buttons">
        <button className="btn-confirm" onClick={onConfirm}>Confirmar</button>
        <button className="btn-cancel" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
};

export default RouterTerminal;