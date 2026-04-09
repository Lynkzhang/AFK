using UnityEngine;

namespace SlimeEvolution.Systems
{
    using Core;

    /// <summary>
    /// 史莱姆工厂：负责创建初始史莱姆与分裂后代。
    /// 不持有场地状态，仅负责对象构造逻辑。
    /// </summary>
    public static class SlimeFactory
    {
        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// 从配置数据创建初始（第 0 代）史莱姆。
        /// </summary>
        /// <param name="data">SlimeData SO</param>
        /// <param name="splitInterval">初始分裂冷却时间（秒）</param>
        public static SlimeInstance CreateInitial(SlimeData data, float splitInterval)
        {
            if (data == null)
            {
                Debug.LogError("[SlimeFactory] CreateInitial: data is null.");
                return null;
            }

            var inst = SlimeInstance.CreateFromData(data, splitInterval);
            Debug.Log($"[SlimeFactory] Created initial slime: {inst}");
            return inst;
        }

        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// 基于亲代实例分裂产生子代，应用变异系统后返回新实例。
        /// </summary>
        /// <param name="parent">亲代 SlimeInstance</param>
        /// <param name="config">场地配置，含分裂间隔、变异加成等</param>
        public static SlimeInstance Breed(SlimeInstance parent, BreedingGroundConfig config)
        {
            if (parent == null || config == null)
            {
                Debug.LogError("[SlimeFactory] Breed: parent or config is null.");
                return null;
            }

            // 计算亲代 MUT 提供的变异加成（归一化到 0~0.5）
            float mutBonus = Mathf.Clamp01(parent.stats.MUT / 200f);

            // ── 变异各项 ──────────────────────────────────────────────────
            var childStats  = MutationSystem.MutateStats(parent.stats, mutBonus);
            var childTraits = MutationSystem.MutateTraits(
                parent.traits,
                parent.baseData != null ? parent.baseData.possibleTraits : null,
                mutBonus);
            var childSkills = MutationSystem.MutateSkills(
                parent.skills,
                parent.baseData != null ? parent.baseData.possibleSkills : null,
                mutBonus);
            var childRarity = MutationSystem.MutateRarity(parent.rarity, mutBonus);

            // ── 构造子代 ──────────────────────────────────────────────────
            var child = new SlimeInstance
            {
                instanceId       = System.Guid.NewGuid().ToString(),
                slimeName        = parent.slimeName,
                baseData         = parent.baseData,
                stats            = childStats,
                rarity           = childRarity,
                traits           = childTraits,
                skills           = childSkills,
                parentInstanceId = parent.instanceId,
                generation       = parent.generation + 1,
                splitTimer       = config.splitInterval,
                isSplitting      = true,
                isArchived       = false
            };
            child.cachedSellPrice = child.CalculateSellPrice();

            Debug.Log($"[SlimeFactory] Bred child: {child} from parent Gen{parent.generation}");
            return child;
        }
    }
}
