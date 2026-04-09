using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace SlimeEvolution.UI
{
    using Core;
    using Systems;

    /// <summary>
    /// 培养场地 UI 控制器。
    /// 订阅 BreedingGroundManager 的事件，刷新史莱姆列表并处理玩家操作。
    ///
    /// 层级要求（Inspector 绑定）：
    ///   - slimeListContainer : VerticalLayoutGroup / GridLayoutGroup
    ///   - slimeRowPrefab     : 含 SlimeRowUI 组件的 Prefab
    ///   - goldText           : TMP_Text，显示金币数量
    ///   - capacityText       : TMP_Text，显示 "当前/上限"
    ///   - selectedInfoPanel  : 选中详情面板 GameObject
    ///   - sellButton / cullButton / archiveButton : Button
    /// </summary>
    public class BreedingGroundUI : MonoBehaviour
    {
        // ── Inspector 绑定 ─────────────────────────────────────────────────
        [Header("依赖")]
        [SerializeField] private BreedingGroundManager manager;

        [Header("列表")]
        [SerializeField] private Transform    slimeListContainer;
        [SerializeField] private GameObject   slimeRowPrefab;

        [Header("信息显示")]
        [SerializeField] private TMP_Text     goldText;
        [SerializeField] private TMP_Text     capacityText;

        [Header("选中详情面板")]
        [SerializeField] private GameObject   selectedInfoPanel;
        [SerializeField] private TMP_Text     selectedNameText;
        [SerializeField] private TMP_Text     selectedStatsText;
        [SerializeField] private TMP_Text     selectedRarityText;
        [SerializeField] private TMP_Text     selectedSellPriceText;

        [Header("操作按钮")]
        [SerializeField] private Button       sellButton;
        [SerializeField] private Button       cullButton;
        [SerializeField] private Button       archiveButton;

        // ── 运行时状态 ────────────────────────────────────────────────────
        private SlimeInstance selectedSlime;
        private readonly List<GameObject> rowObjects = new List<GameObject>();

        // ─────────────────────────────────────────────────────────────────
        #region Unity Lifecycle

        private void Start()
        {
            if (manager == null)
            {
                Debug.LogError("[BreedingGroundUI] BreedingGroundManager not assigned!");
                return;
            }

            // 订阅事件
            manager.OnSlimesChanged += RefreshList;
            manager.OnSlimeSold     += OnSlimeSoldHandler;

            // 绑定按钮
            if (sellButton)    sellButton.onClick.AddListener(OnSellClicked);
            if (cullButton)    cullButton.onClick.AddListener(OnCullClicked);
            if (archiveButton) archiveButton.onClick.AddListener(OnArchiveClicked);

            // 初始刷新
            RefreshList();
            SetSelectedInfoVisible(false);
        }

        private void OnDestroy()
        {
            if (manager != null)
            {
                manager.OnSlimesChanged -= RefreshList;
                manager.OnSlimeSold     -= OnSlimeSoldHandler;
            }
        }

        #endregion

        // ─────────────────────────────────────────────────────────────────
        #region List Refresh

        /// <summary>
        /// 清空并重建史莱姆列表行。
        /// </summary>
        private void RefreshList()
        {
            // 清旧行
            foreach (var obj in rowObjects)
            {
                if (obj != null) Destroy(obj);
            }
            rowObjects.Clear();

            if (manager == null || slimeListContainer == null || slimeRowPrefab == null) return;

            // 更新容量 / 金币文字
            UpdateInfoTexts();

            // 创建新行
            foreach (var slime in manager.Slimes)
            {
                var rowGO = Instantiate(slimeRowPrefab, slimeListContainer);
                rowObjects.Add(rowGO);

                // 尝试通过 SlimeRowUI 组件填充数据
                var rowUI = rowGO.GetComponent<SlimeRowUI>();
                if (rowUI != null)
                {
                    rowUI.Bind(slime, OnRowSelected);
                }
                else
                {
                    // Fallback：直接找第一个 TMP_Text 设置名称
                    var label = rowGO.GetComponentInChildren<TMP_Text>();
                    if (label != null)
                        label.text = $"{slime.slimeName}  [{slime.rarity}]  Gen{slime.generation}";

                    // 点击事件
                    var btn = rowGO.GetComponent<Button>();
                    if (btn != null)
                    {
                        var captured = slime;
                        btn.onClick.AddListener(() => OnRowSelected(captured));
                    }
                }
            }

            // 如果选中的史莱姆已不在列表中，取消选中
            if (selectedSlime != null && !IsInCurrentList(selectedSlime))
            {
                selectedSlime = null;
                SetSelectedInfoVisible(false);
            }
        }

        private void UpdateInfoTexts()
        {
            if (capacityText != null)
                capacityText.text = $"{manager.CurrentCount} / {manager.MaxCapacity}";

            if (goldText != null && manager.GetConfig() != null)
                goldText.text = $"金币: {manager.GetConfig().playerGold}";
        }

        private bool IsInCurrentList(SlimeInstance slime)
        {
            foreach (var s in manager.Slimes)
                if (s == slime) return true;
            return false;
        }

        #endregion

        // ─────────────────────────────────────────────────────────────────
        #region Selection

        private void OnRowSelected(SlimeInstance slime)
        {
            selectedSlime = slime;
            RefreshSelectedPanel();
        }

        private void RefreshSelectedPanel()
        {
            if (selectedSlime == null)
            {
                SetSelectedInfoVisible(false);
                return;
            }

            SetSelectedInfoVisible(true);

            if (selectedNameText)
                selectedNameText.text = $"{selectedSlime.slimeName}  (Gen {selectedSlime.generation})";

            if (selectedStatsText)
                selectedStatsText.text =
                    $"HP:{selectedSlime.stats.HP}  ATK:{selectedSlime.stats.ATK}  " +
                    $"DEF:{selectedSlime.stats.DEF}  SPD:{selectedSlime.stats.SPD}  MUT:{selectedSlime.stats.MUT}";

            if (selectedRarityText)
                selectedRarityText.text = selectedSlime.rarity.ToString();

            if (selectedSellPriceText)
                selectedSellPriceText.text = $"出售价格: {selectedSlime.CalculateSellPrice()} 金币";
        }

        private void SetSelectedInfoVisible(bool visible)
        {
            if (selectedInfoPanel != null)
                selectedInfoPanel.SetActive(visible);

            if (sellButton)    sellButton.interactable    = visible;
            if (cullButton)    cullButton.interactable    = visible;
            if (archiveButton) archiveButton.interactable = visible;
        }

        #endregion

        // ─────────────────────────────────────────────────────────────────
        #region Button Handlers

        private void OnSellClicked()
        {
            if (selectedSlime == null) return;
            manager.SellSlime(selectedSlime);
            selectedSlime = null;
            SetSelectedInfoVisible(false);
        }

        private void OnCullClicked()
        {
            if (selectedSlime == null) return;
            manager.CullSlime(selectedSlime);
            selectedSlime = null;
            SetSelectedInfoVisible(false);
        }

        private void OnArchiveClicked()
        {
            if (selectedSlime == null) return;
            manager.ArchiveSlime(selectedSlime);
            selectedSlime = null;
            SetSelectedInfoVisible(false);
        }

        private void OnSlimeSoldHandler(int goldEarned)
        {
            // 刷新金币显示（列表刷新由 OnSlimesChanged 触发）
            UpdateInfoTexts();
            Debug.Log($"[BreedingGroundUI] Sold slime, earned {goldEarned} gold.");
        }

        #endregion
    }

    // ─────────────────────────────────────────────────────────────────────────
    /// <summary>
    /// 列表行辅助组件，绑定单个史莱姆数据并处理点击回调。
    /// </summary>
    public class SlimeRowUI : MonoBehaviour
    {
        [SerializeField] private TMP_Text nameText;
        [SerializeField] private TMP_Text rarityText;
        [SerializeField] private TMP_Text generationText;
        [SerializeField] private Button   selectButton;

        private System.Action<SlimeInstance> onSelected;
        private SlimeInstance boundSlime;

        public void Bind(SlimeInstance slime, System.Action<SlimeInstance> callback)
        {
            boundSlime = slime;
            onSelected = callback;

            if (nameText)       nameText.text       = slime.slimeName;
            if (rarityText)     rarityText.text      = slime.rarity.ToString();
            if (generationText) generationText.text  = $"Gen {slime.generation}";

            if (selectButton == null) selectButton = GetComponent<Button>();
            if (selectButton != null)
                selectButton.onClick.AddListener(() => onSelected?.Invoke(boundSlime));
        }
    }
}
