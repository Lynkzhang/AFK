using UnityEngine;
using SlimeEvolution.Systems;
using SlimeEvolution.Core;

namespace SlimeEvolution.UI
{
    /// <summary>
    /// 封存库界面 UI（OnGUI 实现）。
    /// 显示封存列表、存取按钮、容量信息。
    /// </summary>
    public class VaultUI : MonoBehaviour
    {
        [SerializeField] private VaultManager vaultManager;
        [SerializeField] private BreedingGroundManager breedingGroundManager;

        private Vector2 vaultScrollPos;
        private Vector2 groundScrollPos;
        private bool showVaultUI;

        public void Show()
        {
            showVaultUI = true;
        }

        public void Hide()
        {
            showVaultUI = false;
        }

        public void Toggle()
        {
            showVaultUI = !showVaultUI;
        }

        public void SetManagers(VaultManager vault, BreedingGroundManager breeding)
        {
            vaultManager = vault;
            breedingGroundManager = breeding;
        }

        private void OnGUI()
        {
            if (!showVaultUI || vaultManager == null)
                return;

            float sw = Screen.width;
            float sh = Screen.height;
            float panelW = sw * 0.8f;
            float panelH = sh * 0.8f;
            float px = (sw - panelW) / 2;
            float py = (sh - panelH) / 2;

            // Background
            GUI.Box(new Rect(px, py, panelW, panelH), "");

            // Title
            GUIStyle titleStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 18,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter
            };
            GUI.Label(new Rect(px, py + 5, panelW, 30),
                $"封存库 ({vaultManager.CurrentCount}/{vaultManager.Capacity})", titleStyle);

            // Close button
            if (GUI.Button(new Rect(px + panelW - 55, py + 5, 50, 25), "关闭"))
            {
                showVaultUI = false;
            }

            float halfW = (panelW - 30) / 2;
            float listTop = py + 40;
            float listHeight = panelH - 50;

            // ── Left: Vault contents ────────────────────────────────────
            GUI.Box(new Rect(px + 5, listTop, halfW, listHeight), "封存中的史莱姆");

            float contentHeight = Mathf.Max(listHeight - 25, vaultManager.CurrentCount * 65);
            vaultScrollPos = GUI.BeginScrollView(
                new Rect(px + 5, listTop + 22, halfW, listHeight - 25),
                vaultScrollPos,
                new Rect(0, 0, halfW - 20, contentHeight)
            );

            for (int i = 0; i < vaultManager.CurrentCount; i++)
            {
                SlimeInstance slime = vaultManager.GetSlimeAt(i);
                if (slime == null) continue;

                float iy = i * 65;
                GUI.Box(new Rect(5, iy, halfW - 25, 60), "");

                string info = $"{slime.slimeName} ({slime.rarity})\n" +
                              $"HP:{slime.stats.HP} ATK:{slime.stats.ATK} DEF:{slime.stats.DEF} SPD:{slime.stats.SPD}\n" +
                              $"Gen:{slime.generation} 售价:{slime.CalculateSellPrice()}金";
                GUI.Label(new Rect(10, iy + 3, halfW - 120, 55), info);

                if (GUI.Button(new Rect(halfW - 110, iy + 18, 80, 25), "取出"))
                {
                    SlimeInstance retrieved = vaultManager.RetrieveSlimeAt(i);
                    if (retrieved != null && breedingGroundManager != null)
                    {
                        breedingGroundManager.AddSlime(retrieved);
                    }
                    break; // list changed, break loop
                }
            }

            GUI.EndScrollView();

            // ── Right: Breeding ground slimes (for storing) ─────────────
            float rightX = px + 10 + halfW;
            GUI.Box(new Rect(rightX, listTop, halfW, listHeight), "培养场史莱姆 (可封存)");

            int groundCount = breedingGroundManager != null ? breedingGroundManager.CurrentCount : 0;
            float groundContentH = Mathf.Max(listHeight - 25, groundCount * 65);
            groundScrollPos = GUI.BeginScrollView(
                new Rect(rightX, listTop + 22, halfW, listHeight - 25),
                groundScrollPos,
                new Rect(0, 0, halfW - 20, groundContentH)
            );

            if (breedingGroundManager != null)
            {
                // We need to iterate slimes from BreedingGroundManager
                // Use GetSlimes() if available, otherwise show count
                var slimes = breedingGroundManager.GetAllSlimes();
                if (slimes != null)
                {
                    for (int i = 0; i < slimes.Count; i++)
                    {
                        SlimeInstance slime = slimes[i];
                        if (slime == null || slime.isArchived) continue;

                        float iy = i * 65;
                        GUI.Box(new Rect(5, iy, halfW - 25, 60), "");

                        string info = $"{slime.slimeName} ({slime.rarity})\n" +
                                      $"HP:{slime.stats.HP} ATK:{slime.stats.ATK} DEF:{slime.stats.DEF} SPD:{slime.stats.SPD}\n" +
                                      $"Gen:{slime.generation} 售价:{slime.CalculateSellPrice()}金";
                        GUI.Label(new Rect(10, iy + 3, halfW - 120, 55), info);

                        if (!vaultManager.IsFull)
                        {
                            if (GUI.Button(new Rect(halfW - 110, iy + 18, 80, 25), "封存"))
                            {
                                breedingGroundManager.RemoveSlime(slime);
                                vaultManager.StoreSlime(slime);
                                break; // list changed, break loop
                            }
                        }
                    }
                }
            }

            GUI.EndScrollView();
        }
    }
}
