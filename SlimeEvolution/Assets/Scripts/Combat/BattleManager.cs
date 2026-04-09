using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using SlimeEvolution.Core;

namespace SlimeEvolution.Combat
{
    /// <summary>
    /// 管理 PVE 回合制战斗的完整流程。
    /// 支持 3v3 队伍对战，自动 AI 选技能，30 回合上限。
    /// </summary>
    public class BattleManager : MonoBehaviour
    {
        public const int MAX_TURNS = 30;
        public const int TEAM_SIZE = 3;

        private List<BattleUnit> playerTeam = new List<BattleUnit>();
        private List<BattleUnit> enemyTeam = new List<BattleUnit>();
        private List<BattleUnit> allUnits = new List<BattleUnit>();

        private int currentTurn;
        private bool battleActive;
        private int totalGoldReward;

        // ── Events ──────────────────────────────────────────────────────
        public event Action<string> OnBattleLog;
        public event Action<bool, int> OnBattleEnd; // (playerWon, goldReward)

        // ── Public accessors for UI ─────────────────────────────────────
        public List<BattleUnit> PlayerTeam => playerTeam;
        public List<BattleUnit> EnemyTeam => enemyTeam;
        public int CurrentTurn => currentTurn;
        public bool IsBattleActive => battleActive;

        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// 初始化并启动战斗
        /// </summary>
        public void InitBattle(List<SlimeInstance> playerSlimes, List<EnemyData> enemies)
        {
            playerTeam.Clear();
            enemyTeam.Clear();
            allUnits.Clear();
            currentTurn = 0;
            battleActive = true;
            totalGoldReward = 0;

            // 创建玩家单位
            int count = Mathf.Min(playerSlimes.Count, TEAM_SIZE);
            for (int i = 0; i < count; i++)
            {
                var unit = BattleUnit.FromSlime(playerSlimes[i]);
                playerTeam.Add(unit);
                allUnits.Add(unit);
            }

            // 创建敌方单位
            count = Mathf.Min(enemies.Count, TEAM_SIZE);
            for (int i = 0; i < count; i++)
            {
                var unit = BattleUnit.FromEnemy(enemies[i]);
                enemyTeam.Add(unit);
                allUnits.Add(unit);
                totalGoldReward += enemies[i].goldReward;
            }

            Log($"=== 战斗开始! 玩家 {playerTeam.Count} vs 敌人 {enemyTeam.Count} ===");
            StartCoroutine(BattleLoop());
        }

        // ─────────────────────────────────────────────────────────────────
        private IEnumerator BattleLoop()
        {
            while (battleActive && currentTurn < MAX_TURNS)
            {
                currentTurn++;
                Log($"--- 回合 {currentTurn} ---");

                // Tick shields and cooldowns at turn start
                foreach (var unit in allUnits)
                {
                    if (unit.IsAlive)
                    {
                        unit.TickShield();
                        unit.TickCooldowns();
                    }
                }

                // Get action order
                List<BattleUnit> actionOrder = TurnManager.GetActionOrder(allUnits);

                foreach (var unit in actionOrder)
                {
                    if (!unit.IsAlive || !battleActive)
                        continue;

                    ExecuteUnitAction(unit);

                    // Check win/lose after each action
                    if (CheckBattleEnd())
                    {
                        yield break;
                    }

                    yield return new WaitForSeconds(0.3f);
                }
            }

            // 30 turn limit reached - player loses
            if (battleActive)
            {
                Log("回合上限到达，战斗结束！");
                EndBattle(false);
            }
        }

        // ─────────────────────────────────────────────────────────────────
        private void ExecuteUnitAction(BattleUnit unit)
        {
            if (unit.isEnemy)
            {
                ExecuteEnemyAction(unit);
            }
            else
            {
                ExecutePlayerAIAction(unit);
            }
        }

