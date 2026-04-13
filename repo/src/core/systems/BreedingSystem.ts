import type { GameState } from '../types';
import { MutationEngine } from './MutationEngine';
import type { BuffModifiers } from './MutationEngine';
import { ArenaSystem } from './ArenaSystem';
import { AccessorySystem } from './AccessorySystem';
import { calcEffectiveSplitTime } from './SplitFormula';

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
  private cachedMinTimeUntilSplit = Infinity;

  constructor(config?: Partial<BreedingConfig>) {
    this.config = { splitIntervalMs: 10000, maxCapacity: 12, ...config };
  }

  update(state: GameState, deltaTime: number, dynamicConfig?: { splitIntervalMs?: number; maxCapacity?: number }): BreedingResult {
    const splitIntervalMs = dynamicConfig?.splitIntervalMs ?? this.config.splitIntervalMs;
    const maxCapacity = dynamicConfig?.maxCapacity ?? this.config.maxCapacity;

    if (state.slimes.length >= maxCapacity) {
      this.cachedMinTimeUntilSplit = Infinity;
      return { didSplit: false, wasMutation: false };
    }

    const facilityMultiplier = splitIntervalMs / 10000;
    const fieldAccelActive = !!(state.activeBuffs?.splitFieldAcceleratorUntil && state.activeBuffs.splitFieldAcceleratorUntil > Date.now());
    const deltaMs = deltaTime * 1000;

    let splitParentIndex = -1;
    let minRemaining = Infinity;

    for (let i = 0; i < state.slimes.length; i++) {
      const slime = state.slimes[i];
      slime.splitAccumulatedMs = (slime.splitAccumulatedMs ?? 0) + deltaMs;
      const effectiveSplitTime = calcEffectiveSplitTime(slime, facilityMultiplier, fieldAccelActive);
      if (slime.splitAccumulatedMs >= effectiveSplitTime) {
        if (splitParentIndex === -1) {
          splitParentIndex = i;
        }
      } else {
        const remaining = effectiveSplitTime - slime.splitAccumulatedMs;
        if (remaining < minRemaining) {
          minRemaining = remaining;
        }
      }
    }

    if (splitParentIndex !== -1) {
      const parent = state.slimes[splitParentIndex];
      parent.splitAccumulatedMs = 0;

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

      // Update cached min time
      this.cachedMinTimeUntilSplit = 0;

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

    this.cachedMinTimeUntilSplit = minRemaining;
    return { didSplit: false, wasMutation: false };
  }

  getTimeUntilNextSplit(): number {
    return Math.max(0, this.cachedMinTimeUntilSplit);
  }

  getMaxCapacity(): number {
    return this.config.maxCapacity;
  }

  static calcEffectiveSplitTime(slime: import('../types').Slime, facilityMultiplier: number, fieldAccelActive: boolean): number {
    return calcEffectiveSplitTime(slime, facilityMultiplier, fieldAccelActive);
  }
}
