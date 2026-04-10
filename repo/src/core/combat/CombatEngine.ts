// ===== Combat Engine =====
// Turn-based PVE combat engine. Pure logic, no UI.

import type { Slime, Skill } from '../types';
import type {
  BattleUnit,
  BattleSkill,
  BattleResult,
  BattleLogEntry,
  StageConfig,
  EnemyTemplate,
  DamageContext,
  DamageResult,
} from './CombatTypes';
import {
  COMBAT_CONFIG,
  ENERGY,
  SKILL_ENERGY_COST,
  STATUS_PARAMS,
  BUFF_PARAMS,
} from './CombatConstants';
import { selectEnemyAction, selectPlayerAutoAction } from './EnemyAI';

// ---------- Helper ----------

function hasTrait(unit: BattleUnit, traitId: string): boolean {
  return unit.traits.includes(traitId);
}

function makeBasicAttack(): BattleSkill {
  return {
    id: 'basic-attack',
    name: '普通攻击',
    type: 'attack',
    targetType: 'single',
    power: 0,
    energyCost: 0,
    maxCooldown: 0,
    currentCooldown: 0,
  };
}

function toBattleSkill(s: Skill): BattleSkill {
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    targetType: s.targetType as BattleSkill['targetType'],
    power: s.damage,
    energyCost: SKILL_ENERGY_COST[s.id] ?? 0,
    maxCooldown: s.cooldown,
    currentCooldown: 0,
  };
}

// ---------- Init ----------

export function initBattleUnit(slime: Slime, side: 0 | 1, slotIndex: number): BattleUnit {
  let maxHp = slime.stats.health;
  let baseAtk = slime.stats.attack;
  let baseDef = slime.stats.defense;
  let baseSpd = slime.stats.speed;

  const traitIds = slime.traits.map(t => t.id);

  // Additive traits
  if (traitIds.includes('thick-gel'))  maxHp += 5;
  if (traitIds.includes('hard-shell')) baseDef += 3;
  if (traitIds.includes('feral-rush')) baseAtk += 6;

  // Multiplicative traits (origin-core)
  if (traitIds.includes('origin-core')) {
    maxHp   = Math.floor(maxHp * 1.10);
    baseAtk = Math.floor(baseAtk * 1.10);
    baseDef = Math.floor(baseDef * 1.10);
    baseSpd = Math.floor(baseSpd * 1.10);
  }

  const skills: BattleSkill[] = [
    makeBasicAttack(),
    ...slime.skills.map(s => toBattleSkill(s)),
  ];

  const unit: BattleUnit = {
    slimeId: slime.id,
    name: slime.name,
    side,
    slotIndex,
    maxHp,
    baseAttack: baseAtk,
    baseDefense: baseDef,
    baseSpeed: baseSpd,
    currentHp: maxHp,
    energy: ENERGY.initial,
    shield: 0,
    shieldTurns: 0,
    effectiveAttack: baseAtk,
    effectiveDefense: baseDef,
    effectiveSpeed: baseSpd,
    statusEffects: [],
    skills,
    traits: traitIds,
    bonusCritRate: 0,
    alive: true,
    stunImmuneTurns: 0,
  };

  calcEffectiveStats(unit);
  return unit;
}

export function createEnemyUnit(template: EnemyTemplate, side: 0 | 1, slotIndex: number): BattleUnit {
  const skills: BattleSkill[] = [
    makeBasicAttack(),
    ...template.skills.map(s => ({ ...s, currentCooldown: 0 })),
  ];

  const unit: BattleUnit = {
    slimeId: template.id,
    name: template.name,
    side,
    slotIndex,
    maxHp: template.baseHp,
    baseAttack: template.baseAtk,
    baseDefense: template.baseDef,
    baseSpeed: template.baseSpd,
    currentHp: template.baseHp,
    energy: 0,
    shield: 0,
    shieldTurns: 0,
    effectiveAttack: template.baseAtk,
    effectiveDefense: template.baseDef,
    effectiveSpeed: template.baseSpd,
    statusEffects: [],
    skills,
    traits: template.traits,
    bonusCritRate: 0,
    alive: true,
    stunImmuneTurns: 0,
  };

  calcEffectiveStats(unit);
  return unit;
}