        /// <summary>
        /// 玩家单位 AI：自动选技能（随机选非 CD 技能）
        /// </summary>
        private void ExecutePlayerAIAction(BattleUnit unit)
        {
            if (unit.skills == null || unit.skills.Count == 0)
            {
                // 普通攻击 fallback
                var target = GetRandomAliveEnemy();
                if (target != null)
                {
                    int damage = Mathf.Max(1, Mathf.FloorToInt(unit.ATK * 0.8f));
                    float reduction = target.DEF / (target.DEF + 50f);
                    damage = Mathf.Max(1, Mathf.FloorToInt(damage * (1f - reduction)));
                    target.TakeDamage(damage);
                    Log($"{unit.unitName} 普通攻击 {target.unitName}，造成 {damage} 伤害");
                }
                return;
            }

            // Find available skills (not on cooldown)
            List<int> available = new List<int>();
            for (int i = 0; i < unit.skills.Count; i++)
            {
                if (!unit.cooldowns.ContainsKey(i) || unit.cooldowns[i] <= 0)
                {
                    available.Add(i);
                }
            }

            if (available.Count == 0)
            {
                // All on cooldown - basic attack
                var target = GetRandomAliveEnemy();
                if (target != null)
                {
                    int damage = Mathf.Max(1, Mathf.FloorToInt(unit.ATK * 0.8f));
                    float reduction = target.DEF / (target.DEF + 50f);
                    damage = Mathf.Max(1, Mathf.FloorToInt(damage * (1f - reduction)));
                    target.TakeDamage(damage);
                    Log($"{unit.unitName} 普通攻击 {target.unitName}，造成 {damage} 伤害");
                }
                return;
            }

            int skillIdx = available[UnityEngine.Random.Range(0, available.Count)];
            SkillData skill = unit.skills[skillIdx];

            // Set cooldown
            if (skill.cooldown > 0)
            {
                unit.cooldowns[skillIdx] = skill.cooldown;
            }

            switch (skill.skillType)
            {
                case SkillType.Attack:
                    if (skill.targetType == TargetType.AllEnemy)
                    {
                        foreach (var enemy in enemyTeam)
                        {
                            if (enemy.IsAlive)
                            {
                                int dmg = CombatCalculator.CalculateDamage(unit, skill, enemy);
                                enemy.TakeDamage(dmg);
                                Log($"{unit.unitName} 使用 {skill.skillName} 攻击 {enemy.unitName}，造成 {dmg} 伤害");
                            }
                        }
                    }
                    else
                    {
                        var target = GetRandomAliveEnemy();
                        if (target != null)
                        {
                            int dmg = CombatCalculator.CalculateDamage(unit, skill, target);
                            target.TakeDamage(dmg);
                            Log($"{unit.unitName} 使用 {skill.skillName} 攻击 {target.unitName}，造成 {dmg} 伤害");
                        }
                    }
                    break;

                case SkillType.Heal:
                    var healTarget = GetLowestHPAlly(false);
                    if (healTarget != null)
                    {
                        int heal = CombatCalculator.CalculateHeal(unit, skill);
                        healTarget.Heal(heal);
                        Log($"{unit.unitName} 使用 {skill.skillName} 治疗 {healTarget.unitName}，恢复 {heal} HP");
                    }
                    break;

                case SkillType.Defense:
                    int shieldHP = CombatCalculator.CalculateShield(unit, skill);
                    unit.ApplyShield(shieldHP, 2);
                    Log($"{unit.unitName} 使用 {skill.skillName}，获得 {shieldHP} 护盾");
                    break;

                default:
                    // Support or other - treat as attack fallback
                    var defaultTarget = GetRandomAliveEnemy();
                    if (defaultTarget != null)
                    {
                        int dmg = CombatCalculator.CalculateDamage(unit, skill, defaultTarget);
                        defaultTarget.TakeDamage(dmg);
                        Log($"{unit.unitName} 使用 {skill.skillName} 攻击 {defaultTarget.unitName}，造成 {dmg} 伤害");
                    }
                    break;
            }
        }

