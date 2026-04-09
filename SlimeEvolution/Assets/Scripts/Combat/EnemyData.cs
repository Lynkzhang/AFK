using System;
using System.Collections.Generic;
using SlimeEvolution.Core;

namespace SlimeEvolution.Combat
{
    [Serializable]
    public class EnemySkillData
    {
        public string skillName;
        public SkillType skillType;
        public TargetType targetType;
        public float baseDamage;
        public float baseHeal;
        public float scaling;
        public int cooldown;
    }

    [Serializable]
    public class EnemyData
    {
        public string enemyName;
        public SlimeStats stats;
        public Rarity rarity;
        public List<EnemySkillData> skills;
        public int goldReward;
    }

    [Serializable]
    public class EnemyDatabase
    {
        public List<EnemyData> enemies;
    }
}