// ---------- Stats ----------

export function calcEffectiveStats(unit: BattleUnit): void {
  let atkMult = 1.0;
  let defMult = 1.0;
  let spdMult = 1.0;

  // Trait: origin-core → all stats +10%
  if (hasTrait(unit, 'origin-core')) {
    atkMult += 0.10;
    defMult += 0.10;
    spdMult += 0.10;
  }

  // Trait: keen-sense → SPD +8%
  if (hasTrait(unit, 'keen-sense')) spdMult += 0.08;

  // Flat bonuses from traits (already baked into baseAttack/baseDefense during init,
  // but calcEffectiveStats uses base + flat for the effective calc)
  const flatAtkBonus = 0; // Already in baseAttack from init
  const flatDefBonus = 0; // Already in baseDefense from init

  // Buff/debuff from status effects
  for (const effect of unit.statusEffects) {
    switch (effect.type) {
      case 'atk_up':   atkMult += effect.value; break;
      case 'def_up':   defMult += effect.value; break;
      case 'spd_up':   spdMult += effect.value; break;
      case 'atk_down': atkMult -= effect.value; break;
      case 'def_down': defMult -= effect.value; break;
    }
  }

  unit.effectiveAttack  = Math.max(1, Math.floor((unit.baseAttack + flatAtkBonus) * atkMult));
  unit.effectiveDefense = Math.max(1, Math.floor((unit.baseDefense + flatDefBonus) * defMult));
  unit.effectiveSpeed   = Math.max(1, Math.floor(unit.baseSpeed * spdMult));
}

// ---------- Action Order ----------

export function determineActionOrder(units: BattleUnit[]): BattleUnit[] {
  return [...units].sort((a, b) => {
    if (b.effectiveSpeed !== a.effectiveSpeed) {
      return b.effectiveSpeed - a.effectiveSpeed;
    }
    if (a.side !== b.side) return a.side - b.side;
    return a.slotIndex - b.slotIndex;
  });
}

// ---------- Damage ----------

function getElementMultiplier(attacker: BattleUnit, defender: BattleUnit): number {
  if (hasTrait(attacker, 'toxin-blood') && hasTrait(defender, 'adaptive-membrane')) return 0.75;
  if (hasTrait(attacker, 'feral-rush') && hasTrait(defender, 'phase-body')) return 0.80;
  return 1.0;
}

function calcBaseDamage(ctx: DamageContext): number {
  const atk = ctx.attacker.effectiveAttack;
  if (ctx.isBasicAttack) return atk;
  return atk * (1 + ctx.skill.power / 20);
}

function calcDefenseReduction(def: number): number {
  return def / (def + COMBAT_CONFIG.defConstant);
}

function calcCritRate(spd: number, bonusCritRate: number): number {
  return Math.min(
    COMBAT_CONFIG.critMaxRate,
    COMBAT_CONFIG.critBaseRate + spd * COMBAT_CONFIG.critSpdScaling + bonusCritRate,
  );
}

