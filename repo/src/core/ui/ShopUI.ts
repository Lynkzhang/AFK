import type { GameState, ShopItem, Item } from '../types';
import { SHOP_ITEMS, ShopSystem } from '../systems/ShopSystem';

interface ShopUIHandlers {
  onBuy: (shopItemId: string) => void;
  onUseItem: (itemType: string, slimeId?: string) => void;
  onBack: () => void;
}

export class ShopUI {
  readonly root: HTMLDivElement;
  private handlers: ShopUIHandlers | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'shop-panel';
  }

  bind(handlers: ShopUIHandlers): void {
    this.handlers = handlers;
  }

  show(): void {
    this.root.style.display = '';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  render(state: GameState): void {
    this.root.replaceChildren();

    const title = document.createElement('h2');
    title.textContent = '🛒 商店';
    this.root.appendChild(title);

    // Currency display
    const currencyDiv = document.createElement('div');
    currencyDiv.className = 'shop-currency';
    currencyDiv.innerHTML = `💰 金币: <span>${state.currency}</span> | 💎 晶石: <span>${state.crystal}</span>`;
    this.root.appendChild(currencyDiv);

    // Shop items section
    const shopTitle = document.createElement('h3');
    shopTitle.textContent = '商品列表';
    this.root.appendChild(shopTitle);

    const shopList = document.createElement('div');
    shopList.className = 'shop-item-list';

    for (const shopItem of SHOP_ITEMS) {
      const card = this.createShopCard(shopItem, state);
      shopList.appendChild(card);
    }
    this.root.appendChild(shopList);

    // Inventory section
    const invTitle = document.createElement('h3');
    invTitle.textContent = '🎒 背包';
    this.root.appendChild(invTitle);

    const invList = document.createElement('div');
    invList.className = 'shop-inventory';

    const itemsWithQty = state.items.filter((i) => i.quantity > 0);
    if (itemsWithQty.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = '背包为空';
      invList.appendChild(empty);
    } else {
      for (const item of itemsWithQty) {
        const row = this.createInventoryRow(item);
        invList.appendChild(row);
      }
    }
    this.root.appendChild(invList);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'shop-back-btn';
    backBtn.textContent = '返回';
    backBtn.onclick = () => this.handlers?.onBack();
    this.root.appendChild(backBtn);
  }

  private createShopCard(shopItem: ShopItem, state: GameState): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'shop-card';

    const nameEl = document.createElement('div');
    nameEl.className = 'shop-card-name';
    nameEl.textContent = shopItem.name;

    const descEl = document.createElement('div');
    descEl.className = 'shop-card-desc';
    descEl.textContent = shopItem.description;

    const priceEl = document.createElement('div');
    priceEl.className = 'shop-card-price';
    const icon = shopItem.currencyType === 'gold' ? '💰' : '💎';
    priceEl.textContent = `${icon} ${shopItem.price}`;

    const buyBtn = document.createElement('button');
    buyBtn.className = 'shop-buy-btn';
    buyBtn.textContent = '购买';
    buyBtn.disabled = !ShopSystem.canAfford(state, shopItem);
    buyBtn.onclick = () => this.handlers?.onBuy(shopItem.id);

    card.append(nameEl, descEl, priceEl, buyBtn);
    return card;
  }

  private createInventoryRow(item: Item): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'inventory-row';

    const info = document.createElement('span');
    info.textContent = `${item.name} ×${item.quantity}`;

    const useBtn = document.createElement('button');
    useBtn.className = 'item-use-btn';
    useBtn.textContent = '使用';
    useBtn.onclick = () => this.handlers?.onUseItem(item.type);

    row.append(info, useBtn);
    return row;
  }
}
