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
        /// 基于稀有度与属性总和估算出售价格。
        /// </summary>
        public int CalculateSellPrice()
        {
            int rarityMul = (int)rarity + 1;                     // Common=1 … Legendary=5
            int statSum   = stats.HP + stats.ATK + stats.DEF + stats.SPD + stats.MUT;
            return Mathf.Max(1, statSum * rarityMul);
        }

        public override string ToString()
        {
            return $"[Slime] {slimeName} (Gen{generation}, {rarity}) HP:{stats.HP} ATK:{stats.ATK}";
        }
    }
}
