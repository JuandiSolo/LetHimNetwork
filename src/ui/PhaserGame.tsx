/**
 * Phaser Game React wrapper - simplified.
 * Mounts Phaser with CageScene and PcScene, switches based on labView.
 */

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { CageScene } from '@game/CageScene';
import { PcScene } from '@game/PcScene';
import { gameStore } from '@app/store';

// Phaser 4 type aliases - using any to avoid namespace issues
type PhaserGame = any;

export function PhaserGame() {
  const boxRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserGame>(null);
  const readyRef = useRef(false);

  const syncScene = (v: string) => {
    const g = gameRef.current;
    if (!g || v === 'TERMINAL') return; // Terminal is React overlay, don't touch Phaser
    const want = v === 'CAGE' ? 'CageScene' : 'PcScene';
    const other = v === 'CAGE' ? 'PcScene' : 'CageScene';
    g.scene.stop(other);
    if (!g.scene.isActive(want)) g.scene.start(want);
  };

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: boxRef.current!,
      width: '100%',
      height: '100%',
      backgroundColor: '#1a1a2e',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [CageScene, PcScene],
      render: {
        antialias: false,
        pixelArt: true,
      },
    } as any);
    gameRef.current = game;

    game.events.once('ready', () => {
      readyRef.current = true;
      syncScene(gameStore.getState().labView ?? 'CAGE');
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    const view = gameStore.getState().labView;
    if (readyRef.current) syncScene(view);
  }, [gameStore.getState().labView]);

  return <div ref={boxRef} style={{ width: '100%', height: '100%' }} />;
}