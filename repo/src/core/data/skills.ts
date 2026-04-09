import type { Skill } from '../types';

export const ALL_SKILLS: Skill[] = [
  { id: 'slime-spit', name: '粘液喷射', type: 'attack', targetType: 'single', damage: 8, cooldown: 2 },
  { id: 'acid-wave', name: '酸液波', type: 'attack', targetType: 'aoe', damage: 12, cooldown: 4 },
  { id: 'gel-shield', name: '凝胶护盾', type: 'defense', targetType: 'self', damage: 0, cooldown: 3 },
  { id: 'harden', name: '外膜硬化', type: 'defense', targetType: 'self', damage: 0, cooldown: 5 },
  { id: 'focus-pulse', name: '专注脉冲', type: 'support', targetType: 'ally', damage: 0, cooldown: 3 },
  { id: 'speed-song', name: '疾速节拍', type: 'support', targetType: 'team', damage: 0, cooldown: 6 },
  { id: 'regen-drop', name: '再生液滴', type: 'heal', targetType: 'single', damage: 10, cooldown: 4 },
  { id: 'vital-surge', name: '生命涌动', type: 'heal', targetType: 'team', damage: 6, cooldown: 7 },
];
