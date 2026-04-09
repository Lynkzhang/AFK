using UnityEngine;
using SlimeEvolution.Core;

namespace SlimeEvolution.Combat
{
    public static class CombatCalculator
    {
        public static int CalculateDamage(BattleUnit attacker, SkillData skill, BattleUnit defender)
        {
            float rawDamage = skill.baseDamage + attacker.ATK * skill.scaling;
            float damageReduction = defender.DEF / (defender.DEF + 50f);
            float finalDamage = rawDamage * (1f - damageReduction);
            return Mathf.Max(1, Mathf.FloorToInt(finalDamage));
        }

        public static int CalculateHeal(BattleUnit caster, SkillData skill)
        {
            float healAmount = skill.baseHeal + caster.ATK * 0.8f;
            return Mathf.Max(1, Mathf.FloorToInt(healAmount));
        }

        public static int CalculateShield(BattleUnit caster, SkillData skill)
        {
            float shieldHP = caster.DEF * 1.5f + skill.baseDamage;
            return Mathf.Max(1, Mathf.FloorToInt(shieldHP));
        }

        public static int CalculateDamageWithEnemySkill(BattleUnit attacker, EnemySkillData skill, BattleUnit defender)
        {
            float rawDamage = skill.baseDamage + attacker.ATK * skill.scaling;
            float damageReduction = defender.DEF / (defender.DEF + 50f);
            float finalDamage = rawDamage * (1f - damageReduction);
            return Mathf.Max(1, Mathf.FloorToInt(finalDamage));
        }
    }
}