export function calculateDamage(ctx: DamageContext): DamageResult {
  // Step 1: Dodge (phase-body)
  if (hasTrait(ctx.defender, 'phase-body')) {
    if (Math.random() < 0.15) {
      return { damage: 0, isCrit: false, isDodge: true };
    }
  }

  // Step 2: Base damage
  let dmg = calcBaseDamage(ctx);

  // Step 3: Element multiplier
  dmg *= getElementMultiplier(ctx.attacker, ctx.defender);

  // Step 4: Crit
  const critRate = calcCritRate(ctx.attacker.effectiveSpeed, ctx.attacker.bonusCritRate);
  const isCrit = Math.random() < critRate;
  if (isCrit) {
    dmg *= COMBAT_CONFIG.critMultiplier;
  }

  // Step 5: Defense reduction
  const reduction = calcDefenseReduction(ctx.defender.effectiveDefense);
  dmg *= (1 - reduction);

  // Step 6: Random ±5%
  dmg *= (COMBAT_CONFIG.damageFloorMultiplier + Math.random() * (COMBAT_CONFIG.damageCeilMultiplier - COMBAT_CONFIG.damageFloorMultiplier));

  // Step 7: Floor
  const finalDamage = Math.max(COMBAT_CONFIG.minDamage, Math.floor(dmg));

  return { damage: finalDamage, isCrit, isDodge: false };
}

// ---------- Healing ----------

export function calculateHealing(healer: BattleUnit, skill: BattleSkill): number {
  let heal = skill.power * (1 + healer.effectiveAttack / 50);
  if (hasTrait(healer, 'mind-link')) {
    heal *= 1.20;
  }
  // Burn reduces healing
  const hasBurn = healer.statusEffects.some(e => e.type === 'burn');
  if (hasBurn) {
    heal *= (1 - STATUS_PARAMS.burn.healReduction);
  }
  return Math.max(COMBAT_CONFIG.minHealing, Math.floor(heal));
}

// ---------- Shield ----------

export function calcShieldValue(caster: BattleUnit, skillId: string): number {
  if (skillId === 'gel-shield') {
    return Math.floor(caster.effectiveDefense * 1.5);
  }
  return 0;
}

// ---------- DOT ----------

export function applyDotEffects(unit: BattleUnit): number {
  let totalDotDamage = 0;
  for (const effect of unit.statusEffects) {
    if (effect.type === 'poison') {
      const dmg = STATUS_PARAMS.poison.baseDamage
                + Math.floor(effect.value * STATUS_PARAMS.poison.atkScaling);
      totalDotDamage += dmg * effect.stackCount;
    }
    if (effect.type === 'burn') {
      const dmg = STATUS_PARAMS.burn.baseDamage
                + Math.floor(effect.value * STATUS_PARAMS.burn.atkScaling);
      totalDotDamage += dmg;
    }
  }
  unit.currentHp = Math.max(0, unit.currentHp - totalDotDamage);
  if (unit.currentHp <= 0) unit.alive = false;
  return totalDotDamage;
}

// ---------- Status Effects ----------

function applyPoison(target: BattleUnit, attackerAtk: number): void {
  const existing = target.statusEffects.find(e => e.type === 'poison');
  if (existing) {
    if (existing.stackCount < STATUS_PARAMS.poison.maxStacks) {
      existing.stackCount += 1;
    }
    existing.remainingTurns = STATUS_PARAMS.poison.duration;
    // Use max value for DOT calc
    existing.value = Math.max(existing.value, attackerAtk);
  } else {
    target.statusEffects.push({
      id: `poison-${Date.now()}`,
      type: 'poison',
      remainingTurns: STATUS_PARAMS.poison.duration,
      value: attackerAtk,
      stackCount: 1,
    });
  }
}

function applyBurn(target: BattleUnit, attackerAtk: number): void {
  const existing = target.statusEffects.find(e => e.type === 'burn');
  if (existing) {
    // Not stackable — just refresh duration and update value
    existing.remainingTurns = STATUS_PARAMS.burn.duration;
    existing.value = Math.max(existing.value, attackerAtk);
  } else {
    target.statusEffects.push({
      id: `burn-${Date.now()}`,
      type: 'burn',
      remainingTurns: STATUS_PARAMS.burn.duration,
      value: attackerAtk,
      stackCount: 1,
    });
  }
}

