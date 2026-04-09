using UnityEngine;

namespace SlimeEvolution.Systems
{
    using Core;

    /// <summary>
    /// 游戏启动引导器（MonoBehaviour）。
    /// 职责：
    ///   - 初始化场景中的核心系统（BreedingGroundManager）
    ///   - 在编辑器没有配置时提供 fallback 提示
    ///   - M2 阶段作为最小可运行入口点
    ///
    /// 使用方式：将此脚本挂载到场景中的 "GameBootstrap" GameObject。
    /// </summary>
    public class GameBootstrap : MonoBehaviour
    {
        // ── Inspector 引用 ────────────────────────────────────────────────
        [Header("系统引用")]
        [Tooltip("BreedingGroundManager 组件引用（可留空，脚本会自动在场景中查找）")]
        [SerializeField] private BreedingGroundManager breedingGroundManager;

        [Header("配置")]
        [Tooltip("培养场地配置 ScriptableObject（必须指定）")]
        [SerializeField] private BreedingGroundConfig breedingGroundConfig;

        // ─────────────────────────────────────────────────────────────────
        #region Unity Lifecycle

        private void Awake()
        {
            Debug.Log("[GameBootstrap] Awake — initializing systems...");
            ResolveReferences();
        }

        private void Start()
        {
            Debug.Log("[GameBootstrap] Start — M2 BreedingSystem is running.");
            LogSystemStatus();
        }

        #endregion

        // ─────────────────────────────────────────────────────────────────
        #region Initialization

        /// <summary>
        /// 自动解析场景中的引用，若 Inspector 未指定则自动查找。
        /// </summary>
        private void ResolveReferences()
        {
            if (breedingGroundManager == null)
            {
                breedingGroundManager = FindObjectOfType<BreedingGroundManager>();
                if (breedingGroundManager == null)
                {
                    Debug.LogError(
                        "[GameBootstrap] BreedingGroundManager not found in scene! " +
                        "Please add a GameObject with BreedingGroundManager component.");
                }
            }

            if (breedingGroundConfig == null)
            {
                Debug.LogWarning(
                    "[GameBootstrap] BreedingGroundConfig is not assigned. " +
                    "Please assign it in the Inspector or load it from Resources.");
            }
        }

        private void LogSystemStatus()
        {
            Debug.Log($"[GameBootstrap] BreedingGroundManager: " +
                      $"{(breedingGroundManager != null ? "OK" : "MISSING")}");
            Debug.Log($"[GameBootstrap] BreedingGroundConfig:  " +
                      $"{(breedingGroundConfig != null ? "OK" : "MISSING")}");

            if (breedingGroundManager != null)
            {
                Debug.Log($"[GameBootstrap] Ground capacity: {breedingGroundManager.MaxCapacity}, " +
                          $"Current count: {breedingGroundManager.CurrentCount}");
            }
        }

        #endregion
    }
}
