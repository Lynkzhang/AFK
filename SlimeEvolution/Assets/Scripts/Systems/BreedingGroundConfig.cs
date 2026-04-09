using UnityEngine;

namespace SlimeEvolution.Systems
{
    using Core;

    /// <summary>
    /// 培养场地配置 ScriptableObject。
    /// 在 Inspector 中配置场地容量、分裂速度、变异加成等全局参数。
    /// </summary>
    [CreateAssetMenu(fileName = "BreedingGroundConfig", menuName = "SlimeEvolution/BreedingGroundConfig")]
    public class BreedingGroundConfig : ScriptableObject
    {
        [Header("场地容量")]
        [Tooltip("培养场地最多可容纳的史莱姆数量")]
        public int maxCapacity = 20;

        [Header("分裂参数")]
        [Tooltip("史莱姆两次分裂之间的基础冷却时间（秒）")]
        public float splitInterval = 10f;

        [Tooltip("加速倍率（来自设施升级；1.0 = 无加速）")]
        [Range(1f, 10f)]
        public float splitSpeedMultiplier = 1f;

        [Header("初始史莱姆")]
        [Tooltip("游戏开始时放置在场地中的初始史莱姆配置")]
        public SlimeData[] initialSlimes;

        [Header("经济")]
        [Tooltip("玩家当前拥有的金币（运行时字段，可与存档系统同步）")]
        public int playerGold = 0;

        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// 经过加速倍率修正后的实际分裂间隔（秒）。
        /// </summary>
        public float EffectiveSplitInterval =>
            splitInterval / Mathf.Max(0.01f, splitSpeedMultiplier);
    }
}