function applyFreeze(target: BattleUnit): void {
  // High-speed targets have a chance to resist
  if (target.effectiveSpeed > STATUS_PARAMS.freeze.resistThreshold) {
    if (Math.random() < STATUS_PARAMS.freeze.resistChance) {
      return; // Resisted
    }
  }
  // Don't stack — if already frozen, skip
  const existing = target.statusEffects.find(e => e.type === 'freeze');
  if (existing) return;
  target.statusEffects.push({
    id: `freeze-${Date.now()}`,
    type: 'freeze',
    remainingTurns: STATUS_PARAMS.freeze.duration,
    value: 0,
    stackCount: 1,
  });
}

function applyBuff(target: BattleUnit, buffType: 'atk_up' | 'def_up' | 'spd_up', percent: number, duration: number): void {
  const existing = target.statusEffects.find(e => e.type === buffType);
  if (existing) {
    // Take highest value, refresh duration
    existing.value = Math.max(existing.value, percent);
    existing.remainingTurns = Math.max(existing.remainingTurns, duration);
  } else {
    target.statusEffects.push({
      id: `${buffType}-${Date.now()}`,
      type: buffType,
      remainingTurns: duration,
      value: percent,
      stackCount: 1,
    });
  }
}

function tickStatusEffects(unit: BattleUnit): void {
  for (const effect of unit.statusEffects) {
    effect.remainingTurns -= 1;
  }
  unit.statusEffects = unit.statusEffects.filter(e => e.remainingTurns > 0);
}

function isControlled(unit: BattleUnit): boolean {
  return unit.statusEffects.some(e => e.type === 'freeze' || e.type === 'stun');
}

// ---------- Apply damage to shield/HP ----------

function applyDamageToUnit(target: BattleUnit, damage: number): void {
  if (target.shield > 0 && target.shieldTurns > 0) {
    if (target.shield >= damage) {
      target.shield -= damage;
      return;
    } else {
      const overflow = damage - target.shield;
      target.shield = 0;
      target.shieldTurns = 0;
      target.currentHp = Math.max(0, target.currentHp - overflow);
    }
  } else {
    target.currentHp = Math.max(0, target.currentHp - damage);
  }
  if (target.currentHp <= 0) {
    target.alive = false;
  }
}

// ---------- Stars ----------

export function evaluateStars(result: { victory: boolean; alliesDead: number; turnsUsed: number; maxTurns: number }): 0 | 1 | 2 | 3 {
  if (!result.victory) return 0;
  if (result.alliesDead > 0) return 1;
  if (result.turnsUsed > Math.floor(result.maxTurns * COMBAT_CONFIG.starThresholdTurnRatio)) return 2;
  return 3;
}

// ---------- Execute Action ----------

interface ActionChoice {
  skill: BattleSkill;
  targets: BattleUnit[];
  isBasicAttack: boolean;
}

