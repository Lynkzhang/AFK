using System;
using System.Collections.Generic;
using UnityEngine;

namespace SlimeEvolution.Systems
{
    using Core;

    /// <summary>
    /// 培养场地管理器（MonoBehaviour）。
    /// 负责：
    ///   1. 初始化场地（放置初始史莱姆）
    ///   2. 每帧推进分裂计时器
    ///   3. 触发分裂 → 调用 SlimeFactory.Breed()
    ///   4. 提供剔除 / 出售接口
    ///   5. 向 UI 层广播状态变更事件
    /// </summary>
    public class BreedingGroundManager : MonoBehaviour
    {
        // ── 配置引用 ─────────────────────────────────────────────────────
        [SerializeField] private BreedingGroundConfig config;

        // ── 运行时状态 ────────────────────────────────────────────────────
        private readonly List<SlimeInstance> slimes = new List<SlimeInstance>();

        // ── 事件 ──────────────────────────────────────────────────────────
        /// <summary>场地内史莱姆列表发生变化时触发（添加 / 移除）。</summary>
        public event Action OnSlimesChanged;

        /// <summary>当史莱姆成功出售时触发，参数为获得的金币数量。</summary>
        public event Action<int> OnSlimeSold;

        // ── 只读属性 ──────────────────────────────────────────────────────
        public IReadOnlyList<SlimeInstance> Slimes => slimes;
        public int CurrentCount  => slimes.Count;
        public int MaxCapacity   => config != null ? config.maxCapacity : 0;
        public bool IsFull       => CurrentCount >= MaxCapacity;

        /// <summary>返回当前配置引用（供 UI 读取金币等数据）。</summary>
        public BreedingGroundConfig GetConfig() => config;

        // ─────────────────────────────────────────────────────────────────
        #region Unity Lifecycle

        private void Awake()
        {
            if (config == null)
                Debug.LogError("[BreedingGroundManager] Config is not assigned!");
        }

        private void Start()
        {
            InitializeGround();
        }

        private void Update()
        {
            TickSplitTimers(Time.deltaTime);
        }

        #endregion

        // ─────────────────────────────────────────────────────────────────
        #region Initialization

        /// <summary>
        /// 从 Config 中的 initialSlimes 填充初始史莱姆。
        /// </summary>
        public void InitializeGround()
        {
            slimes.Clear();
            if (config == null || config.initialSlimes == null) return;

            foreach (var data in config.initialSlimes)
            {
                if (data == null) continue;
                if (IsFull)
                {
                    Debug.LogWarning("[BreedingGroundManager] Initial slimes exceed capacity, skipping.");
                    break;
                }
                var inst = SlimeFactory.CreateInitial(data, config.EffectiveSplitInterval);
                if (inst != null)
                    slimes.Add(inst);
            }

            OnSlimesChanged?.Invoke();
            Debug.Log($"[BreedingGroundManager] Initialized with {slimes.Count} slime(s).");
        }

        #endregion

        // ─────────────────────────────────────────────────────────────────
        #region Split Logic

        /// <summary>
        /// 每帧推进所有史莱姆的分裂计时器，到期则触发分裂。
        /// </summary>
        private void TickSplitTimers(float deltaTime)
        {
            if (config == null) return;

            // 使用索引遍历，因为循环中可能向列表添加元素
            int count = slimes.Count;
            for (int i = 0; i < count; i++)
            {
                var slime = slimes[i];
                if (!slime.isSplitting) continue;

                slime.splitTimer -= deltaTime;
                if (slime.splitTimer <= 0f)
                {
                    slime.isSplitting = false;   // 冷却完成，重置标记（可再次触发）
                    TrySplit(slime);
                }
            }
        }

        /// <summary>
        /// 尝试让指定史莱姆分裂产生后代。
        /// 场地满时跳过，分裂成功后重置亲代计时器。
        /// </summary>
        private void TrySplit(SlimeInstance parent)
        {
            if (IsFull)
            {
                // 场地已满，稍后重试：重置计时器继续等待
                parent.splitTimer  = config.EffectiveSplitInterval;
                parent.isSplitting = true;
                return;
            }

            var child = SlimeFactory.Breed(parent, config);
            if (child != null)
            {
                slimes.Add(child);
                OnSlimesChanged?.Invoke();
            }

            // 重置亲代计时器
            parent.splitTimer  = config.EffectiveSplitInterval;
            parent.isSplitting = true;
        }

        #endregion

        // ─────────────────────────────────────────────────────────────────
        #region Player Actions

        /// <summary>
        /// 手动剔除指定史莱姆（从场地移除，不获得金币）。
        /// </summary>
        public bool CullSlime(SlimeInstance slime)
        {
            if (slime == null || !slimes.Contains(slime)) return false;

            slimes.Remove(slime);
            OnSlimesChanged?.Invoke();
            Debug.Log($"[BreedingGroundManager] Culled {slime.slimeName}.");
            return true;
        }

        /// <summary>
        /// 出售指定史莱姆，玩家获得对应金币。
        /// </summary>
        public bool SellSlime(SlimeInstance slime)
        {
            if (slime == null || !slimes.Contains(slime)) return false;

            int price = slime.CalculateSellPrice();
            config.playerGold += price;

            slimes.Remove(slime);
            OnSlimesChanged?.Invoke();
            OnSlimeSold?.Invoke(price);

            Debug.Log($"[BreedingGroundManager] Sold {slime.slimeName} for {price} gold. Total: {config.playerGold}");
            return true;
        }

        /// <summary>
        /// 将史莱姆标记为封存（移出场地，供战斗使用）。
        /// </summary>
        public bool ArchiveSlime(SlimeInstance slime)
        {
            if (slime == null || !slimes.Contains(slime)) return false;

            slime.isArchived = true;
            slimes.Remove(slime);
            OnSlimesChanged?.Invoke();
            Debug.Log($"[BreedingGroundManager] Archived {slime.slimeName}.");
            return true;
        }

        #endregion
    }
}
