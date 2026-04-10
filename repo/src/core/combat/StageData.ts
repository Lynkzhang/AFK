// ===== Stage Data =====
// Chapter 1–3 stage data, strictly matching combat_design.md §6.3.

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
  'fire-breath': {
    id: 'fire-breath',
    name: '火焰吐息',
    type: 'attack',
    targetType: 'single',
    power: 10,
    energyCost: 0,
    maxCooldown: 2,
    currentCooldown: 0,
  },
  'fire-blast': {
    id: 'fire-blast',
    name: '烈焰爆发',
    type: 'attack',
    targetType: 'aoe',
    power: 14,
    energyCost: 0,
    maxCooldown: 4,
    currentCooldown: 0,
  },
  'ice-bolt': {
    id: 'ice-bolt',
    name: '冰矛',
    type: 'attack',
    targetType: 'single',
    power: 8,
    energyCost: 0,
    maxCooldown: 3,
    currentCooldown: 0,
  },
  'blizzard': {
    id: 'blizzard',
    name: '暴风雪',
    type: 'attack',
    targetType: 'aoe',
    power: 12,
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
    accessoryDropIds: ['acc-iron-ring', 'acc-guardian-amulet'],
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
    reward: { gold: 40, crystals: 5, items: [] },
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
    reward: { gold: 45, crystals: 8, items: [] },
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
    reward: { gold: 50, crystals: 10, items: [{ id: 'mutagen', name: '变异催化剂', count: 1 }] },
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
    reward: { gold: 55, crystals: 15, items: [] },
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
    reward: { gold: 100, crystals: 25, items: [] },
    isBoss: true,
    isElite: false,
    accessoryDropIds: ['acc-swift-anklet', 'acc-vitality-charm'],
  },
];

// ----- Chapter 2: Flame Caverns (火焰洞窟) -----

