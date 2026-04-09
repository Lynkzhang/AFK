import { Rarity } from '../types';
import type { Stats, Trait, Skill, Slime } from '../types';
import { ALL_TRAITS } from '../data/traits';
import { ALL_SKILLS } from '../data/skills';

export class MutationEngine {
  mutateStats(parentStats: Stats): Stats {
    const mutateValue = (base: number): number => {
      const ratio = 0.8 + Math.random() * 0.4;
      return Math.max(1, Math.round(base * ratio));
    };

    return {
      health: mutateValue(parentStats.health),
      attack: mutateValue(parentStats.attack),
      defense: mutateValue(parentStats.defense),
      speed: mutateValue(parentStats.speed),
      mut: mutateValue(parentStats.mut),
    };
  }

  mutateTraits(parentTraits: Trait[]): Trait[] {
    const inherited = parentTraits.filter(() => Math.random() < 0.5);
    const result = [...inherited];

    if (Math.random() < 0.2) {
      const newTrait = this.pickWeightedTrait();
      if (!result.some((trait) => trait.id === newTrait.id)) {
        result.push(newTrait);
      }
    }

    return result;
  }

  mutateSkills(parentSkills: Skill[]): Skill[] {
    const inherited = parentSkills.filter(() => Math.random() < 0.5);
    const result = [...inherited];

    if (Math.random() < 0.15) {
      const newSkill = ALL_SKILLS[Math.floor(Math.random() * ALL_SKILLS.length)];
      if (newSkill && !result.some((skill) => skill.id === newSkill.id)) {
        result.push(newSkill);
      }
    }

    return result;
  }

  determineRarity(stats: Stats): Rarity {
    const total = stats.health + stats.attack + stats.defense + stats.speed + stats.mut;

    if (total < 30) return Rarity.Common;
    if (total < 50) return Rarity.Uncommon;
    if (total < 70) return Rarity.Rare;
    if (total < 90) return Rarity.Epic;
    return Rarity.Legendary;
  }

  generateColor(rarity: Rarity): string {
    switch (rarity) {
      case Rarity.Common:
        return '#56d364';
      case Rarity.Uncommon:
        return '#4f8cff';
      case Rarity.Rare:
        return '#9b59ff';
      case Rarity.Epic:
        return '#ff6b6b';
      case Rarity.Legendary:
        return '#ffd700';
      default:
        return '#56d364';
    }
  }

  createOffspring(parent: Slime): Slime {
    const stats = this.mutateStats(parent.stats);
    const traits = this.mutateTraits(parent.traits);
    const skills = this.mutateSkills(parent.skills);
    const rarity = this.determineRarity(stats);
    const color = this.generateColor(rarity);

    return {
      id: `slime-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${parent.name} Jr.`,
      stats,
      traits,
      skills,
      rarity,
      generation: parent.generation + 1,
      parentId: parent.id,
      color,
      position: {
        x: parent.position.x + (Math.random() * 4 - 2),
        y: parent.position.y + (Math.random() * 4 - 2),
        z: parent.position.z + (Math.random() * 4 - 2),
      },
    };
  }

  private pickWeightedTrait(): Trait {
    const weights: Record<Rarity, number> = {
      [Rarity.Common]: 50,
      [Rarity.Uncommon]: 25,
      [Rarity.Rare]: 15,
      [Rarity.Epic]: 8,
      [Rarity.Legendary]: 2,
    };

    const weightedPool = ALL_TRAITS.map((trait) => ({
      trait,
      weight: weights[trait.rarity],
    }));

    const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const item of weightedPool) {
      roll -= item.weight;
      if (roll <= 0) {
        return item.trait;
      }
    }

    return ALL_TRAITS[0];
  }
}
