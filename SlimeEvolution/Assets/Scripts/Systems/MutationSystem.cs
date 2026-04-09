using System.Collections.Generic;
using UnityEngine;

namespace SlimeEvolution.Systems
{
    using Core;

    /// <summary>
    /// 变异系统：负责在史莱姆分裂时决定子代的变异方向。
    /// 调用方：SlimeFactory.Breed()
    /// </summary>
    public static class MutationSystem
    {
        // ── 变异概率常量（可由 BreedingGroundConfig 覆盖） ───────────────
        private const float BASE_STAT_MUTATION_CHANCE  = 0.6f;   // 某项属性发生变化的概率
        private const float STAT_VARIANCE_RATIO        = 0.15f;  // 属性波动幅度（±15%）
        private const float TRAIT_INHERIT_CHANCE       = 0.5f;   // 继承亲代特性的概率（策划定义 50%）
        private const float NEW_TRAIT_CHANCE           = 0.1f;   // 获得全新特性的概率（策划定义 10%）
        private const float SKILL_INHERIT_CHANCE       = 0.5f;   // 继承亲代技能的概率（策划定义 50%）
        private const float NEW_SKILL_CHANCE           = 0.1f;   // 获得全新技能的概率（策划定义 10%）
        private const float RARITY_UPGRADE_CHANCE      = 0.05f;  // 稀有度升级的概率

        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// 对亲代属性应用随机变异，返回子代属性。
        /// mutBonus 由亲代 MUT 属性换算而来（0~1 的额外变异加成）。
        /// </summary>
        public static SlimeStats MutateStats(SlimeStats parentStats, float mutBonus = 0f)
        {
            SlimeStats child = parentStats;
            float chance = Mathf.Clamp01(BASE_STAT_MUTATION_CHANCE + mutBonus);
            float variance = STAT_VARIANCE_RATIO;

            child.HP  = MutateValue(parentStats.HP,  chance, variance);
            child.ATK = MutateValue(parentStats.ATK, chance, variance);
            child.DEF = MutateValue(parentStats.DEF, chance, variance);
            child.SPD = MutateValue(parentStats.SPD, chance, variance);
            child.MUT = MutateValue(parentStats.MUT, chance, variance);

            return child;
        }

        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// 决定子代继承哪些特性，并可能获得新特性。
        /// </summary>
        public static List<TraitData> MutateTraits(
            List<TraitData> parentTraits,
            List<TraitData> possibleNewTraits,
            float mutBonus = 0f)
        {
            var result = new List<TraitData>();
            float inheritChance = Mathf.Clamp01(TRAIT_INHERIT_CHANCE + mutBonus * 0.5f);
            float newChance     = Mathf.Clamp01(NEW_TRAIT_CHANCE     + mutBonus * 0.3f);

            // 继承亲代特性
            if (parentTraits != null)
            {
                foreach (var t in parentTraits)
                {
                    if (Random.value <= inheritChance)
                        result.Add(t);
                }
            }

            // 获取新特性
            if (possibleNewTraits != null && possibleNewTraits.Count > 0 && Random.value <= newChance)
            {
                var candidate = possibleNewTraits[Random.Range(0, possibleNewTraits.Count)];
                if (candidate != null && !result.Contains(candidate))
                    result.Add(candidate);
            }

            return result;
        }

        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// 决定子代继承哪些技能，并可能获得新技能。
        /// </summary>
        public static List<SkillData> MutateSkills(
            List<SkillData> parentSkills,
            List<SkillData> possibleNewSkills,
            float mutBonus = 0f)
        {
            var result = new List<SkillData>();
            float inheritChance = Mathf.Clamp01(SKILL_INHERIT_CHANCE + mutBonus * 0.4f);
            float newChance     = Mathf.Clamp01(NEW_SKILL_CHANCE     + mutBonus * 0.2f);

            // 继承亲代技能
            if (parentSkills != null)
            {
                foreach (var s in parentSkills)
                {
                    if (Random.value <= inheritChance)
                        result.Add(s);
                }
            }

            // 获取新技能
            if (possibleNewSkills != null && possibleNewSkills.Count > 0 && Random.value <= newChance)
            {
                var candidate = possibleNewSkills[Random.Range(0, possibleNewSkills.Count)];
                if (candidate != null && !result.Contains(candidate))
                    result.Add(candidate);
            }

            return result;
        }

        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// 决定子代稀有度（可能升级）。
        /// </summary>
        public static Rarity MutateRarity(Rarity parentRarity, float mutBonus = 0f)
        {
            float upgradeChance = Mathf.Clamp01(RARITY_UPGRADE_CHANCE + mutBonus * 0.1f);
            if (Random.value <= upgradeChance && (int)parentRarity < (int)Rarity.Legendary)
                return parentRarity + 1;
            return parentRarity;
        }

        // ─────────────────────────────────────────────────────────────────
        // 私有工具方法
        // ─────────────────────────────────────────────────────────────────

        private static int MutateValue(int baseVal, float mutChance, float varianceRatio)
        {
            if (Random.value > mutChance) return baseVal;                // 未变异
            float delta = baseVal * varianceRatio * (Random.value * 2f - 1f); // [-variance, +variance]
            return Mathf.Max(1, Mathf.RoundToInt(baseVal + delta));
        }
    }
}
