// ===== Stage Data =====
// Chapter 1 (10 stages) data, strictly matching combat_design.md §6.3.

import type { StageConfig, EnemyTemplate, BattleSkill } from './CombatTypes';

// ----- Enemy Skills -----

const ENEMY_SKILLS: Record<string, BattleSkill> = {
  'slime-spit': {
    id: 'slime-spit',
    name: '粘液喷射',
    type: 'attack',
    targetType: 'single',
    power: 8,
    energyCost: 0,
    maxCooldown: 2,
    currentCooldown: 0,
  },
  'acid-wave': {
    id: 'acid-wave',
    name: '酸液波',
    type: 'attack',
    targetType: 'aoe',
    power: 12,
    energyCost: 0,
    maxCooldown: 4,
    currentCooldown: 0,
  },
  'gel-shield': {
    id: 'gel-shield',
    name: '凝胶护盾',
    type: 'defense',
    targetType: 'self',
    power: 0,
    energyCost: 0,
    maxCooldown: 3,
    currentCooldown: 0,
  },
  'harden': {
    id: 'harden',
    name: '外膜硬化',
    type: 'defense',
    targetType: 'self',
    power: 0,
    energyCost: 0,
    maxCooldown: 5,
    currentCooldown: 0,
  },
  'enemy-quake': {
    id: 'enemy-quake',
    name: '大地震荡',
    type: 'attack',
    targetType: 'aoe',
    power: 15,
    energyCost: 0,
    maxCooldown: 5,
    currentCooldown: 0,
  },
};

function skill(id: string): BattleSkill {
  const s = ENEMY_SKILLS[id];
  if (!s) throw new Error(`Unknown enemy skill: ${id}`);
  return { ...s, currentCooldown: 0 };
}

// ----- Helper to create enemy templates -----

function enemy(
  id: string,
  name: string,
  hp: number,
  atk: number,
  def: number,
  spd: number,
  skillIds: string[],
  opts?: { isBoss?: boolean; isElite?: boolean; traits?: string[] },
): EnemyTemplate {
  return {
    id,
    name,
    baseHp: hp,
    baseAtk: atk,
    baseDef: def,
    baseSpd: spd,
    skills: skillIds.map(sid => skill(sid)),
    traits: opts?.traits ?? [],
    isBoss: opts?.isBoss ?? false,
    isElite: opts?.isElite ?? false,
  };
}

// ----- Chapter 1: Slime Plains -----

const CHAPTER_1_STAGES: StageConfig[] = [
  {
    id: '1-1',
    chapter: 1,
    stage: 1,
    enemies: [
      enemy('1-1-a', '绿色史莱姆', 15, 3, 2, 3, []),
    ],
    reward: { gold: 20, crystals: 0, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '1-2',
    chapter: 1,
    stage: 2,
    enemies: [
      enemy('1-2-a', '绿色史莱姆', 16, 3, 2, 3, []),
      enemy('1-2-b', '绿色史莱姆', 16, 3, 2, 3, []),
    ],
    reward: { gold: 25, crystals: 0, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '1-3',
    chapter: 1,
    stage: 3,
    enemies: [
      enemy('1-3-a', '绿色史莱姆', 17, 4, 2, 3, ['slime-spit']),
      enemy('1-3-b', '绿色史莱姆', 17, 4, 2, 3, ['slime-spit']),
    ],
    reward: { gold: 30, crystals: 0, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '1-4',
    chapter: 1,
    stage: 4,
    enemies: [
      enemy('1-4-a', '绿色史莱姆', 18, 4, 3, 4, ['slime-spit']),
      enemy('1-4-b', '蓝色史莱姆', 18, 4, 3, 4, ['slime-spit']),
    ],
    reward: { gold: 35, crystals: 0, items: [{ id: 'mutagen', name: '变异催化剂', count: 1 }] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '1-5',
    chapter: 1,
    stage: 5,
    enemies: [
      enemy('1-5-a', '精英蓝色史莱姆', 28, 5, 4, 4, ['slime-spit', 'gel-shield'], { isElite: true }),
      enemy('1-5-b', '精英蓝色史莱姆', 28, 5, 4, 4, ['slime-spit', 'gel-shield'], { isElite: true }),
    ],
    reward: { gold: 50, crystals: 0, items: [] },
    isBoss: false,
    isElite: true,
  },
  {
    id: '1-6',
    chapter: 1,
    stage: 6,
    enemies: [
      enemy('1-6-a', '蓝色史莱姆', 20, 5, 3, 4, ['slime-spit']),
      enemy('1-6-b', '蓝色史莱姆', 20, 5, 3, 4, ['slime-spit']),
      enemy('1-6-c', '蓝色史莱姆', 20, 5, 3, 4, ['slime-spit']),
    ],
    reward: { gold: 40, crystals: 0, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '1-7',
    chapter: 1,
    stage: 7,
    enemies: [
      enemy('1-7-a', '蓝色史莱姆', 21, 5, 3, 4, ['slime-spit']),
      enemy('1-7-b', '蓝色史莱姆', 21, 5, 3, 4, ['slime-spit']),
      enemy('1-7-c', '蓝色史莱姆', 21, 5, 3, 4, ['slime-spit']),
    ],
    reward: { gold: 45, crystals: 0, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '1-8',
    chapter: 1,
    stage: 8,
    enemies: [
      enemy('1-8-a', '蓝色史莱姆', 22, 5, 4, 4, ['slime-spit', 'acid-wave']),
      enemy('1-8-b', '绿色史莱姆', 22, 5, 4, 4, ['slime-spit']),
      enemy('1-8-c', '蓝色史莱姆', 22, 5, 4, 4, ['slime-spit', 'acid-wave']),
    ],
    reward: { gold: 50, crystals: 0, items: [{ id: 'mutagen', name: '变异催化剂', count: 1 }] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '1-9',
    chapter: 1,
    stage: 9,
    enemies: [
      enemy('1-9-a', '蓝色史莱姆', 24, 6, 4, 5, ['slime-spit', 'gel-shield']),
      enemy('1-9-b', '蓝色史莱姆', 24, 6, 4, 5, ['slime-spit', 'gel-shield']),
      enemy('1-9-c', '蓝色史莱姆', 24, 6, 4, 5, ['slime-spit']),
    ],
    reward: { gold: 55, crystals: 0, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '1-10',
    chapter: 1,
    stage: 10,
    enemies: [
      enemy('1-10-boss', '巨型史莱姆', 60, 8, 5, 4, ['slime-spit', 'acid-wave', 'harden', 'enemy-quake'], { isBoss: true }),
    ],
    reward: { gold: 100, crystals: 10, items: [] },
    isBoss: true,
    isElite: false,
  },
];

// ----- Stage Registry -----

const STAGE_MAP = new Map<string, StageConfig>();
for (const s of CHAPTER_1_STAGES) {
  STAGE_MAP.set(s.id, s);
}

export function getStage(stageId: string): StageConfig | undefined {
  return STAGE_MAP.get(stageId);
}

export const STAGES = STAGE_MAP;
