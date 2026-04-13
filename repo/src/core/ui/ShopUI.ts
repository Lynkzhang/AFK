const BASE = import.meta.env.BASE_URL;
import type { GameState, ShopItem, Item } from '../types';
import { SHOP_ITEMS, ShopSystem } from '../systems/ShopSystem';
import { ACCESSORY_TEMPLATES } from '../data/accessories';

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
const shopTitleIcon = document.createElement('img');
    shopTitleIcon.src = `${BASE}assets/icon-shop.png`;
    shopTitleIcon.alt = '';
    shopTitleIcon.className = 'btn-icon';
    shopTitleIcon.onerror = () => { shopTitleIcon.style.display = 'none'; };
    title.append(shopTitleIcon, document.createTextNode('\ud83d\uded2 \u5546\u5e97'));
    this.root.appendChild(title);

    // Currency display
    const currencyDiv = document.createElement('div');
    currencyDiv.className = 'shop-currency';
    currencyDiv.innerHTML = `\ud83d\udcb0 \u91d1\u5e01: <span>${state.currency}</span> | \ud83d\udc8e \u6676\u77f3: <span>${state.crystal}</span>`;
    this.root.appendChild(currencyDiv);

    // Shop items section
    const shopTitle = document.createElement('h3');
    shopTitle.textContent = '\u5546\u54c1\u5217\u8868';
    this.root.appendChild(shopTitle);

    const shopList = document.createElement('div');
    shopList.className = 'shop-item-list';

    for (const shopItem of SHOP_ITEMS) {
      const card = this.createShopCard(shopItem, state);
      shopList.appendChild(card);
    }
    this.root.appendChild(shopList);

    // Accessory shop section
    const accTitle = document.createElement('h3');
    accTitle.textContent = '\ud83c\udf80 \u9970\u54c1';
    this.root.appendChild(accTitle);

    const accList = document.createElement('div');
    accList.className = 'shop-item-list';
    for (const template of ACCESSORY_TEMPLATES) {
      if (!template.shopPrice || !template.shopCurrency) continue;
      const card = document.createElement('div');
      card.className = 'shop-card';
      const nameEl = document.createElement('div');
      nameEl.className = 'shop-card-name';
      nameEl.textContent = `${template.name} [${template.rarity}]`;
      const descEl = document.createElement('div');
      descEl.className = 'shop-card-desc';
      descEl.textContent = template.effect.description;
      const priceEl = document.createElement('div');
      priceEl.className = 'shop-card-price';
      const icon = template.shopCurrency === 'gold' ? '\ud83d\udcb0' : '\ud83d\udc8e';
      priceEl.textContent = `${icon} ${template.shopPrice}`;
      const buyBtn = document.createElement('button');
      buyBtn.className = 'shop-buy-btn';
      buyBtn.textContent = '\u8d2d\u4e70';
      const canAfford = template.shopCurrency === 'gold'
        ? state.currency >= template.shopPrice
        : state.crystal >= template.shopPrice;
      buyBtn.disabled = !canAfford;
      buyBtn.onclick = () => this.handlers?.onBuy(template.id);
      card.append(nameEl, descEl, priceEl, buyBtn);
      accList.appendChild(card);
    }
    this.root.appendChild(accList);

    // Inventory section
    const invTitle = document.createElement('h3');
    invTitle.textContent = '\ud83c\udf92 \u80cc\u5305';
    this.root.appendChild(invTitle);

    const invList = document.createElement('div');
    invList.className = 'shop-inventory';

    const itemsWithQty = state.items.filter((i) => i.quantity > 0);
    if (itemsWithQty.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = '\u80cc\u5305\u4e3a\u7a7a';
      invList.appendChild(empty);
    } else {
      for (const item of itemsWithQty) {
        const row = this.createInventoryRow(item, state);
        invList.appendChild(row);
      }
    }
    this.root.appendChild(invList);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'shop-back-btn';
    backBtn.textContent = '\u8fd4\u56de';
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
    const icon = shopItem.currencyType === 'gold' ? '\ud83d\udcb0' : '\ud83d\udc8e';
    priceEl.textContent = `${icon} ${shopItem.price}`;

    const buyBtn = document.createElement('button');
    buyBtn.className = 'shop-buy-btn';
    buyBtn.textContent = '\u8d2d\u4e70';
    buyBtn.disabled = !ShopSystem.canAfford(state, shopItem);
    buyBtn.onclick = () => this.handlers?.onBuy(shopItem.id);

    card.append(nameEl, descEl, priceEl, buyBtn);
    return card;
  }

  private createInventoryRow(item: Item, state: GameState): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'inventory-row';

    const info = document.createElement('span');
    info.textContent = `${item.name} \u00d7${item.quantity}`;

    // Target slime selector
    const slimes = state.slimes;
    if (slimes.length > 0) {
      const select = document.createElement('select');
      select.className = 'item-target-select';
      for (const s of slimes) {
        const opt = document.createElement('option');
        opt.value = s.id;
        const total = s.stats.health + s.stats.attack + s.stats.defense + s.stats.speed;
        opt.textContent = `${s.name} (\u603b${total})`;
        select.appendChild(opt);
      }

      const useBtn = document.createElement('button');
      useBtn.className = 'item-use-btn';
      useBtn.textContent = '\u4f7f\u7528';
      useBtn.onclick = () => this.handlers?.onUseItem(item.type, select.value);

      row.append(info, select, useBtn);
    } else {
      const hint = document.createElement('span');
      hint.className = 'item-no-target';
      hint.textContent = '\u65e0\u53ef\u7528\u53f2\u83b1\u59c6';
      row.append(info, hint);
    }

    return row;
  }
}
