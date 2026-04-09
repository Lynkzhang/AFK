using UnityEngine;

namespace SlimeEvolution.Core
{
    [CreateAssetMenu(fileName = "NewTrait", menuName = "SlimeEvolution/TraitData")]
    public class TraitData : ScriptableObject
    {
        public string traitName;
        [TextArea] public string description;
        public Rarity rarity;
        public SlimeStats statModifiers;
    }
}
