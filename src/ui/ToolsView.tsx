/**
 * Tools/Cable inventory view - Phase after Quiz.
 * H1: Shows live cable inventory from store (remaining after connections).
 */

import { useGameStore, dispatch } from '@app/store';
import { CABLE_INVENTORY_T1, CABLE_BREAKDOWN_T1 } from '@core/scenario';

export function ToolsView(): React.ReactElement | null {
  const phase = useGameStore(s => s.phase);
  const cables = useGameStore(s => s.cables);

  if (phase !== 'TOOLS') return null;

  // Calculate remaining cables
  const used = { straight: 0, crossover: 0, usbEthernet: 0 };
  cables.forEach(c => { used[c.type]++; });

  const remaining = {
    straight: CABLE_INVENTORY_T1.straight - used.straight,
    crossover: CABLE_INVENTORY_T1.crossover - used.crossover,
    usbEthernet: CABLE_INVENTORY_T1.usbEthernet - used.usbEthernet,
  };

  const handleEnterLab = () => {
    dispatch.setPhase('LAB');
  };

  return (
    <div className="tools-view">
      <div className="tools-card">
        <h2>Inventario de Cables</h2>
        <p className="tools-note">Cantidad exacta, sin sobrantes. Usados se descuentan automáticamente.</p>

        <div className="cable-inventory">
          <div className="cable-type">
            <div className="cable-preview straight"></div>
            <div className="cable-info">
              <h4>Cable Ethernet Directo (RJ45-RJ45)</h4>
              <p>Equipos de distinto tipo + tramo consola</p>
              <span className="count">
                {remaining.straight} / {CABLE_INVENTORY_T1.straight} unidades
                {used.straight > 0 && <span className="used"> ({used.straight} usados)</span>}
              </span>
            </div>
          </div>

          <div className="cable-type">
            <div className="cable-preview crossover"></div>
            <div className="cable-info">
              <h4>Cable Ethernet Cruzado (RJ45-RJ45)</h4>
              <p>Router con router</p>
              <span className="count">
                {remaining.crossover} / {CABLE_INVENTORY_T1.crossover} unidades
                {used.crossover > 0 && <span className="used"> ({used.crossover} usados)</span>}
              </span>
            </div>
          </div>

          <div className="cable-type">
            <div className="cable-preview usb"></div>
            <div className="cable-info">
              <h4>Adaptador USB a Ethernet</h4>
              <p>PC a parrilla (solo consola)</p>
              <span className="count">
                {remaining.usbEthernet} / {CABLE_INVENTORY_T1.usbEthernet} unidad
                {used.usbEthernet > 0 && <span className="used"> ({used.usbEthernet} usado)</span>}
              </span>
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