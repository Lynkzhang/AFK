import { Rarity } from '../types';
import type { Stats, Trait, Skill, Slime, MutationModifiers, Accessory } from '../types';
import { ALL_TRAITS } from '../data/traits';
import { ALL_SKILLS } from '../data/skills';

export class MutationEngine {
  mutateStats(parentStats: Stats, modifiers?: MutationModifiers): Stats {
    const mutateValue = (base: number, statKey: keyof Stats): number => {
      const bonus = modifiers?.statBonuses[statKey] ?? 0;
      const ratio = 0.8 + Math.random() * 0.4 + bonus;
      return Math.max(1, Math.round(base * ratio));
    };

    return {
      health: mutateValue(parentStats.health, 'health'),
      attack: mutateValue(parentStats.attack, 'attack'),
      defense: mutateValue(parentStats.defense, 'defense'),
      speed: mutateValue(parentStats.speed, 'speed'),
      mut: mutateValue(parentStats.mut, 'mut'),
    };
  }

  mutateTraits(parentTraits: Trait[], modifiers?: MutationModifiers): Trait[] {
    const inherited = parentTraits.filter(() => Math.random() < 0.5);
    const result = [...inherited];

    if (Math.random() < 0.2) {
      const preferIds = modifiers?.preferTraitIds ?? [];
      let newTrait: Trait;
      if (preferIds.length > 0 && Math.random() < 0.5) {
        // 50% chance to pick from preferred traits
        const preferred = ALL_TRAITS.filter((t) => preferIds.includes(t.id));
        if (preferred.length > 0) {
          newTrait = preferred[Math.floor(Math.random() * preferred.length)];
        } else {
          newTrait = this.pickWeightedTrait(modifiers);
        }
      } else {
        newTrait = this.pickWeightedTrait(modifiers);
      }
      if (!result.some((trait) => trait.id === newTrait.id)) {
        result.push(newTrait);
      }
    }

    return result;
  }

  mutateSkills(parentSkills: Skill[], modifiers?: MutationModifiers): Skill[] {
    const inherited = parentSkills.filter(() => Math.random() < 0.5);
    const result = [...inherited];

    if (Math.random() < 0.15) {
      const preferTypes = modifiers?.preferSkillTypes ?? [];
      let newSkill: Skill | undefined;
      if (preferTypes.length > 0 && Math.random() < 0.5) {
        // 50% chance to pick from preferred skill types
        const preferred = ALL_SKILLS.filter((s) => preferTypes.includes(s.type));
        if (preferred.length > 0) {
          newSkill = preferred[Math.floor(Math.random() * preferred.length)];
        }
      }
      if (!newSkill) {
        newSkill = ALL_SKILLS[Math.floor(Math.random() * ALL_SKILLS.length)];
      }
      if (newSkill && !result.some((skill) => skill.id === newSkill!.id)) {
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
        return '#f0c040'; // warm yellow — contrasts with grass (was #56d364)
      case Rarity.Uncommon:
        return '#4f8cff';
      case Rarity.Rare:
        return '#9b59ff';
      case Rarity.Epic:
        return '#ff6b6b';
      case Rarity.Legendary:
        return '#ffd700';
      default:
        return '#f0c040'; // warm yellow — contrasts with grass (was #56d364)
    }
  }

  createOffspring(parent: Slime, modifiers?: MutationModifiers, parentAccessory?: Accessory): Slime & { _inheritedAccessoryTemplateId?: string } {
    const stats = this.mutateStats(parent.stats, modifiers);
    const traits = this.mutateTraits(parent.traits, modifiers);
    const skills = this.mutateSkills(parent.skills, modifiers);
    const rarity = this.determineRarity(stats);
    const color = this.generateColor(rarity);

    // Accessory inheritance logic
    let inheritedTemplateId: string | undefined;
    if (parentAccessory) {
      if (parentAccessory.kind === 'tendency' && Math.random() < 0.3) {
        inheritedTemplateId = parentAccessory.templateId;
      } else if (parentAccessory.kind === 'rare' && Math.random() < 0.15) {
        inheritedTemplateId = parentAccessory.templateId;
      }
      // 'stat' kind: 0% inheritance — never inherited
    }

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
      _inheritedAccessoryTemplateId: inheritedTemplateId,
    };
  }

  private pickWeightedTrait(modifiers?: MutationModifiers): Trait {
    const rarityBonus = modifiers?.rarityWeightBonus ?? 0;

    const weights: Record<Rarity, number> = {
      [Rarity.Common]: 50,
      [Rarity.Uncommon]: 25,
      [Rarity.Rare]: 15,
      [Rarity.Epic]: 8,
      [Rarity.Legendary]: 2,
    };

    const weightedPool = ALL_TRAITS.map((trait) => {
      let weight = weights[trait.rarity];
      // Apply rarity weight bonus for Rare/Epic/Legendary
      if (rarityBonus > 0 && (trait.rarity === Rarity.Rare || trait.rarity === Rarity.Epic || trait.rarity === Rarity.Legendary)) {
        weight *= (1 + rarityBonus);
      }
      return { trait, weight };
    });

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
