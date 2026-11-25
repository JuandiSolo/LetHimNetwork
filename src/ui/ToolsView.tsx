/**
 * Tools/Cable inventory view - Phase after Quiz.
 * Mock for H0 - shows cable inventory and allows proceeding to Lab.
 */

import { useGameStore, dispatch } from '@app/store';

export function ToolsView(): React.ReactElement | null {
  const phase = useGameStore(s => s.phase);

  if (phase !== 'TOOLS') return null;

  const handleEnterLab = () => {
    dispatch.setPhase('LAB');
  };

  return (
    <div className="tools-view">
      <div className="tools-card">
        <h2>Inventario de Cables</h2>
        <p className="tools-note">Seleccione los cables necesarios. Cantidad exacta, sin sobrantes.</p>

        <div className="cable-inventory">
          <div className="cable-type">
            <div className="cable-preview straight"></div>
            <div className="cable-info">
              <h4>Cable Directo (RJ45-RJ45)</h4>
              <p>Para conexiones entre dispositivos de distinto tipo</p>
              <span className="count">6 unidades</span>
            </div>
          </div>

          <div className="cable-type">
            <div className="cable-preview crossover"></div>
            <div className="cable-info">
              <h4>Cable Cruzado (RJ45-RJ45)</h4>
              <p>Para conexiones entre dispositivos del mismo tipo</p>
              <span className="count">0 unidades</span>
            </div>
          </div>

          <div className="cable-type">
            <div className="cable-preview console"></div>
            <div className="cable-info">
              <h4>Cable Consola (USB-RJ45)</h4>
              <p>Para acceso CLI a routers</p>
              <span className="count">2 unidades</span>
            </div>
          </div>
        </div>

        <div className="tools-actions">
          <button className="btn-primary btn-large" onClick={handleEnterLab}>
            Entrar a la Jaula
          </button>
        </div>
      </div>
    </div>
  );
}