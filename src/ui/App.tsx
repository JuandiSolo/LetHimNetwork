/**
 * Main App component - orchestrates all views and phases.
 */

import { useGameStore, dispatch } from '@app/store';
import { usePhysicalAssignment, useCables } from '@app/store';
import { XYForm } from './XYForm';
import { TopologySelector } from './TopologySelector';
import { Quiz } from './Quiz';
import { ToolsView } from './ToolsView';
import { PhaserGame } from './PhaserGame';
import { DesktopView } from './DesktopView';
import { PCCableScene } from '@game/PCCableScene';
import { PcTerminalView } from './PcTerminalView';
import Phaser from 'phaser';
import { useEffect, useRef, useState } from 'react';

function handlePortClick(deviceId: string, portName: string) {
  console.log('Port clicked:', deviceId, portName);
  if (portName === 'TERMINAL') {
    // Special signal from PC cable scene to open terminal
    dispatch.setActiveTerminalPC(deviceId as 'PC-1' | 'PC-2');
    dispatch.setPhase('PC_TERMINAL');
  }
}

function handleCableDrop(
  cableType: string,
  fromDevice: string,
  fromPort: string,
  toDevice: string,
  toPort: string
) {
  console.log('Cable drop:', cableType, fromDevice, fromPort, '→', toDevice, toPort);
}

// React wrapper for PCCableScene (similar to PhaserGame)
function PcCableView() {
  const physicalAssignment = usePhysicalAssignment();
  const cables = useCables();
  const phase = useGameStore(s => s.phase);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const [cableType, setCableType] = useState<'straight' | 'crossover' | 'usbEthernet'>('straight');

  useEffect(() => {
    if (gameRef.current || !containerRef.current) return;

    const config: any = {
      type: Phaser.WEBGL,
      parent: containerRef.current,
      width: '100%',
      height: '100%',
      backgroundColor: '#1a1a2e',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [PCCableScene],
      physics: { default: 'arcade' },
      render: { antialias: false, pixelArt: true },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.events.once('ready', () => {
      sceneRef.current = game.scene.getScene('PCCableScene');
      if (sceneRef.current) {
        (sceneRef.current as any).onPortClick = handlePortClick;
        (sceneRef.current as any)._onCableDrop = handleCableDrop;
        (sceneRef.current as any).onCableAdd = (cable: any) => dispatch.addCable(cable);
        (sceneRef.current as any).onCableRemove = (cableId: string) => dispatch.removeCable(cableId);
        (sceneRef.current as any).onCableSeated = (cableId: string, seated: boolean) => dispatch.setCableSeated(cableId, seated);
        (sceneRef.current as any).onBackToDesktop = () => dispatch.setPhase('DESKTOP');
        if (physicalAssignment) {
          sceneRef.current.updateData({ physicalAssignment, cables, selectedPC: null });
        }
      }
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [physicalAssignment]);

  useEffect(() => {
    if (sceneRef.current && physicalAssignment) {
      sceneRef.current.updateData({ physicalAssignment, cables, selectedPC: null });
    }
  }, [physicalAssignment, cables]);

  useEffect(() => {
    if (gameRef.current && containerRef.current) {
      const canvas = containerRef.current.querySelector('canvas');
      if (canvas) {
        canvas.style.display = phase === 'PC_CABLES' ? 'block' : 'none';
        // Focus canvas when phase becomes active for keyboard input
        if (phase === 'PC_CABLES') {
          canvas.focus();
        }
      }
    }
  }, [phase]);

  const showCableSelector = phase === 'PC_CABLES';

  return (
    <div
      ref={containerRef}
      className="phaser-container"
      style={{
        width: '100vw',
        height: '100vh',
        display: phase === 'PC_CABLES' ? 'block' : 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 10,
      }}
    >
      {showCableSelector && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 1000,
            display: 'flex',
            gap: '8px',
            background: 'rgba(26, 26, 46, 0.95)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #2a2a4a',
          }}
        >
          <span style={{ color: '#888', fontFamily: 'monospace', fontSize: '12px', alignSelf: 'center' }}>Cable:</span>
          {(['straight', 'usbEthernet'] as const).map((type, idx) => (
            <button
              key={type}
              onClick={() => {
                setCableType(type);
                // Sync with Phaser scene
                if (sceneRef.current) {
                  sceneRef.current.setCableType(type);
                }
              }}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 600,
                border: '2px solid',
                borderColor: cableType === type ? '#00d9a5' : '#3a3a5a',
                background: cableType === type ? 'rgba(0, 217, 165, 0.2)' : 'transparent',
                color: cableType === type ? '#00d9a5' : '#eaeaea',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {type === 'straight' ? `Recto (${idx + 1}) - NIC↔Parrilla` : `USB-ETH (${idx + 1}) - USB↔Parrilla`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function App(): React.ReactElement {
  const phase = useGameStore(s => s.phase);
  const isDev = import.meta.env.DEV;

  return (
    <div className="app">
      {/* Phase: HOME - X/Y Input */}
      <XYForm />

      {/* Phase: SELECT_TOPOLOGY */}
      <TopologySelector />

      {/* Phase: QUIZ */}
      <Quiz />

      {/* Phase: TOOLS - Cable Inventory */}
      <ToolsView />

      {/* Phase: LAB - Cage View (Phaser) */}
      <PhaserGame
        onPortClick={handlePortClick}
        onCableDrop={handleCableDrop}
      />

      {/* Phase: DESKTOP - PC Physical Overview */}
      <DesktopView />

      {/* Phase: PC_CABLES - PC Cable View (Phaser) */}
      <PcCableView />

      {/* Phase: PC_TERMINAL - Full Terminal */}
      <PcTerminalView />

      {/* Debug info (dev only) */}
      {isDev && (
        <div className="debug-info">
          <strong>Phase:</strong> {phase}
        </div>
      )}
    </div>
  );
}