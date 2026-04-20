import type { Arena, ArenaId } from '../types';

export const DEFAULT_ARENAS: Arena[] = [
  {
    id: 'grassland',
    name: '丰饶草地',
    description: '温和的环境，适合新手培育史莱姆。体质成长略有加成。',
    price: 0,
    currencyType: 'gold',
    owned: true,
    statBonus: { health: 0.10 },
    mutationBias: {},
  },
  {
    id: 'fire-land',
    name: '炽焰之地',
    description: '高温炙烤的火域，鼓励更激进的攻击型突变。',
    price: 450,
    currencyType: 'gold',
    owned: false,
    statBonus: { attack: 0.15 },
    mutationBias: {
      preferTraitIds: ['berserk', 'rage-core'],
      preferSkillTypes: ['attack'],
    },
  },
  {
    id: 'ice-cave',
    name: '冰霜洞窟',
    description: '寒气缭绕的冰洞，让史莱姆在冷静中强化防御与韧性。',
    price: 500,
    currencyType: 'gold',
    owned: false,
    statBonus: { defense: 0.15, health: 0.1 },
    mutationBias: {
      preferTraitIds: ['hard-shell', 'adaptive-membrane'],
      preferSkillTypes: ['defense', 'heal'],
    },
  },
  {
    id: 'mystic-forest',
    name: '秘林幻境',
    description: '紫雾缭绕的秘林，偏向诞生带有奇异能力的史莱姆。',
    price: 800,
    currencyType: 'gold',
    owned: false,
    statBonus: { speed: 0.1, mut: 0.05 },
    mutationBias: {
      preferTraitIds: ['arcane', 'lucky'],
      preferSkillTypes: ['support', 'heal'],
      rarityWeightBonus: 0.1,
    },
  },
];

export const ARENA_MAP = new Map<ArenaId, Arena>(
  DEFAULT_ARENAS.map((a) => [a.id, a])
);