const CHAPTER_2_STAGES: StageConfig[] = [
  {
    id: '2-1',
    chapter: 2,
    stage: 1,
    enemies: [
      enemy('2-1-a', '火焰史莱姆', 20, 5, 3, 4, ['fire-breath']),
    ],
    reward: { gold: 60, crystals: 5, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '2-2',
    chapter: 2,
    stage: 2,
    enemies: [
      enemy('2-2-a', '火焰史莱姆', 22, 5, 3, 4, ['fire-breath']),
      enemy('2-2-b', '火焰史莱姆', 22, 5, 3, 4, ['fire-breath']),
    ],
    reward: { gold: 65, crystals: 6, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '2-3',
    chapter: 2,
    stage: 3,
    enemies: [
      enemy('2-3-a', '火焰史莱姆', 24, 6, 3, 4, ['fire-breath']),
      enemy('2-3-b', '火焰史莱姆', 24, 6, 3, 4, ['fire-breath']),
    ],
    reward: { gold: 70, crystals: 7, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '2-4',
    chapter: 2,
    stage: 4,
    enemies: [
      enemy('2-4-a', '火焰史莱姆', 26, 6, 4, 4, ['fire-breath']),
      enemy('2-4-b', '火焰史莱姆', 26, 6, 4, 4, ['fire-breath']),
      enemy('2-4-c', '赤焰史莱姆', 28, 7, 4, 5, ['fire-breath', 'fire-blast']),
    ],
    reward: { gold: 80, crystals: 9, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '2-5',
    chapter: 2,
    stage: 5,
    enemies: [
      enemy('2-5-a', '精英赤焰史莱姆', 38, 7, 5, 5, ['fire-breath', 'fire-blast'], { isElite: true }),
      enemy('2-5-b', '精英赤焰史莱姆', 38, 7, 5, 5, ['fire-breath', 'fire-blast'], { isElite: true }),
    ],
    reward: { gold: 90, crystals: 12, items: [] },
    isBoss: false,
    isElite: true,
    accessoryDropIds: ['acc-flame-crystal'],
  },
  {
    id: '2-6',
    chapter: 2,
    stage: 6,
    enemies: [
      enemy('2-6-a', '赤焰史莱姆', 30, 7, 4, 5, ['fire-breath', 'fire-blast']),
      enemy('2-6-b', '赤焰史莱姆', 30, 7, 4, 5, ['fire-breath', 'fire-blast']),
      enemy('2-6-c', '赤焰史莱姆', 30, 7, 4, 5, ['fire-breath', 'fire-blast']),
    ],
    reward: { gold: 95, crystals: 14, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '2-7',
    chapter: 2,
    stage: 7,
    enemies: [
      enemy('2-7-a', '赤焰史莱姆', 32, 8, 4, 5, ['fire-breath', 'fire-blast']),
      enemy('2-7-b', '赤焰史莱姆', 32, 8, 4, 5, ['fire-breath', 'fire-blast']),
      enemy('2-7-c', '赤焰史莱姆', 32, 8, 4, 5, ['fire-breath', 'fire-blast']),
    ],
    reward: { gold: 100, crystals: 16, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '2-8',
    chapter: 2,
    stage: 8,
    enemies: [
      enemy('2-8-a', '赤焰史莱姆', 34, 8, 5, 5, ['fire-breath', 'fire-blast']),
      enemy('2-8-b', '赤焰史莱姆', 34, 8, 5, 5, ['fire-breath', 'fire-blast']),
      enemy('2-8-c', '赤焰史莱姆', 34, 8, 5, 5, ['fire-breath', 'fire-blast']),
    ],
    reward: { gold: 110, crystals: 20, items: [{ id: 'mutagen', name: '变异催化剂', count: 1 }] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '2-9',
    chapter: 2,
    stage: 9,
    enemies: [
      enemy('2-9-a', '赤焰史莱姆', 36, 9, 5, 6, ['fire-breath', 'fire-blast', 'harden']),
      enemy('2-9-b', '赤焰史莱姆', 36, 9, 5, 6, ['fire-breath', 'fire-blast', 'harden']),
      enemy('2-9-c', '赤焰史莱姆', 36, 9, 5, 6, ['fire-breath', 'fire-blast', 'harden']),
    ],
    reward: { gold: 130, crystals: 25, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '2-10',
    chapter: 2,
    stage: 10,
    enemies: [
      enemy('2-10-boss', '熔岩巨兽', 90, 12, 7, 5, ['fire-blast', 'harden', 'enemy-quake'], { isBoss: true }),
    ],
    reward: { gold: 150, crystals: 30, items: [] },
    isBoss: true,
    isElite: false,
    accessoryDropIds: ['acc-origin-pendant'],
  },
];

// ----- Chapter 3: Frozen Abyss (寒冰深渊) -----

const CHAPTER_3_STAGES: StageConfig[] = [
  {
    id: '3-1',
    chapter: 3,
    stage: 1,
    enemies: [
      enemy('3-1-a', '冰晶史莱姆', 25, 6, 4, 5, ['ice-bolt']),
    ],
    reward: { gold: 80, crystals: 10, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '3-2',
    chapter: 3,
    stage: 2,
    enemies: [
      enemy('3-2-a', '冰晶史莱姆', 27, 6, 4, 5, ['ice-bolt']),
      enemy('3-2-b', '冰晶史莱姆', 27, 6, 4, 5, ['ice-bolt']),
    ],
    reward: { gold: 85, crystals: 12, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '3-3',
    chapter: 3,
    stage: 3,
    enemies: [
      enemy('3-3-a', '冰晶史莱姆', 29, 7, 4, 5, ['ice-bolt']),
      enemy('3-3-b', '冰晶史莱姆', 29, 7, 4, 5, ['ice-bolt']),
    ],
    reward: { gold: 90, crystals: 14, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '3-4',
    chapter: 3,
    stage: 4,
    enemies: [
      enemy('3-4-a', '冰晶史莱姆', 31, 7, 5, 5, ['ice-bolt']),
      enemy('3-4-b', '冰晶史莱姆', 31, 7, 5, 5, ['ice-bolt']),
      enemy('3-4-c', '寒霜史莱姆', 33, 8, 5, 6, ['ice-bolt', 'blizzard']),
    ],
    reward: { gold: 100, crystals: 16, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '3-5',
    chapter: 3,
    stage: 5,
    enemies: [
      enemy('3-5-a', '精英寒霜史莱姆', 45, 8, 6, 6, ['ice-bolt', 'blizzard'], { isElite: true }),
      enemy('3-5-b', '精英寒霜史莱姆', 45, 8, 6, 6, ['ice-bolt', 'blizzard'], { isElite: true }),
    ],
    reward: { gold: 110, crystals: 20, items: [] },
    isBoss: false,
    isElite: true,
    accessoryDropIds: ['acc-frost-crystal'],
  },
  {
    id: '3-6',
    chapter: 3,
    stage: 6,
    enemies: [
      enemy('3-6-a', '寒霜史莱姆', 35, 8, 5, 6, ['ice-bolt', 'blizzard']),
      enemy('3-6-b', '寒霜史莱姆', 35, 8, 5, 6, ['ice-bolt', 'blizzard']),
      enemy('3-6-c', '寒霜史莱姆', 35, 8, 5, 6, ['ice-bolt', 'blizzard']),
    ],
    reward: { gold: 120, crystals: 24, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '3-7',
    chapter: 3,
    stage: 7,
    enemies: [
      enemy('3-7-a', '寒霜史莱姆', 37, 9, 5, 6, ['ice-bolt', 'blizzard']),
      enemy('3-7-b', '寒霜史莱姆', 37, 9, 5, 6, ['ice-bolt', 'blizzard']),
      enemy('3-7-c', '寒霜史莱姆', 37, 9, 5, 6, ['ice-bolt', 'blizzard']),
    ],
    reward: { gold: 130, crystals: 28, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '3-8',
    chapter: 3,
    stage: 8,
    enemies: [
      enemy('3-8-a', '寒霜史莱姆', 39, 9, 6, 6, ['ice-bolt', 'blizzard']),
      enemy('3-8-b', '寒霜史莱姆', 39, 9, 6, 6, ['ice-bolt', 'blizzard']),
      enemy('3-8-c', '寒霜史莱姆', 39, 9, 6, 6, ['ice-bolt', 'blizzard']),
    ],
    reward: { gold: 150, crystals: 35, items: [{ id: 'mutagen', name: '变异催化剂', count: 1 }] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '3-9',
    chapter: 3,
    stage: 9,
    enemies: [
      enemy('3-9-a', '寒霜史莱姆', 41, 10, 6, 7, ['ice-bolt', 'blizzard', 'gel-shield']),
      enemy('3-9-b', '寒霜史莱姆', 41, 10, 6, 7, ['ice-bolt', 'blizzard', 'gel-shield']),
      enemy('3-9-c', '寒霜史莱姆', 41, 10, 6, 7, ['ice-bolt', 'blizzard', 'gel-shield']),
    ],
    reward: { gold: 170, crystals: 40, items: [] },
    isBoss: false,
    isElite: false,
  },
  {
    id: '3-10',
    chapter: 3,
    stage: 10,
    enemies: [
      enemy('3-10-boss', '冰霜巨像', 120, 14, 9, 6, ['blizzard', 'gel-shield', 'enemy-quake'], { isBoss: true }),
    ],
    reward: { gold: 200, crystals: 50, items: [] },
    isBoss: true,
    isElite: false,
    accessoryDropIds: ['acc-kings-crown'],
  },
];

// ----- Stage Registry -----

const STAGE_MAP = new Map<string, StageConfig>();
for (const s of CHAPTER_1_STAGES) {
  STAGE_MAP.set(s.id, s);
}
for (const s of CHAPTER_2_STAGES) {
  STAGE_MAP.set(s.id, s);
}
for (const s of CHAPTER_3_STAGES) {
  STAGE_MAP.set(s.id, s);
}

export function getStage(stageId: string): StageConfig | undefined {
  return STAGE_MAP.get(stageId);
}

export const STAGES = STAGE_MAP;