function executeAction(
  actor: BattleUnit,
  choice: ActionChoice,
  allUnits: BattleUnit[],
  log: BattleLogEntry[],
  turnNumber: number,
): void {
  const { skill, targets, isBasicAttack } = choice;

  // Deduct energy & set CD (enemies don't use energy)
  if (actor.side === 0) {
    actor.energy = Math.max(0, actor.energy - skill.energyCost);
  }
  if (skill.maxCooldown > 0) {
    skill.currentCooldown = skill.maxCooldown;
  }

  // Basic attack extra energy
  if (isBasicAttack && actor.side === 0) {
    actor.energy = Math.min(ENERGY.max, actor.energy + ENERGY.onBasicAttack);
  }

  if (skill.type === 'attack') {
    for (const target of targets) {
      if (!target.alive) continue;
      const ctx: DamageContext = { attacker: actor, defender: target, skill, isBasicAttack };
      const result = calculateDamage(ctx);

      if (result.isDodge) {
        log.push({ turn: turnNumber, actorName: actor.name, action: skill.name, target: target.name, value: 0, detail: 'DODGE' });
        continue;
      }

      applyDamageToUnit(target, result.damage);

      log.push({
        turn: turnNumber,
        actorName: actor.name,
        action: skill.name,
        target: target.name,
        value: result.damage,
        detail: result.isCrit ? 'CRIT' : 'HIT',
      });

      // Target gains energy on hit
      if (target.alive && target.side === 0) {
        target.energy = Math.min(ENERGY.max, target.energy + ENERGY.onHit);
      }

      // Break freeze on physical hit
      const freezeEffect = target.statusEffects.find(e => e.type === 'freeze');
      if (freezeEffect) {
        target.statusEffects = target.statusEffects.filter(e => e.type !== 'freeze');
      }

      // Trait: toxin-blood → 30% poison on hit
      if (hasTrait(actor, 'toxin-blood') && target.alive) {
        if (Math.random() < STATUS_PARAMS.poison.triggerChance) {
          applyPoison(target, actor.baseAttack);
          log.push({ turn: turnNumber, actorName: actor.name, action: 'toxin-blood', target: target.name, value: 0, detail: 'POISON applied' });
        }
      }

      // Fire skills → 30% burn on hit
      if ((skill.id === 'fire-breath' || skill.id === 'fire-blast') && target.alive) {
        if (Math.random() < 0.30) {
          applyBurn(target, actor.baseAttack);
          log.push({ turn: turnNumber, actorName: actor.name, action: skill.id, target: target.name, value: 0, detail: 'BURN applied' });
        }
      }

      // Ice skills → 25% freeze on hit
      if ((skill.id === 'ice-bolt' || skill.id === 'blizzard') && target.alive) {
        if (Math.random() < 0.25) {
          applyFreeze(target);
          const froze = target.statusEffects.some(e => e.type === 'freeze');
          if (froze) {
            log.push({ turn: turnNumber, actorName: actor.name, action: skill.id, target: target.name, value: 0, detail: 'FREEZE applied' });
          }
        }
      }

      // Trait: adaptive-membrane → DEF+20% buff on being hit
      if (hasTrait(target, 'adaptive-membrane') && target.alive) {
        applyBuff(target, 'def_up', BUFF_PARAMS.def_up.sources['adaptive-membrane'].percent, BUFF_PARAMS.def_up.sources['adaptive-membrane'].duration);
        calcEffectiveStats(target);
      }
    }
  } else if (skill.type === 'heal') {
    const healAmount = calculateHealing(actor, skill);
    for (const target of targets) {
      if (!target.alive) continue;
      const before = target.currentHp;
      target.currentHp = Math.min(target.maxHp, target.currentHp + healAmount);
      const healed = target.currentHp - before;
      log.push({ turn: turnNumber, actorName: actor.name, action: skill.name, target: target.name, value: healed, detail: 'HEAL' });
    }
  } else if (skill.type === 'defense') {
    if (skill.id === 'gel-shield') {
      const shieldVal = calcShieldValue(actor, skill.id);
      actor.shield = shieldVal;
      actor.shieldTurns = 2;
      log.push({ turn: turnNumber, actorName: actor.name, action: skill.name, target: actor.name, value: shieldVal, detail: 'SHIELD' });
    } else if (skill.id === 'harden') {
      applyBuff(actor, 'def_up', BUFF_PARAMS.def_up.sources['harden'].percent, BUFF_PARAMS.def_up.sources['harden'].duration);
      calcEffectiveStats(actor);
      log.push({ turn: turnNumber, actorName: actor.name, action: skill.name, target: actor.name, value: 0, detail: 'DEF_UP' });
    }
  } else if (skill.type === 'support') {
    if (skill.id === 'focus-pulse') {
      for (const target of targets) {
        if (!target.alive) continue;
        applyBuff(target, 'atk_up', BUFF_PARAMS.atk_up.sources['focus-pulse'].percent, BUFF_PARAMS.atk_up.sources['focus-pulse'].duration);
        calcEffectiveStats(target);
        log.push({ turn: turnNumber, actorName: actor.name, action: skill.name, target: target.name, value: 0, detail: 'ATK_UP' });
      }
    } else if (skill.id === 'speed-song') {
      // Team buff
      const allies = allUnits.filter(u => u.side === actor.side && u.alive);
      for (const ally of allies) {
        applyBuff(ally, 'spd_up', BUFF_PARAMS.spd_up.sources['speed-song'].percent, BUFF_PARAMS.spd_up.sources['speed-song'].duration);
        calcEffectiveStats(ally);
      }
      log.push({ turn: turnNumber, actorName: actor.name, action: skill.name, target: 'team', value: 0, detail: 'SPD_UP' });
    }
  }
}

