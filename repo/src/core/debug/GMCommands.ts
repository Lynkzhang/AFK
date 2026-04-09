import type { GameState, Slime, Stats } from '../types';
import { Rarity } from '../types';

/** Getter / Setter injected from main.ts */
type GetState = () => GameState;
type SetState = (s: GameState) => void;

interface GMApi {
  addSlime(): void;
  removeSlime(id: string): void;
  setStats(id: string, partial: Partial<Stats>): void;
  triggerSplit(): void;
  getState(): GameState;
  setCurrency(n: number): void;
}

declare global {
  interface Window {
    __GM?: GMApi;
  }
}

function createDefaultSlime(): Slime {
  const id = `gm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    name: `GM Slime ${id.slice(-4)}`,
    stats: { health: 20, attack: 5, defense: 3, speed: 4, mut: 0.05 },
    traits: [
      {
        id: 'gm',
        name: 'GM-Spawned',
        description: 'Created by GM command',
        rarity: Rarity.Common,
        effect: 'none',
      },
    ],
    skills: [
      {
        id: 'gm-atk',
        name: 'GM Strike',
        type: 'attack',
        targetType: 'single',
        damage: 5,
        cooldown: 1,
      },
    ],
    rarity: Rarity.Common,
    generation: 0,
    parentId: null,
    color: '#ff0',
    position: {
      x: (Math.random() - 0.5) * 4,
      y: 0.5,
      z: (Math.random() - 0.5) * 4,
    },
  };
}

export function initGM(getState: GetState, setState: SetState): void {
  const api: GMApi = {
    addSlime() {
      const s = getState();
      setState({ ...s, slimes: [...s.slimes, createDefaultSlime()] });
    },
    removeSlime(id: string) {
      const s = getState();
      setState({ ...s, slimes: s.slimes.filter((sl) => sl.id !== id) });
    },
    setStats(id: string, partial: Partial<Stats>) {
      const s = getState();
      setState({
        ...s,
        slimes: s.slimes.map((sl) =>
          sl.id === id ? { ...sl, stats: { ...sl.stats, ...partial } } : sl,
        ),
      });
    },
    triggerSplit() {
      const s = getState();
      if (s.slimes.length === 0) return;
      const parent = s.slimes[Math.floor(Math.random() * s.slimes.length)]!;
      const child: Slime = {
        ...parent,
        id: `gm-split-${Date.now()}`,
        name: `${parent.name} Jr`,
        generation: parent.generation + 1,
        parentId: parent.id,
        position: {
          x: parent.position.x + 1,
          y: 0.5,
          z: parent.position.z,
        },
      };
      setState({ ...s, slimes: [...s.slimes, child] });
    },
    getState() {
      return getState();
    },
    setCurrency(n: number) {
      const s = getState();
      setState({ ...s, currency: n });
    },
  };

  window.__GM = api;

  if (import.meta.env.DEV) {
    console.log('[GM] Commands available via window.__GM');
  }
}
