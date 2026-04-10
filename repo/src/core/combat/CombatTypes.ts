// ===== Combat Types =====
// All type definitions for the turn-based PVE combat engine.

export type StatusEffectType =
  | 'poison'
  | 'burn'
  | 'freeze'
  | 'stun'
  | 'atk_up'
  | 'def_up'
  | 'spd_up'
  | 'atk_down'
  | 'def_down';

export interface StatusEffect {
  id: string;
  type: StatusEffectType;
  remainingTurns: number;
  value: number;
  stackCount: number;
}

export interface BattleSkill {
  id: string;
  name: string;
  type: 'attack' | 'defense' | 'support' | 'heal';
  targetType: 'single' | 'aoe' | 'self' | 'ally' | 'team';
  power: number;
  energyCost: number;
  maxCooldown: number;
  currentCooldown: number;
}

export interface BattleUnit {
  slimeId: string;
  name: string;
  side: 0 | 1;
  slotIndex: number;

  maxHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;

  currentHp: number;
  energy: number;
  shield: number;
  shieldTurns: number;

  effectiveAttack: number;
  effectiveDefense: number;
  effectiveSpeed: number;

  statusEffects: StatusEffect[];
  skills: BattleSkill[];
  traits: string[];

  bonusCritRate: number;
  alive: boolean;
  stunImmuneTurns: number;
}

export interface DamageResult {
  damage: number;
  isCrit: boolean;
  isDodge: boolean;
}

export interface BattleReward {
  gold: number;
  crystals: number;
  items: { id: string; name: string; count: number }[];
}

export interface BattleLogEntry {
  turn: number;
  actorName: string;
  action: string;
  target: string;
  value: number;
  detail: string;
}

export interface BattleResult {
  victory: boolean;
  turnsUsed: number;
  maxTurns: number;
  alliesDead: number;
  stars: 0 | 1 | 2 | 3;
  rewards: BattleReward;
  log: BattleLogEntry[];
}

export interface EnemyTemplate {
  id: string;
  name: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  skills: BattleSkill[];
  traits: string[];
  isBoss: boolean;
  isElite: boolean;
}

export interface StageConfig {
  id: string;
  chapter: number;
  stage: number;
  enemies: EnemyTemplate[];
  reward: BattleReward;
  isBoss: boolean;
  isElite: boolean;
  accessoryDropIds?: string[];
}

export interface DamageContext {
  attacker: BattleUnit;
  defender: BattleUnit;
  skill: BattleSkill;
  isBasicAttack: boolean;
}
