import type { GameState, Arena, ArenaId, MutationModifiers } from '../types';

export class ArenaSystem {
  /** Get the currently active arena */
  static getActiveArena(state: GameState): Arena {
    const arena = state.arenas.find((a) => a.id === state.activeArenaId);
    if (arena) return arena;
    // Fallback to grassland
    return state.arenas.find((a) => a.id === 'grassland')!;
  }

  /** Buy an arena. Returns true if successful. */
  static buyArena(state: GameState, arenaId: ArenaId): boolean {
    const arena = state.arenas.find((a) => a.id === arenaId);
    if (!arena) return false;
    if (arena.owned) return false;

    if (arena.currencyType === 'gold') {
      if (state.currency < arena.price) return false;
      state.currency -= arena.price;
    } else {
      if (state.crystal < arena.price) return false;
      state.crystal -= arena.price;
    }

    arena.owned = true;
    return true;
  }

  /** Switch to a different owned arena. Returns true if successful. */
  static switchArena(state: GameState, arenaId: ArenaId): boolean {
    const arena = state.arenas.find((a) => a.id === arenaId);
    if (!arena) return false;
    if (!arena.owned) return false;
    state.activeArenaId = arenaId;
    return true;
  }

  /** Get mutation modifiers from an arena for MutationEngine */
  static getMutationModifiers(arena: Arena): MutationModifiers {
    return {
      statBonuses: { ...arena.statBonus },
      preferTraitIds: arena.mutationBias.preferTraitIds ?? [],
      preferSkillTypes: arena.mutationBias.preferSkillTypes ?? [],
      rarityWeightBonus: arena.mutationBias.rarityWeightBonus ?? 0,
    };
  }
}
