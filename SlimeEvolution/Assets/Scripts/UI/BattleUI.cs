using System.Collections.Generic;
using UnityEngine;
using SlimeEvolution.Combat;

namespace SlimeEvolution.UI
{
    /// <summary>
    /// 战斗界面 UI（OnGUI 实现）。
    /// 显示双方队伍 HP、战斗日志、胜负结算。
    /// </summary>
    public class BattleUI : MonoBehaviour
    {
        [SerializeField] private BattleManager battleManager;

        private List<string> battleLog = new List<string>();
        private Vector2 logScrollPos;
        private bool showBattleUI;
        private bool battleEnded;
        private bool playerWon;
        private int goldEarned;

        private const int MAX_LOG_LINES = 50;

        private void OnEnable()
        {
            if (battleManager != null)
            {
                battleManager.OnBattleLog += OnLog;
                battleManager.OnBattleEnd += OnEnd;
            }
        }

        private void OnDisable()
        {
            if (battleManager != null)
            {
                battleManager.OnBattleLog -= OnLog;
                battleManager.OnBattleEnd -= OnEnd;
            }
        }

        /// <summary>
        /// 绑定 BattleManager 并显示 UI
        /// </summary>
        public void Show(BattleManager manager)
        {
            battleManager = manager;
            battleLog.Clear();
            battleEnded = false;
            showBattleUI = true;

            battleManager.OnBattleLog += OnLog;
            battleManager.OnBattleEnd += OnEnd;
        }

        public void Hide()
        {
            showBattleUI = false;
            if (battleManager != null)
            {
                battleManager.OnBattleLog -= OnLog;
                battleManager.OnBattleEnd -= OnEnd;
            }
        }

        private void OnLog(string message)
        {
            battleLog.Add(message);
            if (battleLog.Count > MAX_LOG_LINES)
                battleLog.RemoveAt(0);
        }

        private void OnEnd(bool won, int gold)
        {
            battleEnded = true;
            playerWon = won;
            goldEarned = gold;
        }

        private void OnGUI()
        {
            if (!showBattleUI && (battleManager == null || !battleManager.IsBattleActive))
                return;

            float sw = Screen.width;
            float sh = Screen.height;

            // Background
            GUI.Box(new Rect(10, 10, sw - 20, sh - 20), "");

            // Title
            GUIStyle titleStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 20,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter
            };

            string title = battleEnded
                ? (playerWon ? "战斗胜利!" : "战斗失败")
                : $"回合 {(battleManager != null ? battleManager.CurrentTurn : 0)}";
            GUI.Label(new Rect(10, 15, sw - 20, 30), title, titleStyle);

            // Player team
            float y = 55;
            GUI.Label(new Rect(20, y, 200, 20), "=== 我方队伍 ===");
            y += 25;

            if (battleManager != null && battleManager.PlayerTeam != null)
            {
                foreach (var unit in battleManager.PlayerTeam)
                {
                    string status = unit.IsAlive ? "" : " [阵亡]";
                    string shieldText = unit.shield > 0 ? $" 盾:{unit.shield}" : "";
                    string text = $"{unit.unitName}: HP {unit.currentHP}/{unit.maxHP}{shieldText} ATK:{unit.ATK} DEF:{unit.DEF} SPD:{unit.SPD}{status}";
                    GUI.Label(new Rect(30, y, sw / 2 - 40, 20), text);
                    y += 22;
                }
            }

            // Enemy team
            y += 10;
            GUI.Label(new Rect(20, y, 200, 20), "=== 敌方队伍 ===");
            y += 25;

            if (battleManager != null && battleManager.EnemyTeam != null)
            {
                foreach (var unit in battleManager.EnemyTeam)
                {
                    string status = unit.IsAlive ? "" : " [阵亡]";
                    string shieldText = unit.shield > 0 ? $" 盾:{unit.shield}" : "";
                    string text = $"{unit.unitName}: HP {unit.currentHP}/{unit.maxHP}{shieldText} ATK:{unit.ATK} DEF:{unit.DEF} SPD:{unit.SPD}{status}";
                    GUI.Label(new Rect(30, y, sw / 2 - 40, 20), text);
                    y += 22;
                }
            }

            // Battle log
            float logTop = y + 15;
            float logHeight = sh - logTop - 60;
            GUI.Label(new Rect(20, logTop, 200, 20), "=== 战斗日志 ===");
            logTop += 22;

            logScrollPos = GUI.BeginScrollView(
                new Rect(20, logTop, sw - 40, logHeight),
                logScrollPos,
                new Rect(0, 0, sw - 60, battleLog.Count * 20)
            );

            for (int i = 0; i < battleLog.Count; i++)
            {
                GUI.Label(new Rect(5, i * 20, sw - 70, 20), battleLog[i]);
            }
            // Auto-scroll to bottom
            logScrollPos.y = Mathf.Max(0, battleLog.Count * 20 - logHeight);

            GUI.EndScrollView();

            // Result panel
            if (battleEnded)
            {
                float panelW = 300;
                float panelH = 120;
                float px = (sw - panelW) / 2;
                float py = (sh - panelH) / 2;

                GUI.Box(new Rect(px, py, panelW, panelH), "");

                GUIStyle resultStyle = new GUIStyle(GUI.skin.label)
                {
                    fontSize = 18,
                    fontStyle = FontStyle.Bold,
                    alignment = TextAnchor.MiddleCenter
                };

                string resultText = playerWon
                    ? $"胜利！获得 {goldEarned} 金币"
                    : "失败...";

                GUI.Label(new Rect(px, py + 15, panelW, 40), resultText, resultStyle);

                if (GUI.Button(new Rect(px + 75, py + 70, 150, 35), "确定"))
                {
                    showBattleUI = false;
                    battleEnded = false;
                }
            }
        }
    }
}
