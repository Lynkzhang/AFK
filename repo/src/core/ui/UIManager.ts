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
  onBatchCull: (ids: string[]) => void;
  onBatchSell: (ids: string[]) => void;
}

export type PriceEvaluatorFn = (slime: Slime) => number;

type SortMode = 'rarity' | 'stats';
type ViewMode = 'expanded' | 'compact';
type RarityFilter = Rarity | 'all';

export class UIManager {
  readonly root: HTMLDivElement;
  private readonly currencyEl: HTMLSpanElement;
  private readonly slimeCountEl: HTMLSpanElement;
  private readonly countdownEl: HTMLSpanElement;
  private readonly capacityEl: HTMLSpanElement;
  private readonly fullHintEl: HTMLDivElement;
  private readonly buffStatusEl: HTMLDivElement;
  private readonly slimeListEl: HTMLDivElement;
  private sortMode: SortMode = 'rarity';
  private viewMode: ViewMode = 'expanded';
  private rarityFilter: RarityFilter = 'all';
  private selectedIds: Set<string> = new Set();
  private handlers: UIHandlers | null = null;
  private currentUnlocks: FeatureUnlocks | null = null;
  private priceEvaluator: PriceEvaluatorFn | null = null;
  private lastState: GameState | null = null;
  private lastSlimeListKey = '';

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

    this.buffStatusEl = document.createElement('div');
    this.buffStatusEl.className = 'buff-status hidden';

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

    // Sort + View row
    const sortActions = document.createElement('div');
    sortActions.className = 'sort-actions';
    const sortByRarityBtn = this.makeButton('\u6309\u7a00\u6709\u5ea6');
    sortByRarityBtn.classList.add('sort-btn-active');
    const sortByStatsBtn = this.makeButton('\u6309\u5c5e\u6027\u603b\u548c');

    // View mode toggle (#142)
    const viewToggleBtn = this.makeButton('\u7b80\u7565\u6a21\u5f0f');
    viewToggleBtn.className += ' view-toggle-btn';

    sortActions.append(sortByRarityBtn, sortByStatsBtn, viewToggleBtn);

    // Rarity filter row (#144)
    const filterRow = document.createElement('div');
    filterRow.className = 'filter-row';

    const filterLabel = document.createElement('span');
    filterLabel.className = 'filter-label';
    filterLabel.textContent = '\u7b5b\u9009:';

    const allFilterBtn = this.makeFilterBtn('\u5168\u90e8', 'all');
    allFilterBtn.classList.add('filter-btn-active');
    const commonFilterBtn = this.makeFilterBtn('C', Rarity.Common);
    const uncommonFilterBtn = this.makeFilterBtn('U', Rarity.Uncommon);
    const rareFilterBtn = this.makeFilterBtn('R', Rarity.Rare);
    const epicFilterBtn = this.makeFilterBtn('E', Rarity.Epic);
    const legendaryFilterBtn = this.makeFilterBtn('L', Rarity.Legendary);

    filterRow.append(filterLabel, allFilterBtn, commonFilterBtn, uncommonFilterBtn, rareFilterBtn, epicFilterBtn, legendaryFilterBtn);

    // Batch actions row (#143)
    const batchRow = document.createElement('div');
    batchRow.className = 'batch-row';
    batchRow.style.display = 'none';

    const batchCullBtn = this.makeButton('\u6279\u91cf\u5254\u9664');
    batchCullBtn.className += ' batch-cull-btn pixel-btn-danger';
    const batchSellBtn = this.makeButton('\u6279\u91cf\u51fa\u552e');
    batchSellBtn.className += ' batch-sell-btn pixel-btn-gold';
    const batchClearBtn = this.makeButton('\u53d6\u6d88\u9009\u62e9');
    batchClearBtn.className += ' batch-clear-btn';

    batchRow.append(batchCullBtn, batchSellBtn, batchClearBtn);

    const listTitle = document.createElement('h2');
    listTitle.className = 'list-title';
    listTitle.textContent = '\u53f2\u83b1\u59c6\u5217\u8868';

    this.slimeListEl = document.createElement('div');
    this.slimeListEl.className = 'slime-list';

    this.root.append(title, currency, slimeCount, countdown, capacity, this.fullHintEl, this.buffStatusEl, actions, sortActions, filterRow, batchRow, listTitle, this.slimeListEl);

