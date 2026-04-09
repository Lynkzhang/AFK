import { Rarity } from '../types';
import type { Trait } from '../types';

export const ALL_TRAITS: Trait[] = [
  { id: 'fast-split', name: '加速分裂', description: '分裂速度提升', rarity: Rarity.Common, effect: 'split_speed+10%' },
  { id: 'thick-gel', name: '凝胶增厚', description: '体质更稳定', rarity: Rarity.Common, effect: 'health+5' },
  { id: 'hard-shell', name: '软壳硬化', description: '表层更坚韧', rarity: Rarity.Common, effect: 'defense+3' },
  { id: 'keen-sense', name: '敏锐感知', description: '更快发现目标', rarity: Rarity.Uncommon, effect: 'speed+8%' },
  { id: 'feral-rush', name: '野性冲击', description: '短时间爆发攻击', rarity: Rarity.Uncommon, effect: 'attack+6' },
  { id: 'toxin-blood', name: '毒性血浆', description: '攻击附带腐蚀', rarity: Rarity.Rare, effect: 'on_hit_poison' },
  { id: 'adaptive-membrane', name: '自适应膜层', description: '受击后强化防御', rarity: Rarity.Rare, effect: 'on_hit_defense_up' },
  { id: 'phase-body', name: '相位体', description: '偶发闪避伤害', rarity: Rarity.Epic, effect: 'dodge_chance+15%' },
  { id: 'mind-link', name: '心智链接', description: '协同时增强支援', rarity: Rarity.Epic, effect: 'support_power+20%' },
  { id: 'origin-core', name: '起源核心', description: '远古核心持续供能', rarity: Rarity.Legendary, effect: 'all_stats+10%' },
];
