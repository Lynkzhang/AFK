using System;
using System.Collections.Generic;
using UnityEngine;
using SlimeEvolution.Core;

namespace SlimeEvolution.Systems
{
    /// <summary>
    /// 封存系统管理器。管理史莱姆的封存（从培养场移入仓库）和取出操作。
    /// 默认容量 20 格。
    /// </summary>
    public class VaultManager : MonoBehaviour
    {
        public const int DEFAULT_CAPACITY = 20;

        [SerializeField] private int capacity = DEFAULT_CAPACITY;

        private List<SlimeInstance> vaultSlimes = new List<SlimeInstance>();

        // ── Events ──────────────────────────────────────────────────────
        public event Action OnVaultChanged;

        // ── Public accessors ────────────────────────────────────────────
        public int Capacity => capacity;
        public int CurrentCount => vaultSlimes.Count;
        public IReadOnlyList<SlimeInstance> VaultSlimes => vaultSlimes.AsReadOnly();
        public bool IsFull => vaultSlimes.Count >= capacity;

        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// 将史莱姆存入封存库。
        /// </summary>
        /// <returns>成功返回 true，满仓或已存在返回 false</returns>
        public bool StoreSlime(SlimeInstance slime)
        {
            if (slime == null)
            {
                Debug.LogWarning("[VaultManager] Cannot store null slime.");
                return false;
            }

            if (vaultSlimes.Count >= capacity)
            {
                Debug.LogWarning("[VaultManager] Vault is full!");
                return false;
            }

            // Check for duplicates
            foreach (var s in vaultSlimes)
            {
                if (s.instanceId == slime.instanceId)
                {
                    Debug.LogWarning($"[VaultManager] Slime {slime.slimeName} is already in vault.");
                    return false;
                }
            }

            slime.isArchived = true;
            vaultSlimes.Add(slime);
            Debug.Log($"[VaultManager] Stored {slime.slimeName} ({CurrentCount}/{capacity})");
            OnVaultChanged?.Invoke();
            return true;
        }

        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// 从封存库取出史莱姆。
        /// </summary>
        /// <returns>取出的史莱姆实例，不存在返回 null</returns>
        public SlimeInstance RetrieveSlime(string instanceId)
        {
            for (int i = 0; i < vaultSlimes.Count; i++)
            {
                if (vaultSlimes[i].instanceId == instanceId)
                {
                    SlimeInstance slime = vaultSlimes[i];
                    slime.isArchived = false;
                    vaultSlimes.RemoveAt(i);
                    Debug.Log($"[VaultManager] Retrieved {slime.slimeName} ({CurrentCount}/{capacity})");
                    OnVaultChanged?.Invoke();
                    return slime;
                }
            }

            Debug.LogWarning($"[VaultManager] Slime with ID {instanceId} not found in vault.");
            return null;
        }

        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// 从封存库按索引取出史莱姆。
        /// </summary>
        public SlimeInstance RetrieveSlimeAt(int index)
        {
            if (index < 0 || index >= vaultSlimes.Count)
            {
                Debug.LogWarning($"[VaultManager] Invalid vault index: {index}");
                return null;
            }

            SlimeInstance slime = vaultSlimes[index];
            slime.isArchived = false;
            vaultSlimes.RemoveAt(index);
            Debug.Log($"[VaultManager] Retrieved {slime.slimeName} ({CurrentCount}/{capacity})");
            OnVaultChanged?.Invoke();
            return slime;
        }

        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// 获取封存库中指定索引的史莱姆（不取出）。
        /// </summary>
        public SlimeInstance GetSlimeAt(int index)
        {
            if (index < 0 || index >= vaultSlimes.Count) return null;
            return vaultSlimes[index];
        }
    }
}
