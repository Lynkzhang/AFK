import type { GameState, ShopItem } from '../types';
import { ItemSystem } from './ItemSystem';
import { ACCESSORY_TEMPLATES } from '../data/accessories';
import { AccessorySystem } from './AccessorySystem';

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'shop-mutation-catalyst',
    name: '变异催化剂',
    description: '下次分裂变异概率×2（一次性）',
    price: 200,
    currencyType: 'gold',
    itemType: 'mutation-catalyst',
  },
  {
    id: 'shop-stat-booster',
    name: '属性强化剂',
    description: '指定史莱姆随机属性+3~5',
    price: 300,
    currencyType: 'gold',
    itemType: 'stat-booster',
  },
  {
    id: 'shop-rare-essence',
    name: '稀有精华',
    description: '下次分裂稀有特性概率×3（一次性）',
    price: 50,
    currencyType: 'crystal',
    itemType: 'rare-essence',
  },
  {
    id: 'shop-split-accelerator-single',
    name: '速分催化剂',
    description: '立即完成指定史莱姆的分裂倒计时',
    price: 150,
    currencyType: 'gold',
    itemType: 'split-accelerator',
  },
  {
    id: 'shop-split-accelerator-field',
    name: '培养场强化剂',
    description: '全场分裂速度×2，持续60秒',
    price: 80,
    currencyType: 'crystal',
    itemType: 'split-accelerator',
  },
];

export class ShopSystem {
  static canAfford(state: GameState, shopItem: ShopItem): boolean {
    if (shopItem.currencyType === 'gold') {
      return state.currency >= shopItem.price;
    }
    return state.crystal >= shopItem.price;
  }

  static buyAccessory(state: GameState, templateId: string): boolean {
    const template = ACCESSORY_TEMPLATES.find((t) => t.id === templateId);
    if (!template || !template.shopPrice || !template.shopCurrency) return false;
    if (template.shopCurrency === 'gold') {
      if (state.currency < template.shopPrice) return false;
      state.currency -= template.shopPrice;
    } else {
      if (state.crystal < template.shopPrice) return false;
      state.crystal -= template.shopPrice;
    }
    AccessorySystem.giveAccessory(state, templateId);
    return true;
  }

  static buyItem(state: GameState, shopItemId: string): boolean {
    // 培养场强化剂 — 直接激活buff，不加到道具栏
    if (shopItemId === 'shop-split-accelerator-field') {
      if (state.crystal < 80) return false;
      state.crystal -= 80;
      state.activeBuffs.splitFieldAcceleratorUntil = Date.now() + 60000;
      return true;
    }

    const shopItem = SHOP_ITEMS.find((si) => si.id === shopItemId);
    if (!shopItem) return false;
    if (!ShopSystem.canAfford(state, shopItem)) return false;

    if (shopItem.currencyType === 'gold') {
      state.currency -= shopItem.price;
    } else {
      state.crystal -= shopItem.price;
    }

    ItemSystem.addItem(state, shopItem.itemType);
    return true;
  }
}
