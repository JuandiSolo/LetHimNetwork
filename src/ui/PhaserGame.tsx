/**
 * Phaser Game React wrapper.
 * Manages Phaser lifecycle and sync with React store.
 */

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { CageScene } from '@game/CageScene';
import { useGameStore, usePhysicalAssignment, useCables, dispatch } from '@app/store';
import type { PhysicalAssignment, Cable } from '@core/types';

interface PhaserGameProps {
  onPortClick: (deviceId: string, portName: string) => void;
  onCableDrop: (cableType: string, fromDevice: string, fromPort: string, toDevice: string, toPort: string) => void;
}

// Phaser 4 config type (using any to avoid namespace issues)
type PhaserGameConfig = any;

export function PhaserGame({ onPortClick, onCableDrop }: PhaserGameProps) {
  const gameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CageScene | null>(null);

  const physicalAssignment = usePhysicalAssignment();
  const cables = useCables();
  const phase = useGameStore(s => s.phase);

  // Initialize Phaser
  useEffect(() => {
    if (gameRef.current || !containerRef.current) return;

    const config: PhaserGameConfig = {
      type: Phaser.WEBGL,
      parent: containerRef.current,
      width: '100%',
      height: '100%',
      backgroundColor: '#1a1a2e',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [CageScene],
      physics: {
        default: 'arcade',
      },
      render: {
        antialias: false,
        pixelArt: true,
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Get scene reference after it's created and inject callbacks
    game.events.once('ready', () => {
      sceneRef.current = game.scene.getScene('CageScene') as CageScene;
      if (sceneRef.current) {
        // Inject callbacks directly on scene instance
        (sceneRef.current as any).onPortClick = onPortClick;
        (sceneRef.current as any)._onCableDrop = onCableDrop;
        if (physicalAssignment) {
          sceneRef.current.updateData({ physicalAssignment, cables });
        }
      }
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [onPortClick, onCableDrop]);

  // Sync data from store to scene
  useEffect(() => {
    if (sceneRef.current && physicalAssignment) {
      sceneRef.current.updateData({ physicalAssignment, cables });
    }
  }, [physicalAssignment, cables]);

  // Handle phase changes - show/hide Phaser canvas
  useEffect(() => {
    if (gameRef.current && containerRef.current) {
      const canvas = containerRef.current.querySelector('canvas');
      if (canvas) {
        canvas.style.display = phase === 'LAB' ? 'block' : 'none';
      }
    }
  }, [phase]);

  // Render navigation button in LAB phase
  const showDesktopButton = phase === 'LAB';

  return (
    <div
      ref={containerRef}
      className="phaser-container"
      style={{
        width: '100%',
        height: '100%',
        display: phase === 'LAB' ? 'block' : 'none',
        position: 'relative'
      }}
    >
      {showDesktopButton && (
        <button
          className="btn-primary lab-to-desktop-btn"
          onClick={() => dispatch.setPhase('DESKTOP')}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            padding: '10px 20px',
            fontSize: '14px'
          }}
        >
          Ir a escritorio →
        </button>
      )}
    </div>
  );
}