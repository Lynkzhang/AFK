import type { GameState, Slime } from '../types';
import { Rarity, RARITY_LABEL_CN } from '../types';

const BASE = import.meta.env.BASE_URL;

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

interface QuickActionHandlers {
  onQuickView: (id: string) => void;
  onQuickSell: (id: string) => void;
  onQuickArchive: (id: string) => void;
  onQuickCull: (id: string) => void;
}

export type PriceEvaluatorFn = (slime: Slime) => number;

export class UIManager {
  readonly root: HTMLDivElement;
  private readonly currencyEl: HTMLSpanElement;
  private readonly slimeCountEl: HTMLSpanElement;
  private readonly capacityEl: HTMLSpanElement;
  private readonly fullHintEl: HTMLDivElement;
  private readonly buffStatusEl: HTMLDivElement;
  /** Bottom slime list panel */
  private readonly slimeListEl: HTMLDivElement;
  /** Quick action callbacks for slime cards */
  private quickHandlers: QuickActionHandlers | null = null;
  /** 上次渲染的 slime 列表签名，用于脏检查 */
  private lastSlimeListSignature: string = '';

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'ui-panel';

    // Title with pixel slime logo
    const title = document.createElement('h1');
    const titleIcon = document.createElement('img');
    titleIcon.src = `${BASE}assets/logo-slime.png`;
    titleIcon.alt = 'slime';
    titleIcon.className = 'ui-title-icon';
    titleIcon.onerror = () => { titleIcon.style.display = 'none'; };
    const titleText = document.createTextNode('史莱姆进化');
    title.append(titleIcon, titleText);

    // Resource bar: currency with coin icon
    const currency = document.createElement('div');
    currency.className = 'ui-resource-row';
    const coinImg = document.createElement('img');
    coinImg.src = `${BASE}assets/icon-coin.png`;
    coinImg.alt = 'gold';
    coinImg.className = 'ui-resource-icon';
    currency.innerHTML = '金币: <span>0</span>';
    currency.insertBefore(coinImg, currency.firstChild);
    this.currencyEl = currency.querySelector('span') as HTMLSpanElement;

    // Slimes count with slime icon
    const slimeCount = document.createElement('div');
    slimeCount.className = 'ui-resource-row';
    const slimeImg = document.createElement('img');
    slimeImg.src = `${BASE}assets/icon-slime.png`;
    slimeImg.alt = 'slimes';
    slimeImg.className = 'ui-resource-icon';
    slimeCount.innerHTML = '史莱姆: <span>0</span>';
    slimeCount.insertBefore(slimeImg, slimeCount.firstChild);
    this.slimeCountEl = slimeCount.querySelector('span') as HTMLSpanElement;

    // Capacity with chest icon
    const capacity = document.createElement('div');
    capacity.className = 'ui-resource-row';
    const chestImg = document.createElement('img');
    chestImg.src = `${BASE}assets/icon-chest.png`;
    chestImg.alt = 'capacity';
    chestImg.className = 'ui-resource-icon';
    capacity.innerHTML = '\u5bb9\u91cf: <span>0 / 12</span>';
    capacity.insertBefore(chestImg, capacity.firstChild);
    this.capacityEl = capacity.querySelector('span') as HTMLSpanElement;

    this.fullHintEl = document.createElement('div');
    this.fullHintEl.className = 'full-hint hidden';
    this.fullHintEl.textContent = '\u573a\u5730\u5df2\u6ee1\uff0c\u65e0\u6cd5\u7ee7\u7eed\u5206\u88c2';

    this.buffStatusEl = document.createElement('div');
    this.buffStatusEl.className = 'buff-status hidden';

    // Actions container — all buttons in single .ui-actions div (preserves E2E count=11)
    const actions = document.createElement('div');
    actions.className = 'ui-actions';

    // System group label
    const sysLabel = document.createElement('div');
    sysLabel.className = 'ui-btn-group-label';
    sysLabel.textContent = '系统';

