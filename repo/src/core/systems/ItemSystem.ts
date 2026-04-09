import type { GameState, Item, ItemType } from '../types';

export interface ItemDefinition {
  type: ItemType;
  name: string;
  description: string;
}

export const ITEM_DEFINITIONS: Record<ItemType, ItemDefinition> = {
  'mutation-catalyst': {
    type: 'mutation-catalyst',
    name: '变异催化剂',
    description: '使用后下一次分裂变异概率×2（一次性）',
  },
  'stat-booster': {
    type: 'stat-booster',
    name: '属性强化剂',
    description: '使用在指定史莱姆上，随机属性+3~5',
  },
  'rare-essence': {
    type: 'rare-essence',
    name: '稀有精华',
    description: '使用后下一次分裂增加稀有特性概率×3（一次性）',
  },
};

export class ItemSystem {
  static addItem(state: GameState, itemType: ItemType): void {
    const existing = state.items.find((i) => i.type === itemType);
    if (existing) {
      existing.quantity += 1;
    } else {
      const def = ITEM_DEFINITIONS[itemType];
      state.items.push({
        id: `item-${itemType}`,
        name: def.name,
        description: def.description,
        type: itemType,
        quantity: 1,
      });
    }
  }

  static getItem(state: GameState, itemType: ItemType): Item | undefined {
    return state.items.find((i) => i.type === itemType);
  }

  static hasItem(state: GameState, itemType: ItemType): boolean {
    const item = ItemSystem.getItem(state, itemType);
    return item !== undefined && item.quantity > 0;
  }

  static useItem(state: GameState, itemType: ItemType, slimeId?: string): string {
    const item = state.items.find((i) => i.type === itemType);
    if (!item || item.quantity <= 0) {
      return '道具不足，无法使用';
    }

    switch (itemType) {
      case 'mutation-catalyst': {
        item.quantity -= 1;
        return '变异催化剂已激活，下次分裂变异概率×2';
      }
      case 'stat-booster': {
        if (!slimeId) return '需要指定目标史莱姆';
        const slime = state.slimes.find((s) => s.id === slimeId)
          ?? state.archivedSlimes.find((s) => s.id === slimeId);
        if (!slime) return '找不到指定史莱姆';
        const statKeys = ['health', 'attack', 'defense', 'speed'] as const;
        const key = statKeys[Math.floor(Math.random() * statKeys.length)];
        const boost = 3 + Math.floor(Math.random() * 3); // 3~5
        slime.stats[key] += boost;
        item.quantity -= 1;
        return `属性强化剂已使用，${slime.name} 的 ${key} +${boost}`;
      }
      case 'rare-essence': {
        item.quantity -= 1;
        return '稀有精华已激活，下次分裂稀有特性概率×3';
      }
      default:
        return '未知道具类型';
    }
  }
}
