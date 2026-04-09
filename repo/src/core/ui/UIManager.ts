import { Rarity } from '../types';
import type { GameState, Slime } from '../types';

interface UIHandlers {
  onNewGame: () => void;
  onSave: () => void;
  onLoad: () => void;
  onBattle: () => void;
  onCull: (id: string) => void;
  onSell: (id: string) => void;
}

type SortMode = 'rarity' | 'stats';

export class UIManager {
  readonly root: HTMLDivElement;
  private readonly currencyEl: HTMLSpanElement;
  private readonly slimeCountEl: HTMLSpanElement;
  private readonly countdownEl: HTMLSpanElement;
  private readonly capacityEl: HTMLSpanElement;
  private readonly fullHintEl: HTMLDivElement;
  private readonly slimeListEl: HTMLDivElement;
  private sortMode: SortMode = 'rarity';
  private handlers: UIHandlers | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'ui-panel';

    const title = document.createElement('h1');
    title.textContent = 'Slime Keeper';

    const currency = document.createElement('div');
    currency.innerHTML = 'Currency: <span>0</span>';
    this.currencyEl = currency.querySelector('span') as HTMLSpanElement;

    const slimeCount = document.createElement('div');
    slimeCount.innerHTML = 'Slimes: <span>0</span>';
    this.slimeCountEl = slimeCount.querySelector('span') as HTMLSpanElement;

    const countdown = document.createElement('div');
    countdown.innerHTML = '下次分裂: <span>0.0s</span>';
    this.countdownEl = countdown.querySelector('span') as HTMLSpanElement;

    const capacity = document.createElement('div');
    capacity.innerHTML = '容量: <span>0 / 12</span>';
    this.capacityEl = capacity.querySelector('span') as HTMLSpanElement;

    this.fullHintEl = document.createElement('div');
    this.fullHintEl.className = 'full-hint hidden';
    this.fullHintEl.textContent = '场地已满，无法继续分裂';

    const actions = document.createElement('div');
    actions.className = 'ui-actions';

    const newBtn = this.makeButton('新游戏');
    const saveBtn = this.makeButton('保存');
    const loadBtn = this.makeButton('加载');
    const battleBtn = this.makeButton('⚔ 战斗');

    actions.append(newBtn, saveBtn, loadBtn, battleBtn);

    const sortActions = document.createElement('div');
    sortActions.className = 'sort-actions';
    const sortByRarityBtn = this.makeButton('按稀有度');
    const sortByStatsBtn = this.makeButton('按属性总和');
    sortActions.append(sortByRarityBtn, sortByStatsBtn);

    const listTitle = document.createElement('h2');
    listTitle.className = 'list-title';
    listTitle.textContent = '史莱姆列表';

    this.slimeListEl = document.createElement('div');
    this.slimeListEl.className = 'slime-list';

    this.root.append(title, currency, slimeCount, countdown, capacity, this.fullHintEl, actions, sortActions, listTitle, this.slimeListEl);

    this.buttons = { newBtn, saveBtn, loadBtn, battleBtn, sortByRarityBtn, sortByStatsBtn };
  }

  private readonly buttons: {
    newBtn: HTMLButtonElement;
    saveBtn: HTMLButtonElement;
    loadBtn: HTMLButtonElement;
    battleBtn: HTMLButtonElement;
    sortByRarityBtn: HTMLButtonElement;
    sortByStatsBtn: HTMLButtonElement;
  };

  private makeButton(label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    return btn;
  }

  bind(handlers: UIHandlers): void {
    this.handlers = handlers;
    this.buttons.newBtn.onclick = handlers.onNewGame;
    this.buttons.saveBtn.onclick = handlers.onSave;
    this.buttons.loadBtn.onclick = handlers.onLoad;
    this.buttons.battleBtn.onclick = handlers.onBattle;
    this.buttons.sortByRarityBtn.onclick = () => {
      this.sortMode = 'rarity';
    };
    this.buttons.sortByStatsBtn.onclick = () => {
      this.sortMode = 'stats';
    };
  }

  render(state: GameState, timeUntilSplit: number, maxCapacity: number): void {
    this.currencyEl.textContent = state.currency.toFixed(0);
    this.slimeCountEl.textContent = String(state.slimes.length);
    this.countdownEl.textContent = `${(Math.max(timeUntilSplit, 0) / 1000).toFixed(1)}s`;
    this.capacityEl.textContent = `${state.slimes.length} / ${maxCapacity}`;
    this.fullHintEl.classList.toggle('hidden', state.slimes.length < maxCapacity);

    const sortedSlimes = [...state.slimes].sort((a, b) => {
      if (this.sortMode === 'stats') {
        return this.getTotalStats(b) - this.getTotalStats(a);
      }
      return this.getRarityOrder(b.rarity) - this.getRarityOrder(a.rarity);
    });

    this.slimeListEl.replaceChildren(...sortedSlimes.map((slime) => this.createSlimeCard(slime)));
  }

  private createSlimeCard(slime: Slime): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'slime-item';

    const head = document.createElement('div');
    head.className = 'slime-head';

    const nameEl = document.createElement('strong');
    nameEl.textContent = slime.name;

    const rarityTag = document.createElement('span');
    rarityTag.className = 'rarity-tag';
    rarityTag.style.backgroundColor = this.getRarityColor(slime.rarity);
    rarityTag.textContent = slime.rarity;

    head.append(nameEl, rarityTag);

    const info = document.createElement('div');
    info.className = 'slime-info';
    info.textContent = `属性总和: ${this.getTotalStats(slime)} | Generation: ${slime.generation}`;

    const actions = document.createElement('div');
    actions.className = 'slime-actions';
    const cullBtn = this.makeButton('剔除');
    const sellBtn = this.makeButton('出售');

    cullBtn.onclick = () => {
      this.handlers?.onCull(slime.id);
    };
    sellBtn.onclick = () => {
      this.handlers?.onSell(slime.id);
    };

    actions.append(cullBtn, sellBtn);
    item.append(head, info, actions);
    return item;
  }

  private getTotalStats(slime: Slime): number {
    return slime.stats.health + slime.stats.attack + slime.stats.defense + slime.stats.speed;
  }

  private getRarityOrder(rarity: Rarity): number {
    const order: Record<Rarity, number> = {
      [Rarity.Common]: 1,
      [Rarity.Uncommon]: 2,
      [Rarity.Rare]: 3,
      [Rarity.Epic]: 4,
      [Rarity.Legendary]: 5,
    };
    return order[rarity];
  }

  private getRarityColor(rarity: Rarity): string {
    const colors: Record<Rarity, string> = {
      [Rarity.Common]: '#56d364',
      [Rarity.Uncommon]: '#4f8cff',
      [Rarity.Rare]: '#9b59ff',
      [Rarity.Epic]: '#ff6b6b',
      [Rarity.Legendary]: '#ffd700',
    };
    return colors[rarity];
  }
}
