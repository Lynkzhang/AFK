import { Rarity } from '../types';
import type { Slime } from '../types';

const RARITY_MULTIPLIER: Record<Rarity, number> = {
  [Rarity.Common]: 1,
  [Rarity.Uncommon]: 2,
  [Rarity.Rare]: 5,
  [Rarity.Epic]: 10,
  [Rarity.Legendary]: 25,
};

const TRAIT_RARITY_BONUS: Record<Rarity, number> = {
  [Rarity.Common]: 2,
  [Rarity.Uncommon]: 5,
  [Rarity.Rare]: 12,
  [Rarity.Epic]: 25,
  [Rarity.Legendary]: 60,
};

const SKILL_TYPE_BONUS: Record<string, number> = {
  attack: 3,
  defense: 4,
  support: 5,
  heal: 5,
};

export function evaluatePrice(slime: Slime): number {
  const totalStats =
    slime.stats.health + slime.stats.attack + slime.stats.defense + slime.stats.speed;
  const rarityMul = RARITY_MULTIPLIER[slime.rarity] ?? 1;
  const basePrice = totalStats * rarityMul;

  let traitBonus = 0;
  for (const trait of slime.traits) {
    traitBonus += TRAIT_RARITY_BONUS[trait.rarity] ?? 2;
  }

  let skillBonus = 0;
  for (const skill of slime.skills) {
    skillBonus += SKILL_TYPE_BONUS[skill.type] ?? 3;
  }

  return Math.max(1, Math.floor(basePrice + traitBonus + skillBonus));
}
