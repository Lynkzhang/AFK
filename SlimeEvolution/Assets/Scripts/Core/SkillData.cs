using UnityEngine;

namespace SlimeEvolution.Core
{
    [CreateAssetMenu(fileName = "NewSkill", menuName = "SlimeEvolution/SkillData")]
    public class SkillData : ScriptableObject
    {
        public string skillName;
        [TextArea] public string description;
        public SkillType skillType;
        public float baseDamage;
        public float baseHeal;
        public int cooldown;
        public TargetType targetType;
        public float scaling = 1.0f;  // ATK 系数，Single=1.0, AllEnemy=0.6, Self=1.5
    }
}
