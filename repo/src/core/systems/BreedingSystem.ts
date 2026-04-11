import type { GameState } from '../types';
import { MutationEngine } from './MutationEngine';
import type { BuffModifiers } from './MutationEngine';
import { ArenaSystem } from './ArenaSystem';
import { AccessorySystem } from './AccessorySystem';

export interface BreedingResult {
  didSplit: boolean;
  wasMutation: boolean;
  buffApplied?: {
    mutationCatalyst: boolean;
    rareEssence: boolean;
  };
}

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

  update(state: GameState, deltaTime: number, dynamicConfig?: { splitIntervalMs?: number; maxCapacity?: number }): BreedingResult {
    const splitInterval = dynamicConfig?.splitIntervalMs ?? this.config.splitIntervalMs;
    const maxCapacity = dynamicConfig?.maxCapacity ?? this.config.maxCapacity;

    if (state.slimes.length >= maxCapacity) return { didSplit: false, wasMutation: false };

    this.accumulated += deltaTime * 1000;
    if (this.accumulated >= splitInterval) {
      this.accumulated = 0;
      const parent = state.slimes[Math.floor(Math.random() * state.slimes.length)];
      if (parent) {
        // Get mutation modifiers from active arena
        const activeArena = ArenaSystem.getActiveArena(state);
        const modifiers = ArenaSystem.getMutationModifiers(activeArena);

        // Find parent's equipped accessory for inheritance
        const parentAccessory = parent.equippedAccessoryId
          ? state.accessories.find((a) => a.id === parent.equippedAccessoryId)
          : undefined;

        // Read buff state
        const buffs: BuffModifiers = {
          mutationCatalystActive: state.activeBuffs?.mutationCatalystActive ?? false,
          rareEssenceActive: state.activeBuffs?.rareEssenceActive ?? false,
        };

        const offspring = this.engine.createOffspring(parent, modifiers, parentAccessory, buffs);

        // Handle inherited accessory
        const inheritedTemplateId = offspring._inheritedAccessoryTemplateId;
        let pendingAccId: string | undefined;
        if (inheritedTemplateId) {
          const newAcc = AccessorySystem.giveAccessory(state, inheritedTemplateId);
          if (newAcc) {
            pendingAccId = newAcc.id;
          }
        }

        // Clean up temporary field before pushing to state
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (offspring as any)._inheritedAccessoryTemplateId;

        state.slimes.push(offspring);

        // Equip the inherited accessory on the child after it's in the state
        if (pendingAccId) {
          AccessorySystem.equip(state, pendingAccId, offspring.id);
        }

        // Clear one-time buffs after split
        if (state.activeBuffs) {
          state.activeBuffs.mutationCatalystActive = false;
          state.activeBuffs.rareEssenceActive = false;
        }

        const wasMutation = offspring.rarity !== parent.rarity;
        return {
          didSplit: true,
          wasMutation,
          buffApplied: {
            mutationCatalyst: buffs.mutationCatalystActive ?? false,
            rareEssence: buffs.rareEssenceActive ?? false,
          },
        };
      }
    }
    return { didSplit: false, wasMutation: false };
  }

  getTimeUntilNextSplit(): number {
    return Math.max(0, this.config.splitIntervalMs - this.accumulated);
  }

  getMaxCapacity(): number {
    return this.config.maxCapacity;
  }
}
