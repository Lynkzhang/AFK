// ===== Enemy AI =====
// AI logic for enemy and player auto-battle action selection.

import type { BattleUnit, BattleSkill } from './CombatTypes';

interface BossConfig {
  isBoss: boolean;
  stageId: string;
}

/**
 * Select an action for an enemy unit.
 * Enemies don't use energy; they only check CD.
 * Priority: boss special > heal (if ally <50% HP) > AOE attack > single attack > basic attack
 */
export function selectEnemyAction(
  unit: BattleUnit,
  allies: BattleUnit[],
  _enemies: BattleUnit[],
  turnNumber: number,
  bossConfig?: BossConfig,
): BattleSkill {
  const basicAttack = unit.skills.find(s => s.id === 'basic-attack')!;
  const availableSkills = unit.skills.filter(s => s.id !== 'basic-attack' && s.currentCooldown === 0);

  // Boss 1-10: every 5 turns use enemy-quake
  if (bossConfig?.isBoss && bossConfig.stageId === '1-10' && turnNumber % 5 === 0) {
    const quake = unit.skills.find(s => s.id === 'enemy-quake');
    if (quake && quake.currentCooldown === 0) {
      return quake;
    }
  }

  // Heal: if any ally has <50% HP
  const needsHeal = allies.some(a => a.alive && (a.currentHp / a.maxHp) < 0.5);
  if (needsHeal) {
    const healSkill = availableSkills.find(s => s.type === 'heal');
    if (healSkill) return healSkill;
  }

  // AOE attack
  const aoeAttack = availableSkills.find(s => s.type === 'attack' && s.targetType === 'aoe');
  if (aoeAttack) return aoeAttack;

  // Single attack
  const singleAttack = availableSkills.find(s => s.type === 'attack' && s.targetType === 'single');
  if (singleAttack) return singleAttack;

  // Defense/support skills
  const defenseSkill = availableSkills.find(s => s.type === 'defense');
  if (defenseSkill) return defenseSkill;

  const supportSkill = availableSkills.find(s => s.type === 'support');
  if (supportSkill) return supportSkill;

  return basicAttack;
}

/**
 * Select an action for player auto-battle.
 * Same logic as enemy AI, but uses energy system.
 */
export function selectPlayerAutoAction(
  unit: BattleUnit,
  allies: BattleUnit[],
  _enemies: BattleUnit[],
  _turnNumber: number,
): BattleSkill {
  const basicAttack = unit.skills.find(s => s.id === 'basic-attack')!;
  const availableSkills = unit.skills.filter(
    s => s.id !== 'basic-attack' && s.currentCooldown === 0 && unit.energy >= s.energyCost,
  );

  // Heal: if any ally has <50% HP
  const needsHeal = allies.some(a => a.alive && (a.currentHp / a.maxHp) < 0.5);
  if (needsHeal) {
    const healSkill = availableSkills.find(s => s.type === 'heal');
    if (healSkill) return healSkill;
  }

  // AOE attack
  const aoeAttack = availableSkills.find(s => s.type === 'attack' && s.targetType === 'aoe');
  if (aoeAttack) return aoeAttack;

  // Single attack
  const singleAttack = availableSkills.find(s => s.type === 'attack' && s.targetType === 'single');
  if (singleAttack) return singleAttack;

  // Defense
  const defenseSkill = availableSkills.find(s => s.type === 'defense');
  if (defenseSkill) return defenseSkill;

  // Support
  const supportSkill = availableSkills.find(s => s.type === 'support');
  if (supportSkill) return supportSkill;

  return basicAttack;
}
