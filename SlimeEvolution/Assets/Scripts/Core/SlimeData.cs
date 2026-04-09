using System.Collections.Generic;
using UnityEngine;

namespace SlimeEvolution.Core
{
    [CreateAssetMenu(fileName = "NewSlime", menuName = "SlimeEvolution/SlimeData")]
    public class SlimeData : ScriptableObject
    {
        public string slimeName;
        [TextArea] public string description;
        public Rarity rarity;
        public SlimeStats baseStats;
        public List<TraitData> possibleTraits;
        public List<SkillData> possibleSkills;
        public Sprite icon;
    }
}
