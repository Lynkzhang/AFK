import type { GameState } from './types';

const CURRENT_SAVE_VERSION = 1;

export function createInitialGameState(): GameState {
  return {
    version: CURRENT_SAVE_VERSION,
    world: {
      gold: 0,
      stage: 1,
      lastTick: Date.now(),
    },
    slimes: [
      {
        id: 'slime-1',
        name: 'Starter Slime',
        level: 1,
        hp: 100,
        position: { x: 0, y: 0.8, z: 0 },
      },
    ],
  };
}
