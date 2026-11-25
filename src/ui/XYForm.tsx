/**
 * X/Y input form - entry point for the game.
 * Validates section (X) and group (Y) per addressing rules.
 */

import { useState, FormEvent } from 'react';
import { useGameStore, dispatch } from '@app/store';
import { deriveAddresses } from '@core/addressing';
import type { ValidationError } from '@core/types';

export function XYForm(): React.ReactElement | null {
  const [section, setSection] = useState('');
  const [group, setGroup] = useState('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [preview, setPreview] = useState<ReturnType<typeof deriveAddresses> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const phase = useGameStore(state => state.phase);

  const validateAndPreview = () => {
    const X = parseInt(section, 10);
    const Y = parseInt(group, 10);

    if (isNaN(X) || isNaN(Y)) {
      setErrors([{ field: 'section', message: 'Ingrese valores numéricos' }]);
      setPreview(null);
      return null;
    }

    const result = deriveAddresses({ section: X, group: Y });
    if (!result.ok) {
      setErrors(result.error);
      setPreview(null);
    } else {
      setErrors([]);
      setPreview(result);
    }
    return result;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateAndPreview();

    if (result?.ok) {
      setSubmitting(true);
      // Use timestamp as seed for now
      const seed = Date.now() / 1e9;
      dispatch.startGame(result.value.input.section, result.value.input.group, seed);
      dispatch.setPhase('SELECT_TOPOLOGY');
      setSubmitting(false);
    }
  };

  const handleInputChange = (newSection?: string, newGroup?: string) => {
    // Clear errors on input
    if (errors.length > 0) setErrors([]);
    // Validate using passed values (not stale state)
    const X = newSection !== undefined ? parseInt(newSection, 10) : parseInt(section, 10);
    const Y = newGroup !== undefined ? parseInt(newGroup, 10) : parseInt(group, 10);

    if (isNaN(X) || isNaN(Y)) {
      setErrors([{ field: 'section', message: 'Ingrese valores numéricos' }]);
      setPreview(null);
      return;
    }

    const result = deriveAddresses({ section: X, group: Y });
    if (!result.ok) {
      setErrors(result.error);
      setPreview(null);
    } else {
      setErrors([]);
      setPreview(result);
    }
  };

  if (phase !== 'HOME') return null;

  return (
    <div className="xy-form-container">
      <div className="xy-form-card">
        <h1>Let Him Network</h1>
        <p className="subtitle">Topología 1 · IPv4 · RIPv1</p>

        <form onSubmit={handleSubmit} className="xy-form">
          <div className="form-group">
            <label htmlFor="section">Sección (X)</label>
            <input
              id="section"
              type="number"
              min="1"
              max="9"
              value={section}
              onChange={e => { const v = e.target.value; setSection(v); handleInputChange(v, group); }}
              placeholder="1-9"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="group">Grupo (Y)</label>
            <input
              id="group"
              type="number"
              min="1"
              max="18"
              value={group}
              onChange={e => { const v = e.target.value; setGroup(v); handleInputChange(section, v); }}
              placeholder="1-18"
              required
            />
          </div>

          {errors.length > 0 && (
            <div className="errors" role="alert">
              {errors.map((err, i) => (
                <div key={i} className="error">{err.message}</div>
              ))}
            </div>
          )}

          {preview?.ok && (
            <div className="preview">
              <h3>Direcciones calculadas:</h3>
              <div className="preview-grid">
                <div><strong>PC-1:</strong> {preview.value.pc1.ip}/{preview.value.pc1.mask} GW: {preview.value.pc1.gateway}</div>
                <div><strong>PC-2:</strong> {preview.value.pc2.ip}/{preview.value.pc2.mask} GW: {preview.value.pc2.gateway}</div>
                <div><strong>R1 G0/0:</strong> {preview.value.r1.g0_0} | <strong>G0/1:</strong> {preview.value.r1.g0_1}</div>
                <div><strong>R2 G0/0:</strong> {preview.value.r2.g0_0} | <strong>G0/1:</strong> {preview.value.r2.g0_1} | <strong>Lo2:</strong> {preview.value.r2.loopback2}</div>
                <div><strong>R3 G0/0:</strong> {preview.value.r3.g0_0} | <strong>G0/1:</strong> {preview.value.r3.g0_1} | <strong>Lo3:</strong> {preview.value.r3.loopback3}</div>
                <div><strong>YX:</strong> {preview.value.yx}</div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || errors.length > 0 || !preview?.ok}
          >
            {submitting ? 'Iniciando...' : 'Comenzar laboratorio'}
          </button>
        </form>

        <p className="note">
          X/Y quedan fijos durante el laboratorio. Para cambiarlos, inicie uno nuevo.
        </p>
      </div>
    </div>
  );
}