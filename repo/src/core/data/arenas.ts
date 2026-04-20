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
];

export const ARENA_MAP = new Map<ArenaId, Arena>(
  DEFAULT_ARENAS.map((a) => [a.id, a])
);
