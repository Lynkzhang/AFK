import { Rarity } from '../types';
import type { GameState, Slime, FeatureUnlocks } from '../types';

interface UIHandlers {
  onNewGame: () => void;
  onSave: () => void;
  onLoad: () => void;
  onBattle: () => void;
  onCull: (id: string) => void;
  onSell: (id: string) => void;
  onArchive: (id: string) => void;
  onOpenArchive: () => void;
  onOpenFacility: () => void;
  onOpenShop: () => void;
  onOpenQuest: () => void;
  onOpenCodex: () => void;
  onOpenArena: () => void;
}

export type PriceEvaluatorFn = (slime: Slime) => number;

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
  private currentUnlocks: FeatureUnlocks | null = null;
  private priceEvaluator: PriceEvaluatorFn | null = null;

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
    countdown.innerHTML = '\u4e0b\u6b21\u5206\u88c2: <span>0.0s</span>';
    this.countdownEl = countdown.querySelector('span') as HTMLSpanElement;

    const capacity = document.createElement('div');
    capacity.innerHTML = '\u5bb9\u91cf: <span>0 / 12</span>';
    this.capacityEl = capacity.querySelector('span') as HTMLSpanElement;

    this.fullHintEl = document.createElement('div');
    this.fullHintEl.className = 'full-hint hidden';
    this.fullHintEl.textContent = '\u573a\u5730\u5df2\u6ee1\uff0c\u65e0\u6cd5\u7ee7\u7eed\u5206\u88c2';

    const actions = document.createElement('div');
    actions.className = 'ui-actions';

    const newBtn = this.makeButton('\u65b0\u6e38\u620f');
    const saveBtn = this.makeButton('\u4fdd\u5b58');
    const loadBtn = this.makeButton('\u52a0\u8f7d');
    const battleBtn = this.makeButton('\u2694 \u6218\u6597');

    const archiveBtn = this.makeButton('\ud83d\udce6 \u5c01\u5b58\u5e93');

    const facilityBtn = this.makeButton('\ud83c\udfd7 \u8bbe\u65bd');

    const shopBtn = this.makeButton('\ud83d\uded2 \u5546\u5e97');

    const questBtn = this.makeButton('\ud83d\udcdc \u4efb\u52a1');

    const codexBtn = this.makeButton('\ud83d\udcd6 \u56fe\u9274');

    const arenaBtn = this.makeButton('\ud83c\udfd4 \u573a\u5730');

    actions.append(newBtn, saveBtn, loadBtn, battleBtn, archiveBtn, facilityBtn, shopBtn, questBtn, codexBtn, arenaBtn);

    const sortActions = document.createElement('div');
    sortActions.className = 'sort-actions';
    const sortByRarityBtn = this.makeButton('\u6309\u7a00\u6709\u5ea6');
    sortByRarityBtn.classList.add('sort-btn-active');
    const sortByStatsBtn = this.makeButton('\u6309\u5c5e\u6027\u603b\u548c');
    sortActions.append(sortByRarityBtn, sortByStatsBtn);

    const listTitle = document.createElement('h2');
    listTitle.className = 'list-title';
    listTitle.textContent = '\u53f2\u83b1\u59c6\u5217\u8868';

    this.slimeListEl = document.createElement('div');
    this.slimeListEl.className = 'slime-list';

    this.root.append(title, currency, slimeCount, countdown, capacity, this.fullHintEl, actions, sortActions, listTitle, this.slimeListEl);

    this.buttons = { newBtn, saveBtn, loadBtn, battleBtn, archiveBtn, facilityBtn, shopBtn, questBtn, codexBtn, arenaBtn, sortByRarityBtn, sortByStatsBtn };
  }

  private readonly buttons: {
    newBtn: HTMLButtonElement;
    saveBtn: HTMLButtonElement;
    loadBtn: HTMLButtonElement;
    battleBtn: HTMLButtonElement;
    archiveBtn: HTMLButtonElement;
    facilityBtn: HTMLButtonElement;
    shopBtn: HTMLButtonElement;
    questBtn: HTMLButtonElement;
    codexBtn: HTMLButtonElement;
    arenaBtn: HTMLButtonElement;
    sortByRarityBtn: HTMLButtonElement;
    sortByStatsBtn: HTMLButtonElement;
  };

  private makeButton(label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    return btn;
  }

  setPriceEvaluator(fn: PriceEvaluatorFn): void {
    this.priceEvaluator = fn;
  }

  bind(handlers: UIHandlers): void {
    this.handlers = handlers;
    this.buttons.newBtn.onclick = handlers.onNewGame;
    this.buttons.saveBtn.onclick = handlers.onSave;
    this.buttons.loadBtn.onclick = handlers.onLoad;
    this.buttons.battleBtn.onclick = handlers.onBattle;
    this.buttons.archiveBtn.onclick = handlers.onOpenArchive;
    this.buttons.facilityBtn.onclick = handlers.onOpenFacility;
    this.buttons.shopBtn.onclick = handlers.onOpenShop;
    this.buttons.questBtn.onclick = handlers.onOpenQuest;
    this.buttons.codexBtn.onclick = handlers.onOpenCodex;
    this.buttons.arenaBtn.onclick = handlers.onOpenArena;
    this.buttons.sortByRarityBtn.onclick = () => {
      this.sortMode = 'rarity';
      this.buttons.sortByRarityBtn.classList.add('sort-btn-active');
      this.buttons.sortByStatsBtn.classList.remove('sort-btn-active');
    };
    this.buttons.sortByStatsBtn.onclick = () => {
      this.sortMode = 'stats';
      this.buttons.sortByStatsBtn.classList.add('sort-btn-active');
      this.buttons.sortByRarityBtn.classList.remove('sort-btn-active');
    };
  }

  render(state: GameState, timeUntilSplit: number, maxCapacity: number): void {
    this.currencyEl.textContent = state.currency.toFixed(0);
    this.slimeCountEl.textContent = String(state.slimes.length);
    this.countdownEl.textContent = `${(Math.max(timeUntilSplit, 0) / 1000).toFixed(1)}s`;
    this.capacityEl.textContent = `${state.slimes.length} / ${maxCapacity}`;
    this.fullHintEl.classList.toggle('hidden', state.slimes.length < maxCapacity);

    // Progressive unlock
    this.currentUnlocks = (state.onboarding?.currentStep !== null) ? (state.onboarding?.unlocks ?? null) : null;
    const unlocks = state.onboarding?.unlocks;
    if (unlocks && state.onboarding?.currentStep !== null) {
      this.buttons.battleBtn.style.display = unlocks.battle ? '' : 'none';
      this.buttons.archiveBtn.style.display = unlocks.archive ? '' : 'none';
      this.buttons.facilityBtn.style.display = unlocks.facility ? '' : 'none';
      this.buttons.shopBtn.style.display = unlocks.shop ? '' : 'none';
      this.buttons.questBtn.style.display = unlocks.quest ? '' : 'none';
      this.buttons.codexBtn.style.display = unlocks.codex ? '' : 'none';
      this.buttons.arenaBtn.style.display = unlocks.arena ? '' : 'none';
    } else {
      this.buttons.battleBtn.style.display = '';
      this.buttons.archiveBtn.style.display = '';
      this.buttons.facilityBtn.style.display = '';
      this.buttons.shopBtn.style.display = '';
      this.buttons.questBtn.style.display = '';
      this.buttons.codexBtn.style.display = '';
      this.buttons.arenaBtn.style.display = '';
    }

    const sortedSlimes = [...state.slimes].sort((a, b) => {
      if (this.sortMode === 'stats') {
        return this.getTotalStats(b) - this.getTotalStats(a);
      }
      return this.getRarityOrder(b.rarity) - this.getRarityOrder(a.rarity);
    });

    this.slimeListEl.replaceChildren(...sortedSlimes.map((slime) => this.createSlimeCard(slime, state)));
  }

  private createSlimeCard(slime: Slime, state: GameState): HTMLDivElement {
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
    info.textContent = `\u5c5e\u6027\u603b\u548c: ${this.getTotalStats(slime)} | Generation: ${slime.generation}`;

    const actions = document.createElement('div');
    actions.className = 'slime-actions';
    const cullBtn = this.makeButton('\u5254\u9664');

    // Sell button with price preview
    const price = this.priceEvaluator ? this.priceEvaluator(slime) : 0;
    const sellBtn = this.makeButton(price > 0 ? `\u51fa\u552e (\u{1F4B0}${price})` : '\u51fa\u552e');

    cullBtn.onclick = () => {
      this.handlers?.onCull(slime.id);
    };
    sellBtn.onclick = () => {
      this.handlers?.onSell(slime.id);
    };

    const archiveBtn = this.makeButton('\u5c01\u5b58');
    // Disable archive button if archive is full
    if (state.archivedSlimes.length >= state.archiveCapacity) {
      archiveBtn.disabled = true;
      archiveBtn.title = '\u5c01\u5b58\u5e93\u5df2\u6ee1';
    }
    archiveBtn.onclick = () => {
      this.handlers?.onArchive(slime.id);
    };

    actions.append(cullBtn, sellBtn, archiveBtn);

    const u = this.currentUnlocks;
    if (u) {
      cullBtn.style.display = u.cull ? '' : 'none';
      sellBtn.style.display = u.sell ? '' : 'none';
      archiveBtn.style.display = u.archive ? '' : 'none';
    }

    item.append(head, info, actions);
    return item;
  }

  setActionsDisabled(disabled: boolean): void {
    const btns = this.root.querySelectorAll<HTMLButtonElement>('.ui-actions button');
    btns.forEach(btn => {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '0.4' : '';
      btn.style.pointerEvents = disabled ? 'none' : '';
    });
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
