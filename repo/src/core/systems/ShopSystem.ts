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
