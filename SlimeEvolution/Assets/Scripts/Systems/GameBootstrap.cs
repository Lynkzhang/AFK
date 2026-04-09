using UnityEngine;

namespace SlimeEvolution.Systems
{
    using Core;
    using Combat;
    using UI;

    /// <summary>
    /// 游戏启动引导器（MonoBehaviour）。
    /// 职责：
    ///   - 初始化场景中的核心系统
    ///   - 集成 BreedingGroundManager、VaultManager、BattleManager
    ///   - M3 阶段作为完整可运行入口点
    /// </summary>
    public class GameBootstrap : MonoBehaviour
    {
        // ── Inspector 引用 ────────────────────────────────────────────────
        [Header("系统引用")]
        [SerializeField] private BreedingGroundManager breedingGroundManager;
        [SerializeField] private VaultManager vaultManager;
        [SerializeField] private BattleManager battleManager;

        [Header("UI 引用")]
        [SerializeField] private BattleUI battleUI;
        [SerializeField] private VaultUI vaultUI;

        [Header("配置")]
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
            Debug.Log("[GameBootstrap] Start — All systems running.");
            LogSystemStatus();
        }

        #endregion

        // ─────────────────────────────────────────────────────────────────
        #region Initialization

        private void ResolveReferences()
        {
            if (breedingGroundManager == null)
            {
                breedingGroundManager = FindObjectOfType<BreedingGroundManager>();
                if (breedingGroundManager == null)
                {
                    Debug.LogError(
                        "[GameBootstrap] BreedingGroundManager not found in scene!");
                }
            }

            if (vaultManager == null)
            {
                vaultManager = FindObjectOfType<VaultManager>();
                if (vaultManager == null)
                {
                    Debug.LogWarning(
                        "[GameBootstrap] VaultManager not found in scene. Creating one...");
                    var go = new GameObject("VaultManager");
                    vaultManager = go.AddComponent<VaultManager>();
                }
            }

            if (battleManager == null)
            {
                battleManager = FindObjectOfType<BattleManager>();
                if (battleManager == null)
                {
                    Debug.LogWarning(
                        "[GameBootstrap] BattleManager not found in scene. Creating one...");
                    var go = new GameObject("BattleManager");
                    battleManager = go.AddComponent<BattleManager>();
                }
            }

            if (battleUI == null)
            {
                battleUI = FindObjectOfType<BattleUI>();
            }

            if (vaultUI == null)
            {
                vaultUI = FindObjectOfType<VaultUI>();
                if (vaultUI != null)
                {
                    vaultUI.SetManagers(vaultManager, breedingGroundManager);
                }
            }

            if (breedingGroundConfig == null)
            {
                Debug.LogWarning(
                    "[GameBootstrap] BreedingGroundConfig is not assigned.");
            }
        }

        private void LogSystemStatus()
        {
            Debug.Log($"[GameBootstrap] BreedingGroundManager: " +
                      $"{(breedingGroundManager != null ? "OK" : "MISSING")}");
            Debug.Log($"[GameBootstrap] VaultManager: " +
                      $"{(vaultManager != null ? "OK" : "MISSING")}");
            Debug.Log($"[GameBootstrap] BattleManager: " +
                      $"{(battleManager != null ? "OK" : "MISSING")}");
            Debug.Log($"[GameBootstrap] BreedingGroundConfig: " +
                      $"{(breedingGroundConfig != null ? "OK" : "MISSING")}");

            if (breedingGroundManager != null)
            {
                Debug.Log($"[GameBootstrap] Ground capacity: {breedingGroundManager.MaxCapacity}, " +
                          $"Current count: {breedingGroundManager.CurrentCount}");
            }

            if (vaultManager != null)
            {
                Debug.Log($"[GameBootstrap] Vault capacity: {vaultManager.Capacity}, " +
                          $"Stored: {vaultManager.CurrentCount}");
            }
        }

        #endregion

        // ─────────────────────────────────────────────────────────────────
        #region Public Accessors

        public BreedingGroundManager BreedingGround => breedingGroundManager;
        public VaultManager Vault => vaultManager;
        public BattleManager Battle => battleManager;

        #endregion
    }
}
