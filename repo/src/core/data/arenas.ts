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
];

export const ARENA_MAP = new Map<ArenaId, Arena>(
  DEFAULT_ARENAS.map((a) => [a.id, a])
);
