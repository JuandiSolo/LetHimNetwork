/**
 * Topology/Protocol selector - Phase after X/Y input.
 * Only T1 IPv4 RIPv1 available in Phase 1.
 */

import { useGameStore, dispatch } from '@app/store';

export function TopologySelector(): React.ReactElement | null {
  const phase = useGameStore(s => s.phase);
  const addressPlan = useGameStore(s => s.addressPlan);

  if (phase !== 'SELECT_TOPOLOGY') return null;

  const handleStart = () => {
    dispatch.setPhase('QUIZ');
  };

  return (
    <div className="topology-selector">
      <div className="selector-card">
        <h2>Seleccionar Topología y Protocolo</h2>

        <div className="topology-option selected">
          <div className="topology-info">
            <h3>Topología 1 - IPv4</h3>
            <p>3 routers, 2 PCs, 1 switch compartido, RIPv1</p>
          </div>
          <span className="badge">Disponible</span>
        </div>

        <div className="topology-option disabled">
          <div className="topology-info">
            <h3>Topología 2 - IPv6</h3>
            <p>Fase 2 - No disponible</p>
          </div>
          <span className="badge disabled">Bloqueado</span>
        </div>

        <div className="topology-option disabled">
          <div className="topology-info">
            <h3>Topología 3 - BGP</h3>
            <p>Fase 3 - No disponible</p>
          </div>
          <span className="badge disabled">Bloqueado</span>
        </div>

        {addressPlan && (
          <div className="address-summary">
            <h4>Sus direcciones (X={addressPlan.input.section}, Y={addressPlan.input.group}):</h4>
            <div className="summary-grid">
              <span>PC-1: {addressPlan.pc1.ip}</span>
              <span>PC-2: {addressPlan.pc2.ip}</span>
              <span>R1: {addressPlan.r1.g0_0}, {addressPlan.r1.g0_1}</span>
              <span>R2: {addressPlan.r2.g0_0}, {addressPlan.r2.g0_1}</span>
              <span>R3: {addressPlan.r3.g0_0}, {addressPlan.r3.g0_1}</span>
            </div>
          </div>
        )}

        <button className="btn-primary btn-large" onClick={handleStart}>
          Continuar al Miniquiz
        </button>
      </div>
    </div>
  );
}