    this.buttons = { newBtn, saveBtn, loadBtn, battleBtn, archiveBtn, facilityBtn, shopBtn, questBtn, codexBtn, arenaBtn, sortByRarityBtn, sortByStatsBtn, viewToggleBtn, allFilterBtn, commonFilterBtn, uncommonFilterBtn, rareFilterBtn, epicFilterBtn, legendaryFilterBtn, batchCullBtn, batchSellBtn, batchClearBtn, batchRow };
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
    viewToggleBtn: HTMLButtonElement;
    allFilterBtn: HTMLButtonElement;
    commonFilterBtn: HTMLButtonElement;
    uncommonFilterBtn: HTMLButtonElement;
    rareFilterBtn: HTMLButtonElement;
    epicFilterBtn: HTMLButtonElement;
    legendaryFilterBtn: HTMLButtonElement;
    batchCullBtn: HTMLButtonElement;
    batchSellBtn: HTMLButtonElement;
    batchClearBtn: HTMLButtonElement;
    batchRow: HTMLDivElement;
  };

  private makeButton(label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'pixel-btn';
    return btn;
  }

  private makeFilterBtn(label: string, value: RarityFilter): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'pixel-btn filter-btn';
    btn.dataset['filterValue'] = value;
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

    // Sort buttons
    this.buttons.sortByRarityBtn.onclick = () => {
      this.sortMode = 'rarity';
      this.buttons.sortByRarityBtn.classList.add('sort-btn-active');
      this.buttons.sortByStatsBtn.classList.remove('sort-btn-active');
      this.reRenderList();
    };
    this.buttons.sortByStatsBtn.onclick = () => {
      this.sortMode = 'stats';
      this.buttons.sortByStatsBtn.classList.add('sort-btn-active');
      this.buttons.sortByRarityBtn.classList.remove('sort-btn-active');
      this.reRenderList();
    };

    // View toggle (#142)
    this.buttons.viewToggleBtn.onclick = () => {
      this.viewMode = this.viewMode === 'expanded' ? 'compact' : 'expanded';
      this.buttons.viewToggleBtn.textContent = this.viewMode === 'expanded' ? '\u7b80\u7565\u6a21\u5f0f' : '\u5c55\u5f00\u6a21\u5f0f';
      this.reRenderList();
    };

    // Rarity filter buttons (#144)
    const filterBtns = [this.buttons.allFilterBtn, this.buttons.commonFilterBtn, this.buttons.uncommonFilterBtn, this.buttons.rareFilterBtn, this.buttons.epicFilterBtn, this.buttons.legendaryFilterBtn];
    for (const btn of filterBtns) {
      btn.onclick = () => {
        const val = btn.dataset['filterValue'] as RarityFilter;
        this.rarityFilter = val;
        for (const fb of filterBtns) {
          fb.classList.toggle('filter-btn-active', fb === btn);
        }
        this.reRenderList();
      };
    }

    // Batch actions (#143)
    this.buttons.batchCullBtn.onclick = () => {
      const ids = [...this.selectedIds];
      if (ids.length === 0) return;
      this.selectedIds.clear();
      this.buttons.batchRow.style.display = 'none';
      handlers.onBatchCull(ids);
    };
    this.buttons.batchSellBtn.onclick = () => {
      const ids = [...this.selectedIds];
      if (ids.length === 0) return;
      this.selectedIds.clear();
      this.buttons.batchRow.style.display = 'none';
      handlers.onBatchSell(ids);
    };
    this.buttons.batchClearBtn.onclick = () => {
      this.selectedIds.clear();
      this.buttons.batchRow.style.display = 'none';
      this.reRenderList();
    };
  }

  render(state: GameState, timeUntilSplit: number, maxCapacity: number): void {
    this.lastState = state;

    this.currencyEl.textContent = state.currency.toFixed(0);
    this.slimeCountEl.textContent = String(state.slimes.length);
    this.countdownEl.textContent = `${(Math.max(timeUntilSplit, 0) / 1000).toFixed(1)}s`;
    this.capacityEl.textContent = `${state.slimes.length} / ${maxCapacity}`;
    this.fullHintEl.classList.toggle('hidden', state.slimes.length < maxCapacity);

    // Buff status display
    const hasBuff = state.activeBuffs?.mutationCatalystActive || state.activeBuffs?.rareEssenceActive;
    this.buffStatusEl.classList.toggle('hidden', !hasBuff);
    if (hasBuff) {
      const parts: string[] = [];
      if (state.activeBuffs.mutationCatalystActive) parts.push('🧬 变异催化×2');
      if (state.activeBuffs.rareEssenceActive) parts.push('💎 稀有精华×3');
      this.buffStatusEl.textContent = parts.join(' | ');
    }

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

    // Remove selected IDs that no longer exist in state
    const existingIds = new Set(state.slimes.map((s) => s.id));
    for (const id of [...this.selectedIds]) {
      if (!existingIds.has(id)) this.selectedIds.delete(id);
    }

    // Only re-render slime list if slimes or unlocks changed (avoid destroying DOM on every frame)
    const slimeUnlocks = state.onboarding?.unlocks;
    const unlockKey = slimeUnlocks ? `${slimeUnlocks.cull}:${slimeUnlocks.sell}:${slimeUnlocks.archive}` : 'all';
    const newListKey = state.slimes.map((s) => `${s.id}:${s.rarity}`).join(',') + '|' + unlockKey;
    if (newListKey !== this.lastSlimeListKey) {
      this.lastSlimeListKey = newListKey;
      this.renderSlimeList(state);
    }
  }

  private reRenderList(): void {
    this.lastSlimeListKey = ''; // force re-render
    if (this.lastState) {
      this.renderSlimeList(this.lastState);
    }
  }

  private renderSlimeList(state: GameState): void {
    let slimes = [...state.slimes];

    // Apply rarity filter (#144)
    if (this.rarityFilter !== 'all') {
      slimes = slimes.filter((s) => s.rarity === this.rarityFilter);
    }

    // Sort
    slimes.sort((a, b) => {
      if (this.sortMode === 'stats') {
        return this.getTotalStats(b) - this.getTotalStats(a);
      }
      return this.getRarityOrder(b.rarity) - this.getRarityOrder(a.rarity);
    });

    this.slimeListEl.replaceChildren(...slimes.map((slime) => this.createSlimeCard(slime, state)));
  }

  private createSlimeCard(slime: Slime, state: GameState): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'slime-item';
    item.dataset['slimeId'] = slime.id;

    // Compact mode (#142): show checkbox for batch select
    if (this.selectedIds.has(slime.id)) {
      item.classList.add('slime-selected');
    }

    const head = document.createElement('div');
    head.className = 'slime-head';

    // Batch select checkbox (#143)
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'slime-checkbox';
    checkbox.checked = this.selectedIds.has(slime.id);
    checkbox.onchange = () => {
      if (checkbox.checked) {
        this.selectedIds.add(slime.id);
      } else {
        this.selectedIds.delete(slime.id);
      }
      item.classList.toggle('slime-selected', checkbox.checked);
      // Show/hide batch row based on selection
      const hasSel = this.selectedIds.size > 0;
      this.buttons.batchRow.style.display = hasSel ? '' : 'none';
      if (hasSel) {
        this.buttons.batchCullBtn.textContent = `\u6279\u91cf\u5254\u9664 (${this.selectedIds.size})`;
        this.buttons.batchSellBtn.textContent = `\u6279\u91cf\u51fa\u552e (${this.selectedIds.size})`;
      }
    };

    const nameEl = document.createElement('strong');
    nameEl.textContent = slime.name;

    const rarityTag = document.createElement('span');
    rarityTag.className = 'rarity-tag';
    rarityTag.style.backgroundColor = this.getRarityColor(slime.rarity);
    rarityTag.textContent = slime.rarity;

    head.append(checkbox, nameEl, rarityTag);

    // Compact mode (#142): hide details
    const info = document.createElement('div');
    info.className = 'slime-info';
    info.textContent = `\u5c5e\u6027\u603b\u548c: ${this.getTotalStats(slime)} | Generation: ${slime.generation}`;
    if (this.viewMode === 'compact') {
      info.style.display = 'none';
    }

    const actions = document.createElement('div');
    actions.className = 'slime-actions';
    if (this.viewMode === 'compact') {
      actions.style.display = 'none';
    }

    const cullBtn = this.makeButton('\u5254\u9664');
    cullBtn.className = 'pixel-btn pixel-btn-danger';

    // Sell button with price preview
    const price = this.priceEvaluator ? this.priceEvaluator(slime) : 0;
    const sellBtn = this.makeButton(price > 0 ? `\u51fa\u552e (\u{1F4B0}${price})` : '\u51fa\u552e');
    sellBtn.className = 'pixel-btn pixel-btn-gold';

    cullBtn.onclick = () => {
      this.handlers?.onCull(slime.id);
    };
    sellBtn.onclick = () => {
      this.handlers?.onSell(slime.id);
    };

    const archiveBtn = this.makeButton('\u5c01\u5b58');
    archiveBtn.className = 'pixel-btn';
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
