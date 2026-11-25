/**
 * Desktop/PC view - React component for physical PC representation.
 * H1/H4 Mock: Shows PCs with ports (NIC, USB) and patch panel jacks.
 * Buttons: "Cableado" → PC_CABLES phase, Click PC → PC_TERMINAL phase
 */

import { usePCs, useGameStore, dispatch } from '@app/store';

export function DesktopView(): React.ReactElement | null {
  const pcs = usePCs();
  const phase = useGameStore(s => s.phase);

  if (phase !== 'DESKTOP') return null;

  const pc1 = pcs.find(p => p.id === 'PC-1');
  const pc2 = pcs.find(p => p.id === 'PC-2');

  // Patch panel jacks per PC (mock: A1-A8 for PC-1, B1-B8 for PC-2)
  const pc1Jacks = Array.from({ length: 8 }, (_, i) => `A${i + 1}`);
  const pc2Jacks = Array.from({ length: 8 }, (_, i) => `B${i + 1}`);

  const goToCables = () => {
    dispatch.setPhase('PC_CABLES');
  };

  const openTerminal = (pcId: 'PC-1' | 'PC-2') => {
    dispatch.setActiveTerminalPC(pcId);
    dispatch.setPhase('PC_TERMINAL');
  };

  return (
    <div className="desktop-view">
      <div className="desktop-header">
        <h2>Escritorio - PCs Físicos</h2>
        <div className="header-actions">
          <button className="btn-primary" onClick={goToCables}>
            Cableado PCs ↔ Parrillas
          </button>
          <button
            className="btn-secondary"
            onClick={() => dispatch.setPhase('LAB')}
          >
            ← Volver a la jaula
          </button>
        </div>
      </div>

      <div className="desktop-content">
        {/* PC Physical Representation Area */}
        <div className="pc-physical-area">
          <div className="pc-physical-card" onClick={() => openTerminal('PC-1')}>
            <div className="pc-box">
              <div className="pc-label">PC-1</div>
              <div className="pc-ports">
                <div className="port-row">
                  <span className="port-label">NIC</span>
                  <div className="port rj45" title="RJ45 - Ethernet a Switch"></div>
                </div>
                <div className="port-row">
                  <span className="port-label">USB</span>
                  <div className="port usb" title="USB - Consola a Parrilla"></div>
                </div>
              </div>
            </div>
            <div className="patch-panel-mini">
              <h4>Parrilla A (PC-1)</h4>
              <div className="patch-jacks">
                {pc1Jacks.map(jack => (
                  <div key={jack} className="patch-jack" title={`Parrilla ${jack}`}>{jack}</div>
                ))}
              </div>
            </div>
            <div className="pc-actions">
              <button className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); openTerminal('PC-1'); }}>
                Terminal
              </button>
            </div>
          </div>

          <div className="pc-physical-card" onClick={() => openTerminal('PC-2')}>
            <div className="pc-box">
              <div className="pc-label">PC-2</div>
              <div className="pc-ports">
                <div className="port-row">
                  <span className="port-label">NIC</span>
                  <div className="port rj45" title="RJ45 - Ethernet a Switch"></div>
                </div>
                <div className="port-row">
                  <span className="port-label">USB</span>
                  <div className="port usb" title="USB - Consola a Parrilla"></div>
                </div>
              </div>
            </div>
            <div className="patch-panel-mini">
              <h4>Parrilla B (PC-2)</h4>
              <div className="patch-jacks">
                {pc2Jacks.map(jack => (
                  <div key={jack} className="patch-jack" title={`Parrilla ${jack}`}>{jack}</div>
                ))}
              </div>
            </div>
            <div className="pc-actions">
              <button className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); openTerminal('PC-2'); }}>
                Terminal
              </button>
            </div>
          </div>
        </div>

        {/* Config Panel - always visible at bottom */}
        <div className="pc-config-panel">
          <h3>Configuración IP de Referencia</h3>
          <div className="config-grid-full">
            <div className="pc-config-col">
              <h4>PC-1</h4>
              <div className="config-grid">
                <label>
                  Dirección IP:
                  <input type="text" value={pc1?.ip || ''} readOnly />
                </label>
                <label>
                  Máscara:
                  <input type="text" value={pc1?.mask || ''} readOnly />
                </label>
                <label>
                  Puerta de enlace:
                  <input type="text" value={pc1?.gateway || ''} readOnly />
                </label>
              </div>
              <p className="com-info">Puerto COM: COM{pc1?.comPort}</p>
            </div>
            <div className="pc-config-col">
              <h4>PC-2</h4>
              <div className="config-grid">
                <label>
                  Dirección IP:
                  <input type="text" value={pc2?.ip || ''} readOnly />
                </label>
                <label>
                  Máscara:
                  <input type="text" value={pc2?.mask || ''} readOnly />
                </label>
                <label>
                  Puerta de enlace:
                  <input type="text" value={pc2?.gateway || ''} readOnly />
                </label>
              </div>
              <p className="com-info">Puerto COM: COM{pc2?.comPort}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}