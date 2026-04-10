import type { AccessoryTemplate } from '../types';
import { Rarity } from '../types';

export const ACCESSORY_TEMPLATES: AccessoryTemplate[] = [
  {
    id: 'acc-iron-ring',
    name: '铁之指环',
    kind: 'stat',
    rarity: Rarity.Common,
    effect: { statBonuses: { attack: 3 }, description: '攻击+3' },
    shopPrice: 150,
    shopCurrency: 'gold',
  },
  {
    id: 'acc-guardian-amulet',
    name: '守护挂坠',
    kind: 'stat',
    rarity: Rarity.Common,
    effect: { statBonuses: { defense: 3 }, description: '防御+3' },
    shopPrice: 150,
    shopCurrency: 'gold',
  },
  {
    id: 'acc-swift-anklet',
    name: '疾风脚环',
    kind: 'stat',
    rarity: Rarity.Uncommon,
    effect: { statBonuses: { speed: 3 }, description: '速度+3' },
    shopPrice: 200,
    shopCurrency: 'gold',
  },
  {
    id: 'acc-vitality-charm',
    name: '生命符咒',
    kind: 'stat',
    rarity: Rarity.Uncommon,
    effect: { statBonuses: { health: 10 }, description: '生命+10' },
    shopPrice: 200,
    shopCurrency: 'gold',
  },
  {
    id: 'acc-flame-crystal',
    name: '火焰水晶',
    kind: 'tendency',
    rarity: Rarity.Rare,
    effect: { tendencyBias: 'fire', description: '变异倾向：火焰' },
    shopPrice: 30,
    shopCurrency: 'crystal',
  },
  {
    id: 'acc-frost-crystal',
    name: '冰霜水晶',
    kind: 'tendency',
    rarity: Rarity.Rare,
    effect: { tendencyBias: 'ice', description: '变异倾向：冰霜' },
    shopPrice: 30,
    shopCurrency: 'crystal',
  },
  {
    id: 'acc-origin-pendant',
    name: '起源吊坠',
    kind: 'rare',
    rarity: Rarity.Epic,
    effect: { statBonuses: { attack: 5, defense: 5 }, description: '攻击+5，防御+5' },
    shopPrice: 80,
    shopCurrency: 'crystal',
  },
  {
    id: 'acc-rainbow-ribbon',
    name: '彩虹丝带',
    kind: 'rare',
    rarity: Rarity.Epic,
    effect: { statBonuses: { health: 15, speed: 2 }, description: '生命+15，速度+2' },
  },
  {
    id: 'acc-kings-crown',
    name: '王者之冠',
    kind: 'rare',
    rarity: Rarity.Legendary,
    effect: {
      statBonuses: { attack: 8, defense: 4, speed: 2, health: 10 },
      description: '全属性提升：ATK+8 DEF+4 SPD+2 HP+10',
    },
  },
];

export function getAccessoryTemplate(templateId: string): AccessoryTemplate | undefined {
  return ACCESSORY_TEMPLATES.find((t) => t.id === templateId);
}
