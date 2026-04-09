using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace SlimeEvolution.Combat
{
    public static class TurnManager
    {
        public static List<BattleUnit> GetActionOrder(List<BattleUnit> allUnits)
        {
            return allUnits
                .Where(u => u.IsAlive)
                .OrderByDescending(u => u.SPD * 100 + Random.Range(0, 100))
                .ToList();
        }
    }
}