    const newBtn = this.makeButton('\u65b0\u6e38\u620f', `${BASE}assets/icon-newgame.png`);
    const saveBtn = this.makeButton('\u4fdd\u5b58', `${BASE}assets/icon-save.png`);
    const loadBtn = this.makeButton('\u52a0\u8f7d');

    // Game group label
    const gameLabel = document.createElement('div');
    gameLabel.className = 'ui-btn-group-label';
    const swordImg = document.createElement('img');
    swordImg.src = `${BASE}assets/icon-sword.png`;
    swordImg.alt = 'battle';
    swordImg.className = 'ui-resource-icon';
    gameLabel.append(swordImg, document.createTextNode('\u529f\u80fd'));

    const battleBtn = this.makeButton('\u2694 \u6218\u6597', `${BASE}assets/icon-battle.png`);
    const backpackBtn = this.makeButton('\ud83c\udf92 \u80cc\u5305', `${BASE}assets/icon-backpack.png`);
    const archiveBtn = this.makeButton('\ud83d\udce6 \u5c01\u5b58\u5e93', `${BASE}assets/icon-archive.png`);
    const facilityBtn = this.makeButton('\ud83c\udfd7 \u8bbe\u65bd', `${BASE}assets/icon-facility.png`);
    const shopBtn = this.makeButton('\ud83d\uded2 \u5546\u5e97', `${BASE}assets/icon-shop.png`);
    const questBtn = this.makeButton('\ud83d\udcdc \u4efb\u52a1', `${BASE}assets/icon-quest.png`);
    const codexBtn = this.makeButton('\ud83d\udcd6 \u56fe\u9274', `${BASE}assets/icon-codex.png`);
    const arenaBtn = this.makeButton('\ud83c\udfd4 \u573a\u5730', `${BASE}assets/icon-arena.png`);

    actions.append(sysLabel, newBtn, saveBtn, loadBtn, gameLabel, battleBtn, backpackBtn, archiveBtn, facilityBtn, shopBtn, questBtn, codexBtn, arenaBtn);

    // Bottom slime list
    this.slimeListEl = document.createElement('div');
    this.slimeListEl.className = 'ui-slime-list';

    this.root.append(title, currency, slimeCount, capacity, this.fullHintEl, this.buffStatusEl, actions, this.slimeListEl);

    this.buttons = { newBtn, saveBtn, loadBtn, battleBtn, backpackBtn, archiveBtn, facilityBtn, shopBtn, questBtn, codexBtn, arenaBtn };

