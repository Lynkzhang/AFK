using System;
using System.Collections.Generic;
using SlimeEvolution.Core;

namespace SlimeEvolution.Combat
{
    [Serializable]
    public class BattleUnit
    {
        public string unitName;
        public int maxHP;
        public int currentHP;
        public int ATK;
        public int DEF;
        public int SPD;
        public int shield;
        public int shieldTurnsLeft;
        public bool isEnemy;
        public SlimeInstance sourceSlime;
        public EnemyData sourceEnemy;
        public List<SkillData> skills;
        public List<EnemySkillData> enemySkills;
        public Dictionary<int, int> cooldowns;

        public bool IsAlive => currentHP > 0;

        public static BattleUnit FromSlime(SlimeInstance slime)
        {
            return new BattleUnit
            {
                unitName = slime.slimeName,
                maxHP = slime.stats.HP,
                currentHP = slime.stats.HP,
                ATK = slime.stats.ATK,
                DEF = slime.stats.DEF,
                SPD = slime.stats.SPD,
                shield = 0,
                shieldTurnsLeft = 0,
                isEnemy = false,
                sourceSlime = slime,
                sourceEnemy = null,
                skills = slime.skills ?? new List<SkillData>(),
                enemySkills = new List<EnemySkillData>(),
                cooldowns = new Dictionary<int, int>()
            };
        }

        public static BattleUnit FromEnemy(EnemyData enemy)
        {
            return new BattleUnit
            {
                unitName = enemy.enemyName,
                maxHP = enemy.stats.HP,
                currentHP = enemy.stats.HP,
                ATK = enemy.stats.ATK,
                DEF = enemy.stats.DEF,
                SPD = enemy.stats.SPD,
                shield = 0,
                shieldTurnsLeft = 0,
                isEnemy = true,
                sourceSlime = null,
                sourceEnemy = enemy,
                skills = new List<SkillData>(),
                enemySkills = enemy.skills ?? new List<EnemySkillData>(),
                cooldowns = new Dictionary<int, int>()
            };
        }

        public void TakeDamage(int damage)
        {
            int remaining = damage;
            if (shield > 0)
            {
                int absorbed = Math.Min(shield, remaining);
                shield -= absorbed;
                remaining -= absorbed;
            }

            if (remaining > 0)
            {
                currentHP = Math.Max(0, currentHP - remaining);
            }
        }

        public void Heal(int amount)
        {
            currentHP = Math.Min(maxHP, currentHP + amount);
        }

        public void ApplyShield(int shieldHP, int duration)
        {
            shield = Math.Max(shield, shieldHP);
            shieldTurnsLeft = Math.Max(shieldTurnsLeft, duration);
        }

        public void TickCooldowns()
        {
            var keys = new List<int>(cooldowns.Keys);
            foreach (var key in keys)
            {
                cooldowns[key] = Math.Max(0, cooldowns[key] - 1);
            }
        }

        public void TickShield()
        {
            if (shieldTurnsLeft > 0)
            {
                shieldTurnsLeft--;
                if (shieldTurnsLeft <= 0)
                {
                    shield = 0;
                    shieldTurnsLeft = 0;
                }
            }
        }
    }
}
