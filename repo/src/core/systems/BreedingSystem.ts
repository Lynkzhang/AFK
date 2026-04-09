import type { GameState } from '../types';
import { MutationEngine } from './MutationEngine';

export interface BreedingConfig {
  splitIntervalMs: number;
  maxCapacity: number;
}

export class BreedingSystem {
  private readonly config: BreedingConfig;
  private readonly engine = new MutationEngine();
  private accumulated = 0;

  constructor(config?: Partial<BreedingConfig>) {
    this.config = { splitIntervalMs: 10000, maxCapacity: 12, ...config };
  }

  update(state: GameState, deltaTime: number): void {
    if (state.slimes.length >= this.config.maxCapacity) return;

    this.accumulated += deltaTime * 1000;
    if (this.accumulated >= this.config.splitIntervalMs) {
      this.accumulated = 0;
      const parent = state.slimes[Math.floor(Math.random() * state.slimes.length)];
      if (parent) {
        const child = this.engine.createOffspring(parent);
        state.slimes.push(child);
      }
    }
  }

  getTimeUntilNextSplit(): number {
    return Math.max(0, this.config.splitIntervalMs - this.accumulated);
  }

  getMaxCapacity(): number {
    return this.config.maxCapacity;
  }
}
