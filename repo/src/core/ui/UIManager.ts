import type { GameState, Slime } from '../types';

interface UIHandlers {
  onNewGame: () => void;
  onSave: () => void;
  onLoad: () => void;
  onBattle: () => void;
  onOpenBackpack: () => void;
  onOpenArchive: () => void;
  onOpenFacility: () => void;
  onOpenShop: () => void;
  onOpenQuest: () => void;
  onOpenCodex: () => void;
  onOpenArena: () => void;
}

export type PriceEvaluatorFn = (slime: Slime) => number;

export class UIManager {
  readonly root: HTMLDivElement;
  private readonly currencyEl: HTMLSpanElement;
  private readonly slimeCountEl: HTMLSpanElement;
  private readonly countdownEl: HTMLSpanElement;
  private readonly capacityEl: HTMLSpanElement;
  private readonly fullHintEl: HTMLDivElement;
  private readonly buffStatusEl: HTMLDivElement;
  /** Bottom slime list panel */
  private readonly slimeListEl: HTMLDivElement;

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
    const backpackBtn = this.makeButton('\ud83c\udf92 \u80cc\u5305');
    const archiveBtn = this.makeButton('\ud83d\udce6 \u5c01\u5b58\u5e93');
    const facilityBtn = this.makeButton('\ud83c\udfd7 \u8bbe\u65bd');
    const shopBtn = this.makeButton('\ud83d\uded2 \u5546\u5e97');
    const questBtn = this.makeButton('\ud83d\udcdc \u4efb\u52a1');
    const codexBtn = this.makeButton('\ud83d\udcd6 \u56fe\u9274');
    const arenaBtn = this.makeButton('\ud83c\udfd4 \u573a\u5730');

    actions.append(newBtn, saveBtn, loadBtn, battleBtn, backpackBtn, archiveBtn, facilityBtn, shopBtn, questBtn, codexBtn, arenaBtn);

    // Bottom slime list
    this.slimeListEl = document.createElement('div');
    this.slimeListEl.className = 'ui-slime-list';

    this.root.append(title, currency, slimeCount, countdown, capacity, this.fullHintEl, this.buffStatusEl, actions, this.slimeListEl);

    this.buttons = { newBtn, saveBtn, loadBtn, battleBtn, backpackBtn, archiveBtn, facilityBtn, shopBtn, questBtn, codexBtn, arenaBtn };
  }

  private readonly buttons: {
    newBtn: HTMLButtonElement;
    saveBtn: HTMLButtonElement;
    loadBtn: HTMLButtonElement;
    battleBtn: HTMLButtonElement;
    backpackBtn: HTMLButtonElement;
    archiveBtn: HTMLButtonElement;
    facilityBtn: HTMLButtonElement;
    shopBtn: HTMLButtonElement;
    questBtn: HTMLButtonElement;
    codexBtn: HTMLButtonElement;
    arenaBtn: HTMLButtonElement;
  };

  private makeButton(label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'pixel-btn';
    return btn;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setPriceEvaluator(_fn: unknown): void {
    // no-op: price evaluation now lives in BackpackUI
  }

  bind(handlers: UIHandlers): void {
    this.buttons.newBtn.onclick = handlers.onNewGame;
    this.buttons.saveBtn.onclick = handlers.onSave;
    this.buttons.loadBtn.onclick = handlers.onLoad;
    this.buttons.battleBtn.onclick = handlers.onBattle;
    this.buttons.backpackBtn.onclick = handlers.onOpenBackpack;
    this.buttons.archiveBtn.onclick = handlers.onOpenArchive;
    this.buttons.facilityBtn.onclick = handlers.onOpenFacility;
    this.buttons.shopBtn.onclick = handlers.onOpenShop;
    this.buttons.questBtn.onclick = handlers.onOpenQuest;
    this.buttons.codexBtn.onclick = handlers.onOpenCodex;
    this.buttons.arenaBtn.onclick = handlers.onOpenArena;
  }

  /** Render a compact slime card for the bottom list */
  private renderSlimeCard(slime: Slime): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'ui-slime-card';
    card.dataset['id'] = slime.id;

    // Color swatch
    const swatch = document.createElement('div');
    swatch.className = 'ui-slime-swatch';
    swatch.style.background = slime.color;

    // Name + rarity
    const info = document.createElement('div');
    info.className = 'ui-slime-info';
    info.textContent = slime.name;

    // HP bar
    const hpOuter = document.createElement('div');
    hpOuter.className = 'ui-slime-hp-outer';
    const hpInner = document.createElement('div');
    hpInner.className = 'ui-slime-hp-inner';
    const hpPct = slime.stats.health > 0
      ? Math.max(0, Math.min(100, (slime.stats.health / slime.stats.health) * 100))
      : 100;
    hpInner.style.width = `${hpPct}%`;
    hpOuter.appendChild(hpInner);

    card.append(swatch, info, hpOuter);
    return card;
  }

  render(state: GameState, timeUntilSplit: number, maxCapacity: number): void {
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

    // Update bottom slime list — show up to 8 most recent slimes
    this.slimeListEl.replaceChildren();
    if (state.slimes.length > 0) {
      const displayed = state.slimes.slice(-8);
      for (const slime of displayed) {
        this.slimeListEl.appendChild(this.renderSlimeCard(slime));
      }
    }

    // Progressive unlock
    const unlocks = state.onboarding?.unlocks;
    if (unlocks && state.onboarding?.currentStep !== null) {
      this.buttons.battleBtn.style.display = unlocks.battle ? '' : 'none';
      this.buttons.backpackBtn.style.display = unlocks.cull || unlocks.sell || unlocks.archive ? '' : 'none';
      this.buttons.archiveBtn.style.display = unlocks.archive ? '' : 'none';
      this.buttons.facilityBtn.style.display = unlocks.facility ? '' : 'none';
      this.buttons.shopBtn.style.display = unlocks.shop ? '' : 'none';
      this.buttons.questBtn.style.display = unlocks.quest ? '' : 'none';
      this.buttons.codexBtn.style.display = unlocks.codex ? '' : 'none';
      this.buttons.arenaBtn.style.display = unlocks.arena ? '' : 'none';
    } else {
      this.buttons.battleBtn.style.display = '';
      this.buttons.backpackBtn.style.display = '';
      this.buttons.archiveBtn.style.display = '';
      this.buttons.facilityBtn.style.display = '';
      this.buttons.shopBtn.style.display = '';
      this.buttons.questBtn.style.display = '';
      this.buttons.codexBtn.style.display = '';
      this.buttons.arenaBtn.style.display = '';
    }
  }

  setActionsDisabled(disabled: boolean): void {
    const btns = this.root.querySelectorAll<HTMLButtonElement>('.ui-actions button');
    btns.forEach(btn => {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '0.4' : '';
      btn.style.pointerEvents = disabled ? 'none' : '';
    });
  }
}

// Re-export Slime type for PriceEvaluatorFn
export type { Slime };
