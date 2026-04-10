import type { GameState, CodexData } from '../types';
import { Rarity } from '../types';
import { ALL_TRAITS } from '../data/traits';
import { ALL_SKILLS } from '../data/skills';

const ALL_RARITIES: string[] = [
  Rarity.Common,
  Rarity.Uncommon,
  Rarity.Rare,
  Rarity.Epic,
  Rarity.Legendary,
];

export class CodexSystem {
  static createDefaultCodex(): CodexData {
    return {
      unlockedRarities: [],
      unlockedTraits: [],
      unlockedSkills: [],
    };
  }

  /** Scan all slimes (active + archived) and unlock any new entries */
  static recordFromState(state: GameState): void {
    if (!state.codex) {
      state.codex = CodexSystem.createDefaultCodex();
    }
    const allSlimes = [...state.slimes, ...state.archivedSlimes];
    for (const slime of allSlimes) {
      CodexSystem.unlockRarity(state.codex, slime.rarity);
      for (const trait of slime.traits) {
        CodexSystem.unlockTrait(state.codex, trait.id);
      }
      for (const skill of slime.skills) {
        CodexSystem.unlockSkill(state.codex, skill.id);
      }
    }
  }

  static unlockRarity(codex: CodexData, rarity: string): boolean {
    if (!ALL_RARITIES.includes(rarity)) return false;
    if (codex.unlockedRarities.includes(rarity)) return false;
    codex.unlockedRarities.push(rarity);
    return true;
  }

  static unlockTrait(codex: CodexData, traitId: string): boolean {
    if (!ALL_TRAITS.some((t) => t.id === traitId)) return false;
    if (codex.unlockedTraits.includes(traitId)) return false;
    codex.unlockedTraits.push(traitId);
    return true;
  }

  static unlockSkill(codex: CodexData, skillId: string): boolean {
    if (!ALL_SKILLS.some((s) => s.id === skillId)) return false;
    if (codex.unlockedSkills.includes(skillId)) return false;
    codex.unlockedSkills.push(skillId);
    return true;
  }

  /** Unlock a codex entry by category and id */
  static unlockEntry(state: GameState, category: string, id: string): boolean {
    if (!state.codex) {
      state.codex = CodexSystem.createDefaultCodex();
    }
    switch (category) {
      case 'rarity':
        return CodexSystem.unlockRarity(state.codex, id);
      case 'trait':
        return CodexSystem.unlockTrait(state.codex, id);
      case 'skill':
        return CodexSystem.unlockSkill(state.codex, id);
      default:
        return false;
    }
  }

  static getCompletion(codex: CodexData): {
    rarities: { unlocked: number; total: number; percent: number };
    traits: { unlocked: number; total: number; percent: number };
    skills: { unlocked: number; total: number; percent: number };
    overall: { unlocked: number; total: number; percent: number };
  } {
    const rU = codex.unlockedRarities.length;
    const rT = ALL_RARITIES.length;
    const tU = codex.unlockedTraits.length;
    const tT = ALL_TRAITS.length;
    const sU = codex.unlockedSkills.length;
    const sT = ALL_SKILLS.length;
    const oU = rU + tU + sU;
    const oT = rT + tT + sT;
    return {
      rarities: { unlocked: rU, total: rT, percent: rT > 0 ? Math.round((rU / rT) * 100) : 0 },
      traits: { unlocked: tU, total: tT, percent: tT > 0 ? Math.round((tU / tT) * 100) : 0 },
      skills: { unlocked: sU, total: sT, percent: sT > 0 ? Math.round((sU / sT) * 100) : 0 },
      overall: { unlocked: oU, total: oT, percent: oT > 0 ? Math.round((oU / oT) * 100) : 0 },
    };
  }

  static getCodex(state: GameState): {
    codex: CodexData;
    allRarities: string[];
    allTraits: { id: string; name: string; rarity: string }[];
    allSkills: { id: string; name: string; type: string }[];
  } {
    if (!state.codex) {
      state.codex = CodexSystem.createDefaultCodex();
    }
    return {
      codex: state.codex,
      allRarities: ALL_RARITIES,
      allTraits: ALL_TRAITS.map((t) => ({ id: t.id, name: t.name, rarity: t.rarity })),
      allSkills: ALL_SKILLS.map((s) => ({ id: s.id, name: s.name, type: s.type })),
    };
  }
}
