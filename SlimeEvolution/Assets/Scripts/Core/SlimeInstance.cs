using System;
using System.Collections.Generic;
using UnityEngine;

namespace SlimeEvolution.Core
{
    /// <summary>
    /// 运行时史莱姆实例，记录单只活体史莱姆的全部状态。
    /// 区别于 SlimeData（静态配置 SO），SlimeInstance 是动态存在、可变化的。
    /// </summary>
    [Serializable]
    public class SlimeInstance
    {
        // ── 身份 ──────────────────────────────────────────────────────────
        public string instanceId;           // 唯一 ID（GUID）
        public string slimeName;            // 显示名称
        public SlimeData baseData;          // 引用对应的静态配置 SO

        // ── 属性 ──────────────────────────────────────────────────────────
        public SlimeStats stats;            // 当前属性（继承亲代 + 变异叠加）

        // ── 稀有度 ────────────────────────────────────────────────────────
        public Rarity rarity;

        // ── 特性与技能 ────────────────────────────────────────────────────
        public List<TraitData> traits = new List<TraitData>();
        public List<SkillData> skills = new List<SkillData>();

        // ── 血统 ──────────────────────────────────────────────────────────
        public string parentInstanceId;     // 亲代 ID（初始史莱姆为空）
        public int generation;              // 代数（0 = 初始）

        // ── 分裂计时 ──────────────────────────────────────────────────────
        public float splitTimer;            // 距下次分裂剩余时间（秒）
        public bool isSplitting;            // 是否正在分裂冷却中

        // ── 状态 ──────────────────────────────────────────────────────────
        public bool isArchived;             // 是否已封存（移出培养场地）

        // ── 出售价格（缓存） ──────────────────────────────────────────────
        public int cachedSellPrice;

        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// 工厂入口：从 SlimeData 创建初始史莱姆实例。
        /// </summary>
        public static SlimeInstance CreateFromData(SlimeData data, float splitInterval)
        {
            var inst = new SlimeInstance
            {
                instanceId     = Guid.NewGuid().ToString(),
                slimeName      = data.slimeName,
                baseData       = data,
                stats          = data.baseStats,
                rarity         = data.rarity,
                generation     = 0,
                parentInstanceId = string.Empty,
                splitTimer     = splitInterval,
                isSplitting    = true,
                isArchived     = false
            };
            inst.cachedSellPrice = inst.CalculateSellPrice();
            return inst;
        }

        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// 基于加权属性、稀有度指数倍率、特性/技能/代数加成估算出售价格。
        /// 公式详见 knowledge/analysis/sell-price-formula.md §2.1
        /// </summary>
        public int CalculateSellPrice()
        {
            // BaseValue: HP 权重 0.1 避免 HP 数值量级主导价格
            float baseValue = stats.HP * 0.1f + stats.ATK * 1.0f + stats.DEF * 1.0f
                            + stats.SPD * 1.0f + stats.MUT * 0.5f;

            // RarityMultiplier: 指数增长 2^rarity (Common=1, Uncommon=2, Rare=4, Epic=8, Legendary=16)
            float rarityMul = Mathf.Pow(2f, (int)rarity);

            // TraitBonus: 特性数量 × 0.1 × 平均特性稀有度权重
            float traitBonus = 0f;
            if (traits != null && traits.Count > 0)
            {
                float totalWeight = 0f;
                foreach (var trait in traits)
                {
                    totalWeight += GetTraitRarityWeight(trait.rarity);
                }
                float avgWeight = totalWeight / traits.Count;
                traitBonus = traits.Count * 0.1f * avgWeight;
            }

            // SkillBonus: 技能数量 × 0.05
            float skillBonus = (skills != null ? skills.Count : 0) * 0.05f;

            // GenerationBonus: min(0.5, generation × 0.02)
            float genBonus = Mathf.Min(0.5f, generation * 0.02f);

            float total = baseValue * rarityMul * (1f + traitBonus + skillBonus + genBonus);
            return Mathf.Max(1, Mathf.FloorToInt(total));
        }

        /// <summary>
        /// 特性稀有度权重映射
        /// </summary>
        private static float GetTraitRarityWeight(Rarity r)
        {
            switch (r)
            {
                case Rarity.Common:    return 1.0f;
                case Rarity.Uncommon:  return 1.5f;
                case Rarity.Rare:      return 2.5f;
                case Rarity.Epic:      return 4.0f;
                case Rarity.Legendary: return 6.0f;
                default:               return 1.0f;
            }
        }

        public override string ToString()
        {
            return $"[Slime] {slimeName} (Gen{generation}, {rarity}) HP:{stats.HP} ATK:{stats.ATK}";
        }
    }
}
