// ===== Combat Constants =====
// All combat-related constants, strictly matching combat_design.md §10.

export const COMBAT_CONFIG = {
  maxTeamSize: 4,
  maxTurns: 30,
  critBaseRate: 0.05,
  critSpdScaling: 0.005,
  critMaxRate: 0.30,
  critMultiplier: 1.5,
  defConstant: 50,
  damageFloorMultiplier: 0.95,
  damageCeilMultiplier: 1.05,
  minDamage: 1,
  minHealing: 1,
  starThresholdTurnRatio: 0.6,
  repeatClearGoldRatio: 0.5,
} as const;

export const ENERGY = {
  initial: 0,
  perTurn: 10,
  onBasicAttack: 10,
  onHit: 5,
  max: 100,
} as const;

export const CHAPTER_SCALING = {
  chapterMultiplier: 0.40,
  stageMultiplier: 0.06,
  bossHpMult: 2.5,
  bossAtkMult: 1.4,
  bossDefMult: 1.3,
  bossSpdMult: 1.1,
  eliteHpMult: 1.6,
  eliteAtkMult: 1.2,
  eliteDefMult: 1.2,
  eliteSpdMult: 1.0,
} as const;

export const SKILL_ENERGY_COST: Record<string, number> = {
  'basic-attack': 0,
  'slime-spit': 30,
  'acid-wave': 50,
  'gel-shield': 40,
  'harden': 35,
  'focus-pulse': 40,
  'speed-song': 60,
  'regen-drop': 45,
  'vital-surge': 70,
  'fire-breath': 30,
  'fire-blast': 50,
  'ice-bolt': 35,
  'blizzard': 55,
};

export const STATUS_PARAMS = {
  poison: {
    baseDamage: 2,
    atkScaling: 0.10,
    duration: 3,
    stackable: true,
    maxStacks: 3,
    triggerChance: 0.30,
    ignoresDefense: true,
  },
  burn: {
    baseDamage: 3,
    atkScaling: 0.15,
    duration: 2,
    stackable: false,
    maxStacks: 1,
    healReduction: 0.30,
    ignoresDefense: true,
  },
  freeze: {
    damage: 0,
    duration: 1,
    stackable: false,
    skipsAction: true,
    breakOnPhysicalHit: true,
    resistThreshold: 20,
    resistChance: 0.30,
  },
  stun: {
    damage: 0,
    duration: 1,
    stackable: false,
    skipsAction: true,
    immunityAfterStun: 1,
  },
} as const;

export const BUFF_PARAMS = {
  atk_up: {
    sources: {
      'focus-pulse': { percent: 0.25, duration: 2 },
      'origin-core': { percent: 0.10, duration: 999 },
    },
    stackable: false,
    takeHighest: true,
  },
  def_up: {
    sources: {
      'harden': { percent: 0.50, duration: 3 },
      'adaptive-membrane': { percent: 0.20, duration: 2 },
    },
    stackable: false,
    takeHighest: true,
  },
  spd_up: {
    sources: {
      'speed-song': { percent: 0.30, duration: 2 },
    },
    stackable: false,
  },
} as const;