    // Event delegation for slime card quick actions (survives replaceChildren)
    this.slimeListEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('ui-slime-quick-btn')) return;
      e.stopPropagation();
      const card = target.closest('.ui-slime-card') as HTMLElement | null;
      const id = card?.dataset['id'];
      if (!id) return;
      if (target.classList.contains('ui-slime-quick-view')) {
        this.quickHandlers?.onQuickView(id);
      } else if (target.classList.contains('ui-slime-quick-sell')) {
        this.quickHandlers?.onQuickSell(id);
      } else if (target.classList.contains('ui-slime-quick-archive')) {
        this.quickHandlers?.onQuickArchive(id);
      } else if (target.classList.contains('ui-slime-quick-cull')) {
        this.quickHandlers?.onQuickCull(id);
      }
    });
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

  private makeButton(label: string, iconSrc?: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'pixel-btn';
    if (iconSrc) {
      const icon = document.createElement('img');
      icon.src = iconSrc;
      icon.alt = '';
      icon.className = 'btn-icon';
      icon.onerror = () => { icon.style.display = 'none'; };
      btn.appendChild(icon);
    }
    btn.appendChild(document.createTextNode(label));
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

  /** Bind quick-action handlers for slime cards (查看/出售/封存) */
  bindQuickActions(handlers: QuickActionHandlers): void {
    this.quickHandlers = handlers;
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

    // Rarity tag
    const rarityTag = document.createElement('span');
    rarityTag.className = 'ui-slime-rarity';
    rarityTag.textContent = RARITY_LABEL_CN[slime.rarity as Rarity] ?? slime.rarity.charAt(0);
    rarityTag.style.backgroundColor = this.getRarityColor(slime.rarity);

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

    // Stat total display
    const statTotal = slime.stats.health + slime.stats.attack + slime.stats.defense + slime.stats.speed;
    const totalEl = document.createElement('div');
    totalEl.className = 'ui-slime-stat-total';
    totalEl.textContent = `综合: ${statTotal}`;

    // Quick action buttons: 查看 / 出售 / 封存
    const quickActions = document.createElement('div');
    quickActions.className = 'ui-slime-quick-actions';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'ui-slime-quick-btn ui-slime-quick-view';
    viewBtn.textContent = '查看';
    viewBtn.title = '在背包中查看详情';

    const sellBtn = document.createElement('button');
    sellBtn.className = 'ui-slime-quick-btn ui-slime-quick-sell';
    sellBtn.textContent = '出售';
    sellBtn.title = '直接出售该史莱姆';

    const archiveBtn = document.createElement('button');
    archiveBtn.className = 'ui-slime-quick-btn ui-slime-quick-archive';
    archiveBtn.textContent = '封存';
    archiveBtn.title = '封存该史莱姆';

    const cullBtn = document.createElement('button');
    cullBtn.className = 'ui-slime-quick-btn ui-slime-quick-cull';
    cullBtn.textContent = '剔除';
    cullBtn.title = '永久删除该史莱姆（不可撤销）';

    quickActions.append(viewBtn, sellBtn, archiveBtn, cullBtn);
    card.append(swatch, info, rarityTag, hpOuter, totalEl, quickActions);
    return card;
  }

  private getRarityColor(rarity: Rarity): string {
    const map: Record<Rarity, string> = {
      [Rarity.Common]: '#56d364',
      [Rarity.Uncommon]: '#4f8cff',
      [Rarity.Rare]: '#9b59ff',
      [Rarity.Epic]: '#ff6b6b',
      [Rarity.Legendary]: '#ffd700',
    };
    return map[rarity] ?? '#888';
  }

  private computeSlimeSignature(slimes: Slime[]): string {
    return slimes.map(s => `${s.id}:${s.name}:${s.rarity}:${s.color}:${s.stats.health + s.stats.attack + s.stats.defense + s.stats.speed}`).join('|');
  }

  render(state: GameState, maxCapacity: number): void {
    const prevCurrency = parseFloat(this.currencyEl.textContent || '0');
    const prevSlimes = parseInt(this.slimeCountEl.textContent || '0', 10);

    this.currencyEl.textContent = state.currency.toFixed(0);
    this.slimeCountEl.textContent = String(state.slimes.length);

    // Pulse animation on resource change
    if (Math.abs(state.currency - prevCurrency) > 0.5) {
      this.currencyEl.classList.remove('resource-pulse');
      void this.currencyEl.offsetWidth; // reflow to restart animation
      this.currencyEl.classList.add('resource-pulse');
      this.currencyEl.addEventListener('animationend', () => {
        this.currencyEl.classList.remove('resource-pulse');
      }, { once: true });
    }
    if (state.slimes.length !== prevSlimes) {
      this.slimeCountEl.classList.remove('resource-pulse');
      void this.slimeCountEl.offsetWidth;
      this.slimeCountEl.classList.add('resource-pulse');
      this.slimeCountEl.addEventListener('animationend', () => {
        this.slimeCountEl.classList.remove('resource-pulse');
      }, { once: true });
    }
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

    // Update bottom slime list — dirty-check to avoid per-frame DOM rebuild
    const newSig = this.computeSlimeSignature(state.slimes);
    if (newSig !== this.lastSlimeListSignature) {
      this.lastSlimeListSignature = newSig;
      this.slimeListEl.replaceChildren();
      for (const slime of state.slimes) {
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