        /// <summary>
        /// 敌人 AI：自动选技能（随机选非 CD 技能）
        /// </summary>
        private void ExecuteEnemyAction(BattleUnit unit)
        {
            if (unit.enemySkills == null || unit.enemySkills.Count == 0)
            {
                // No skills - basic attack
                var target = GetRandomAlivePlayer();
                if (target != null)
                {
                    int damage = Mathf.Max(1, Mathf.FloorToInt(unit.ATK * 0.8f));
                    float reduction = target.DEF / (target.DEF + 50f);
                    damage = Mathf.Max(1, Mathf.FloorToInt(damage * (1f - reduction)));
                    target.TakeDamage(damage);
                    Log($"{unit.unitName} 普通攻击 {target.unitName}，造成 {damage} 伤害");
                }
                return;
            }

            // Find available skills
            List<int> available = new List<int>();
            for (int i = 0; i < unit.enemySkills.Count; i++)
            {
                if (!unit.cooldowns.ContainsKey(i) || unit.cooldowns[i] <= 0)
                {
                    available.Add(i);
                }
            }

            if (available.Count == 0)
            {
                var target = GetRandomAlivePlayer();
                if (target != null)
                {
                    int damage = Mathf.Max(1, Mathf.FloorToInt(unit.ATK * 0.8f));
                    float reduction = target.DEF / (target.DEF + 50f);
                    damage = Mathf.Max(1, Mathf.FloorToInt(damage * (1f - reduction)));
                    target.TakeDamage(damage);
                    Log($"{unit.unitName} 普通攻击 {target.unitName}，造成 {damage} 伤害");
                }
                return;
            }

            int skillIdx = available[UnityEngine.Random.Range(0, available.Count)];
            EnemySkillData skill = unit.enemySkills[skillIdx];

            if (skill.cooldown > 0)
            {
                unit.cooldowns[skillIdx] = skill.cooldown;
            }

            switch (skill.skillType)
            {
                case SkillType.Attack:
                    if (skill.targetType == TargetType.AllEnemy)
                    {
                        foreach (var player in playerTeam)
                        {
                            if (player.IsAlive)
                            {
                                int dmg = CombatCalculator.CalculateDamageWithEnemySkill(unit, skill, player);
                                player.TakeDamage(dmg);
                                Log($"{unit.unitName} 使用 {skill.skillName} 攻击 {player.unitName}，造成 {dmg} 伤害");
                            }
                        }
                    }
                    else
                    {
                        var target = GetRandomAlivePlayer();
                        if (target != null)
                        {
                            int dmg = CombatCalculator.CalculateDamageWithEnemySkill(unit, skill, target);
                            target.TakeDamage(dmg);
                            Log($"{unit.unitName} 使用 {skill.skillName} 攻击 {target.unitName}，造成 {dmg} 伤害");
                        }
                    }
                    break;

                case SkillType.Heal:
                    var healTarget = GetLowestHPAlly(true);
                    if (healTarget != null)
                    {
                        int heal = Mathf.Max(1, Mathf.FloorToInt(skill.baseHeal + unit.ATK * 0.8f));
                        healTarget.Heal(heal);
                        Log($"{unit.unitName} 使用 {skill.skillName} 治疗 {healTarget.unitName}，恢复 {heal} HP");
                    }
                    break;

                case SkillType.Defense:
                    int shieldHP = Mathf.Max(1, Mathf.FloorToInt(unit.DEF * 1.5f + skill.baseDamage));
                    unit.ApplyShield(shieldHP, 2);
                    Log($"{unit.unitName} 使用 {skill.skillName}，获得 {shieldHP} 护盾");
                    break;

                default:
                    var defaultTarget = GetRandomAlivePlayer();
                    if (defaultTarget != null)
                    {
                        int dmg = CombatCalculator.CalculateDamageWithEnemySkill(unit, skill, defaultTarget);
                        defaultTarget.TakeDamage(dmg);
                        Log($"{unit.unitName} 使用 {skill.skillName} 攻击 {defaultTarget.unitName}，造成 {dmg} 伤害");
                    }
                    break;
            }
        }

        // ── Helpers ─────────────────────────────────────────────────────

        private BattleUnit GetRandomAliveEnemy()
        {
            List<BattleUnit> alive = new List<BattleUnit>();
            foreach (var e in enemyTeam)
                if (e.IsAlive) alive.Add(e);
            if (alive.Count == 0) return null;
            return alive[UnityEngine.Random.Range(0, alive.Count)];
        }

        private BattleUnit GetRandomAlivePlayer()
        {
            List<BattleUnit> alive = new List<BattleUnit>();
            foreach (var p in playerTeam)
                if (p.IsAlive) alive.Add(p);
            if (alive.Count == 0) return null;
            return alive[UnityEngine.Random.Range(0, alive.Count)];
        }

        private BattleUnit GetLowestHPAlly(bool isEnemySide)
        {
            var team = isEnemySide ? enemyTeam : playerTeam;
            BattleUnit lowest = null;
            foreach (var u in team)
            {
                if (!u.IsAlive) continue;
                if (lowest == null || u.currentHP < lowest.currentHP)
                    lowest = u;
            }
            return lowest;
        }

        private bool CheckBattleEnd()
        {
            bool allEnemiesDead = true;
            foreach (var e in enemyTeam)
                if (e.IsAlive) { allEnemiesDead = false; break; }

            bool allPlayersDead = true;
            foreach (var p in playerTeam)
                if (p.IsAlive) { allPlayersDead = false; break; }

            if (allEnemiesDead)
            {
                EndBattle(true);
                return true;
            }
            if (allPlayersDead)
            {
                EndBattle(false);
                return true;
            }
            return false;
        }

        private void EndBattle(bool playerWon)
        {
            battleActive = false;
            int reward = playerWon ? totalGoldReward : 0;

            if (playerWon)
            {
                Log($"=== 战斗胜利！获得 {reward} 金币 ===");
            }
            else
            {
                Log("=== 战斗失败 ===");
            }

            OnBattleEnd?.Invoke(playerWon, reward);
        }

        private void Log(string message)
        {
            Debug.Log($"[Battle] {message}");
            OnBattleLog?.Invoke(message);
        }
    }
}