// ---------- Choose action for auto-battle ----------

function chooseTargets(
  actor: BattleUnit,
  skill: BattleSkill,
  allUnits: BattleUnit[],
): BattleUnit[] {
  const enemies = allUnits.filter(u => u.side !== actor.side && u.alive);
  const allies = allUnits.filter(u => u.side === actor.side && u.alive);

  switch (skill.targetType) {
    case 'single': {
      if (skill.type === 'attack') {
        // Lowest HP enemy
        const target = enemies.reduce((low, e) => e.currentHp < low.currentHp ? e : low, enemies[0]!);
        return [target];
      } else {
        // Heal/support: lowest HP% ally
        const target = allies.reduce((low, a) =>
          (a.currentHp / a.maxHp) < (low.currentHp / low.maxHp) ? a : low, allies[0]!);
        return [target];
      }
    }
    case 'aoe':
      return skill.type === 'attack' ? enemies : allies;
    case 'self':
      return [actor];
    case 'ally': {
      const target = allies.reduce((low, a) =>
        (a.currentHp / a.maxHp) < (low.currentHp / low.maxHp) ? a : low, allies[0]!);
      return [target];
    }
    case 'team':
      return allies;
    default:
      return [actor];
  }
}

// ---------- Main Battle Runner ----------

export function runBattle(playerSlimes: Slime[], stage: StageConfig): BattleResult {
  const log: BattleLogEntry[] = [];

  // Init player units
  const playerUnits = playerSlimes.slice(0, COMBAT_CONFIG.maxTeamSize).map((s, i) =>
    initBattleUnit(s, 0, i),
  );

  // Init enemy units
  const enemyUnits = stage.enemies.map((e, i) =>
    createEnemyUnit(e, 1, i),
  );

  const allUnits = [...playerUnits, ...enemyUnits];

  // Boss rage tracker
  const bossRageMap = new Map<string, boolean>();

  let turnNumber = 0;

  while (turnNumber < COMBAT_CONFIG.maxTurns) {
    turnNumber++;

    // Recalc effective stats for all alive units
    for (const u of allUnits) {
      if (u.alive) calcEffectiveStats(u);
    }

    // Determine action order
    const order = determineActionOrder(allUnits.filter(u => u.alive));

    for (const actor of order) {
      if (!actor.alive) continue;

      // Step 1: DOT effects
      const dotDmg = applyDotEffects(actor);
      if (dotDmg > 0) {
        log.push({ turn: turnNumber, actorName: actor.name, action: 'DOT', target: actor.name, value: dotDmg, detail: 'DOT_DAMAGE' });
      }
      if (!actor.alive) continue;

      // Step 2: Control check
      if (isControlled(actor)) {
        const controlType = actor.statusEffects.find(e => e.type === 'freeze' || e.type === 'stun');
        log.push({ turn: turnNumber, actorName: actor.name, action: 'SKIP', target: actor.name, value: 0, detail: controlType ? controlType.type.toUpperCase() : 'CONTROLLED' });
        // Stun → set immunity
        if (actor.statusEffects.some(e => e.type === 'stun')) {
          actor.stunImmuneTurns = STATUS_PARAMS.stun.immunityAfterStun;
        }
        tickStatusEffects(actor);
        continue;
      }

      // Decrement stun immunity
      if (actor.stunImmuneTurns > 0) actor.stunImmuneTurns--;

      // Step 3: Energy gain
      if (actor.side === 0) {
        actor.energy = Math.min(ENERGY.max, actor.energy + ENERGY.perTurn);
      }

      // Shield decay
      if (actor.shieldTurns > 0) {
        actor.shieldTurns--;
        if (actor.shieldTurns <= 0) actor.shield = 0;
      }

      // Step 4: Action selection
      let chosenSkill: BattleSkill;
      const enemies = allUnits.filter(u => u.side !== actor.side && u.alive);
      const allies = allUnits.filter(u => u.side === actor.side && u.alive);

      // Boss rage check (1-10 boss)
      if (actor.side === 1 && stage.isBoss) {
        const rageKey = actor.slimeId;
        if (!bossRageMap.get(rageKey) && actor.currentHp < actor.maxHp * 0.30) {
          bossRageMap.set(rageKey, true);
          actor.baseAttack = Math.floor(actor.baseAttack * 1.30);
          calcEffectiveStats(actor);
          log.push({ turn: turnNumber, actorName: actor.name, action: 'RAGE', target: actor.name, value: 0, detail: 'ATK+30%' });
        }
      }

      if (actor.side === 1) {
        // Enemy AI
        const bossConfig = stage.isBoss ? { isBoss: true, stageId: stage.id } : undefined;
        chosenSkill = selectEnemyAction(actor, allies, enemies, turnNumber, bossConfig);
      } else {
        // Player auto AI
        chosenSkill = selectPlayerAutoAction(actor, allies, enemies, turnNumber);
      }

      // Step 5: Execute action
      const targets = chooseTargets(actor, chosenSkill, allUnits);
      const isBasic = chosenSkill.id === 'basic-attack';
      executeAction(actor, { skill: chosenSkill, targets, isBasicAttack: isBasic }, allUnits, log, turnNumber);

      // Step 7: Kill check
      for (const u of allUnits) {
        if (u.currentHp <= 0 && u.alive) {
          u.alive = false;
        }
      }

      // Step 8: CD -1 for actor skills
      for (const sk of actor.skills) {
        if (sk.currentCooldown > 0) sk.currentCooldown--;
      }

      // Tick status effects
      tickStatusEffects(actor);

      // Step 9: Victory check
      const allEnemiesDead = allUnits.filter(u => u.side === 1).every(u => !u.alive);
      const allAlliesDead = allUnits.filter(u => u.side === 0).every(u => !u.alive);

      if (allEnemiesDead || allAlliesDead) {
        const victory = allEnemiesDead;
        const alliesDead = playerUnits.filter(u => !u.alive).length;
        const resultBase = { victory, turnsUsed: turnNumber, maxTurns: COMBAT_CONFIG.maxTurns, alliesDead };
        const stars = evaluateStars(resultBase);
        return {
          ...resultBase,
          stars,
          rewards: victory ? stage.reward : { gold: 0, crystals: 0, items: [] },
          log,
        };
      }
    }
  }

  // Timeout: compare HP%
  const allyHpPct = allUnits.filter(u => u.side === 0).reduce((s, u) => s + u.currentHp / u.maxHp, 0)
    / Math.max(1, allUnits.filter(u => u.side === 0).length);
  const enemyHpPct = allUnits.filter(u => u.side === 1).reduce((s, u) => s + u.currentHp / u.maxHp, 0)
    / Math.max(1, allUnits.filter(u => u.side === 1).length);

  const victory = allyHpPct > enemyHpPct;
  const alliesDead = playerUnits.filter(u => !u.alive).length;
  const resultBase = { victory, turnsUsed: COMBAT_CONFIG.maxTurns, maxTurns: COMBAT_CONFIG.maxTurns, alliesDead };
  const stars = evaluateStars(resultBase);
  return {
    ...resultBase,
    stars,
    rewards: victory ? stage.reward : { gold: 0, crystals: 0, items: [] },
    log,
  };
}
