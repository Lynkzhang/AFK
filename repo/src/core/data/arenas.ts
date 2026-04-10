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
    name: '火焰之地',
    description: '炙热的熔岩地带，激发史莱姆的攻击本能。',
    price: 500,
    currencyType: 'gold',
    owned: false,
    statBonus: { attack: 0.15 },
    mutationBias: {
      preferTraitIds: ['feral-rush', 'toxin-blood'],
      preferSkillTypes: ['attack'],
    },
  },
  {
    id: 'ice-cave',
    name: '寒冰洞穴',
    description: '极寒的冰窟，锤炼史莱姆的防御外壳。',
    price: 500,
    currencyType: 'gold',
    owned: false,
    statBonus: { defense: 0.15 },
    mutationBias: {
      preferTraitIds: ['hard-shell', 'adaptive-membrane'],
      preferSkillTypes: ['defense'],
    },
  },
  {
    id: 'mystic-forest',
    name: '神秘森林',
    description: '充满古老魔力的森林，提升稀有变异概率。',
    price: 200,
    currencyType: 'crystal',
    owned: false,
    statBonus: { mut: 0.20 },
    mutationBias: {
      rarityWeightBonus: 0.30,
    },
  },
];

export const ARENA_MAP = new Map<ArenaId, Arena>(
  DEFAULT_ARENAS.map((a) => [a.id, a])
);
