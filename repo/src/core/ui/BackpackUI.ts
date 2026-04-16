const BASE = import.meta.env.BASE_URL;
import { Rarity, RARITY_LABEL_CN, RARITY_NAME_CN, STAT_CAPS } from '../types';
import type { GameState, Slime } from '../types';
import { AccessorySystem } from '../systems/AccessorySystem';

export interface BackpackCallbacks {
  onSell: (id: string) => void;
  onCull: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onEquipAccessory: (slimeId: string, accessoryId: string) => void;
  onUnequipAccessory: (slimeId: string) => void;
  onBatchSell: (ids: string[]) => void;
  onBatchCull: (ids: string[]) => void;
  onRename: (id: string, newName: string) => void;
  onBack: () => void;
}

type BackpackTab = 'active' | 'archived';
type SortMode = 'rarity' | 'stats';
type RarityFilter = Rarity | 'all';

export class BackpackUI {
  readonly root: HTMLDivElement;
  private callbacks: BackpackCallbacks | null = null;
  private priceEvaluator: ((slime: Slime) => number) | null = null;
  private currentState: GameState | null = null;

  // State
  private currentTab: BackpackTab = 'active';
  private sortMode: SortMode = 'rarity';
  private rarityFilter: RarityFilter = 'all';
  private selectedIds: Set<string> = new Set();
  private selectedSlimeId: string | null = null;

  // DOM elements
  private tabActiveBtn: HTMLButtonElement;
  private tabArchivedBtn: HTMLButtonElement;
  private listEl: HTMLDivElement;
  private detailEl: HTMLDivElement;
  private batchBar: HTMLDivElement;
  private batchSellBtn: HTMLButtonElement;
  private batchCullBtn: HTMLButtonElement;
  private mobileDetailModal: HTMLDivElement;
  private filterBtns: Map<string, HTMLButtonElement> = new Map();
  private sortRarityBtn: HTMLButtonElement;
  private sortStatsBtn: HTMLButtonElement;
  private selectAllCheckbox: HTMLInputElement;

  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private hideCleanupTimer: number | null = null;
  private hideToken = 0;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'backpack-panel overlay-panel';
    this.root.style.display = 'none';

    // --- Header ---
    const header = document.createElement('div');
    header.className = 'backpack-header';

    const title = document.createElement('h2');
    title.className = 'backpack-title';
const backpackTitleIcon = document.createElement('img');
    backpackTitleIcon.src = `${BASE}assets/icon-backpack.png`;
    backpackTitleIcon.alt = '';
    backpackTitleIcon.className = 'btn-icon';
    backpackTitleIcon.onerror = () => { backpackTitleIcon.style.display = 'none'; };
    title.append(backpackTitleIcon, document.createTextNode('🎒 背包'));

    const closeBtn = document.createElement('button');
    closeBtn.className = 'backpack-close-btn pixel-btn';
    closeBtn.textContent = '✕ 关闭';
    closeBtn.onclick = () => this.callbacks?.onBack();
    header.append(title, closeBtn);

    // --- Tabs ---
    const tabs = document.createElement('div');
    tabs.className = 'backpack-tabs';

    this.tabActiveBtn = document.createElement('button');
    this.tabActiveBtn.className = 'backpack-tab-btn active pixel-btn';
    this.tabActiveBtn.dataset['tab'] = 'active';
    this.tabActiveBtn.textContent = '养育中 (0)';
    this.tabActiveBtn.onclick = () => this.switchTab('active');

    this.tabArchivedBtn = document.createElement('button');
    this.tabArchivedBtn.className = 'backpack-tab-btn pixel-btn';
    this.tabArchivedBtn.dataset['tab'] = 'archived';
    this.tabArchivedBtn.textContent = '封存库 (0/10)';
    this.tabArchivedBtn.onclick = () => this.switchTab('archived');

    tabs.append(this.tabActiveBtn, this.tabArchivedBtn);

    // --- Toolbar (filter + sort) ---
    const toolbar = document.createElement('div');
    toolbar.className = 'backpack-toolbar';

    const filterGroup = document.createElement('div');
    filterGroup.className = 'backpack-filter-group';
    const filterLabel = document.createElement('span');
    filterLabel.textContent = '筛选:';
    filterLabel.className = 'backpack-toolbar-label';
    filterGroup.appendChild(filterLabel);

    const filterDefs: Array<{ label: string; value: string }> = [
      { label: '全部', value: 'all' },
      { label: '普', value: Rarity.Common },
      { label: '优', value: Rarity.Uncommon },
      { label: '稀', value: Rarity.Rare },
      { label: '史', value: Rarity.Epic },
      { label: '传', value: Rarity.Legendary },
    ];
    for (const { label, value } of filterDefs) {
      const btn = document.createElement('button');
      btn.className = 'backpack-filter-btn pixel-btn' + (value === 'all' ? ' backpack-filter-active' : '');
      btn.dataset['filter'] = value;
      btn.textContent = label;
      btn.onclick = () => {
        this.rarityFilter = value as RarityFilter;
        for (const [, b] of this.filterBtns) {
          b.classList.toggle('backpack-filter-active', b.dataset['filter'] === value);
        }
        this.renderList();
      };
      this.filterBtns.set(value, btn);
      filterGroup.appendChild(btn);
    }

    const sortGroup = document.createElement('div');
    sortGroup.className = 'backpack-sort-group';
    const sortLabel = document.createElement('span');
    sortLabel.textContent = '排序:';
    sortLabel.className = 'backpack-toolbar-label';
    sortGroup.appendChild(sortLabel);

    this.sortRarityBtn = document.createElement('button');
    this.sortRarityBtn.className = 'backpack-sort-btn pixel-btn backpack-sort-active';
    this.sortRarityBtn.dataset['sort'] = 'rarity';
    this.sortRarityBtn.textContent = '按稀有度';
    this.sortRarityBtn.onclick = () => {
      this.sortMode = 'rarity';
      this.sortRarityBtn.classList.add('backpack-sort-active');
      this.sortStatsBtn.classList.remove('backpack-sort-active');
      this.renderList();
    };

    this.sortStatsBtn = document.createElement('button');
    this.sortStatsBtn.className = 'backpack-sort-btn pixel-btn';
    this.sortStatsBtn.dataset['sort'] = 'stats';
    this.sortStatsBtn.textContent = '按属性总和';
    this.sortStatsBtn.onclick = () => {
      this.sortMode = 'stats';
      this.sortStatsBtn.classList.add('backpack-sort-active');
      this.sortRarityBtn.classList.remove('backpack-sort-active');
      this.renderList();
    };

    sortGroup.append(this.sortRarityBtn, this.sortStatsBtn);
    toolbar.append(filterGroup, sortGroup);

    // --- Batch bar ---
    this.batchBar = document.createElement('div');
    this.batchBar.className = 'backpack-batch-bar';
    this.batchBar.style.display = 'none';

    // Select-all checkbox
    this.selectAllCheckbox = document.createElement('input');
    this.selectAllCheckbox.type = 'checkbox';
    this.selectAllCheckbox.className = 'backpack-select-all';
    this.selectAllCheckbox.title = '全选';
    this.selectAllCheckbox.onchange = () => {
      const slimes = this.getCurrentSlimes();
      if (this.selectAllCheckbox.checked) {
        for (const s of slimes) this.selectedIds.add(s.id);
      } else {
        this.selectedIds.clear();
      }
      this.renderList();
      this.updateBatchBar();
    };

    this.batchSellBtn = document.createElement('button');
    this.batchSellBtn.className = 'backpack-batch-sell-btn pixel-btn pixel-btn-gold';
    this.batchSellBtn.textContent = '批量出售 (0)';
    this.batchSellBtn.onclick = () => {
      const ids = [...this.selectedIds];
      if (ids.length === 0) return;
      this.selectedIds.clear();
      this.updateBatchBar();
      this.callbacks?.onBatchSell(ids);
    };

    this.batchCullBtn = document.createElement('button');
    this.batchCullBtn.className = 'backpack-batch-cull-btn pixel-btn pixel-btn-danger';
    this.batchCullBtn.textContent = '批量剔除 (0)';
    this.batchCullBtn.onclick = () => {
      const ids = [...this.selectedIds];
      if (ids.length === 0) return;
      this.selectedIds.clear();
      this.updateBatchBar();
      this.callbacks?.onBatchCull(ids);
    };

    const batchCancelBtn = document.createElement('button');
    batchCancelBtn.className = 'backpack-batch-cancel-btn pixel-btn';
    batchCancelBtn.textContent = '取消选择';
    batchCancelBtn.onclick = () => {
      this.selectedIds.clear();
      this.updateBatchBar();
      this.renderList();
    };

    this.batchBar.append(this.selectAllCheckbox, this.batchSellBtn, this.batchCullBtn, batchCancelBtn);

    // --- Content (dual column) ---
    const content = document.createElement('div');
    content.className = 'backpack-content';

    this.listEl = document.createElement('div');
    this.listEl.className = 'backpack-list';

    this.detailEl = document.createElement('div');
    this.detailEl.className = 'backpack-detail';
    this.detailEl.textContent = '点击卡片查看详情';

    content.append(this.listEl, this.detailEl);

    // --- Mobile modal ---
    this.mobileDetailModal = document.createElement('div');
    this.mobileDetailModal.className = 'backpack-mobile-modal';
    this.mobileDetailModal.style.display = 'none';

    const mobileModalClose = document.createElement('button');
    mobileModalClose.className = 'backpack-mobile-modal-close pixel-btn';
    mobileModalClose.textContent = '✕ 关闭';
    mobileModalClose.onclick = () => {
      this.mobileDetailModal.style.display = 'none';
    };
    this.mobileDetailModal.appendChild(mobileModalClose);

    const mobileModalContent = document.createElement('div');
    mobileModalContent.className = 'backpack-mobile-modal-content';
    this.mobileDetailModal.appendChild(mobileModalContent);

    this.root.append(header, tabs, toolbar, this.batchBar, content, this.mobileDetailModal);
  }

  bind(callbacks: BackpackCallbacks): void {
    this.callbacks = callbacks;
  }

  setPriceEvaluator(fn: (slime: Slime) => number): void {
    this.priceEvaluator = fn;
  }

  render(state: GameState): void {
    this.currentState = state;
    this.updateTabButtons();
    this.renderList();
    if (this.selectedSlimeId) {
      const slime = this.findSlime(this.selectedSlimeId);
      if (slime) {
        this.renderDetail(slime);
      } else {
        this.selectedSlimeId = null;
        this.detailEl.textContent = '点击卡片查看详情';
      }
    }
  }

  show(): void {
    this.hideToken += 1;
    if (this.hideCleanupTimer !== null) {
      window.clearTimeout(this.hideCleanupTimer);
      this.hideCleanupTimer = null;
    }
    this.root.style.display = 'flex';
    this.root.style.animation = '';
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.callbacks?.onBack();
      }
    };
    document.addEventListener('keydown', this.keydownHandler);
  }

  hide(): void {
    if (this.root.style.display === 'none') {
      this.root.style.animation = '';
      return;
    }

    const hideToken = ++this.hideToken;

    // #273: panel close animation
    this.root.style.animation = 'panelClose 0.2s ease-in forwards';
    const cleanup = () => {
      if (hideToken !== this.hideToken) return;
      this.root.style.display = 'none';
      this.root.style.animation = '';
      this.hideCleanupTimer = null;
      if (this.keydownHandler) {
        document.removeEventListener('keydown', this.keydownHandler);
        this.keydownHandler = null;
      }
    };
    this.root.addEventListener('animationend', cleanup, { once: true });
    this.hideCleanupTimer = window.setTimeout(() => {
      if (this.root.style.display !== 'none') cleanup();
    }, 300);
  }

  // GM helpers
  getTab(): string { return this.currentTab; }
  getFilter(): string { return this.rarityFilter; }
  getSortMode(): string { return this.sortMode; }
  getSelectedIds(): string[] { return [...this.selectedIds]; }
  getSelectedSlimeId(): string | null { return this.selectedSlimeId; }

  /** Open backpack and immediately show detail for given slime id (M48 quick view) */
  viewSlime(id: string): void {
    this.selectedSlimeId = id;
    this.show();
    if (this.currentState) {
      const slime = this.findSlime(id);
      if (slime) {
        this.renderDetail(slime);
      }
    }
  }

  // ------- Private methods -------

  private switchTab(tab: BackpackTab): void {
    this.currentTab = tab;
    this.selectedIds.clear();
    this.selectedSlimeId = null;
    this.tabActiveBtn.classList.toggle('active', tab === 'active');
    this.tabArchivedBtn.classList.toggle('active', tab === 'archived');
    this.updateBatchBar();
    this.updateTabButtons();
    this.renderList();
    this.detailEl.textContent = '点击卡片查看详情';
  }

  private updateTabButtons(): void {
    if (!this.currentState) return;
    const activeCount = this.currentState.slimes.length;
    const archivedCount = this.currentState.archivedSlimes.length;
    const archiveCap = this.currentState.archiveCapacity;
    this.tabActiveBtn.textContent = `养育中 (${activeCount})`;
    this.tabArchivedBtn.textContent = `封存库 (${archivedCount}/${archiveCap})`;
  }

  private getCurrentSlimes(): Slime[] {
    if (!this.currentState) return [];
    return this.currentTab === 'active'
      ? [...this.currentState.slimes]
      : [...this.currentState.archivedSlimes];
  }

  private findSlime(id: string): Slime | null {
    if (!this.currentState) return null;
    return this.currentState.slimes.find(s => s.id === id)
      ?? this.currentState.archivedSlimes.find(s => s.id === id)
      ?? null;
  }

  private getFilteredSortedSlimes(): Slime[] {
    let slimes = this.getCurrentSlimes();
    if (this.rarityFilter !== 'all') {
      slimes = slimes.filter(s => s.rarity === this.rarityFilter);
    }
    slimes.sort((a, b) => {
      if (this.sortMode === 'stats') {
        return this.getTotalStats(b) - this.getTotalStats(a);
      }
      return this.getRarityOrder(b.rarity) - this.getRarityOrder(a.rarity);
    });
    return slimes;
  }

  private renderList(): void {
    const slimes = this.getFilteredSortedSlimes();
    this.listEl.replaceChildren(...slimes.map(s => this.createCard(s)));
  }

  private createCard(slime: Slime): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'backpack-card';
    card.dataset['slimeId'] = slime.id;
    if (this.selectedIds.has(slime.id)) {
      card.classList.add('backpack-card-selected');
    }
    if (this.selectedSlimeId === slime.id) {
      card.classList.add('backpack-card-active');
    }

    // Header row
    const cardHeader = document.createElement('div');
    cardHeader.className = 'backpack-card-header';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'backpack-card-checkbox';
    checkbox.checked = this.selectedIds.has(slime.id);
    checkbox.onclick = (e) => e.stopPropagation();
    checkbox.onchange = () => {
      if (checkbox.checked) {
        this.selectedIds.add(slime.id);
      } else {
        this.selectedIds.delete(slime.id);
      }
      card.classList.toggle('backpack-card-selected', checkbox.checked);
      this.updateBatchBar();
    };

    const colorDot = document.createElement('span');
    colorDot.className = 'backpack-card-color';
    colorDot.style.background = slime.color;

    const nameEl = document.createElement('strong');
    nameEl.className = 'backpack-card-name';
    nameEl.textContent = slime.name;

    const rarityTag = document.createElement('span');
    rarityTag.className = 'rarity-tag backpack-rarity-tag';
    rarityTag.style.backgroundColor = this.getRarityColor(slime.rarity);
    rarityTag.textContent = RARITY_LABEL_CN[slime.rarity] ?? slime.rarity.charAt(0);
    rarityTag.title = RARITY_NAME_CN[slime.rarity] ?? slime.rarity;

    cardHeader.append(checkbox, colorDot, nameEl, rarityTag);

    // Stats row
    const s = slime.stats;
    const statsEl = document.createElement('div');
    statsEl.className = 'backpack-card-stats';
    statsEl.textContent = `生命:${s.health} 攻击:${s.attack} 防御:${s.defense} 速度:${s.speed}`;

    // Extras
    const extrasEl = document.createElement('div');
    extrasEl.className = 'backpack-card-extras';
    if (slime.traits.length > 0) {
      const traitsEl = document.createElement('span');
      traitsEl.className = 'backpack-card-traits';
      traitsEl.textContent = '✨ ' + slime.traits.map(t => t.name).join(', ');
      extrasEl.appendChild(traitsEl);
    }
    if (slime.skills.length > 0) {
      const skillsEl = document.createElement('span');
      skillsEl.className = 'backpack-card-skills';
      skillsEl.textContent = '⚡ ' + slime.skills.map(sk => sk.name).join(', ');
      extrasEl.appendChild(skillsEl);
    }
    if (this.currentState && slime.equippedAccessoryId) {
      const acc = this.currentState.accessories.find(a => a.id === slime.equippedAccessoryId);
      if (acc) {
        const accEl = document.createElement('span');
        accEl.className = 'backpack-card-accessory';
        accEl.textContent = '🎀 ' + acc.name;
        extrasEl.appendChild(accEl);
      }
    }

    // Footer
    const price = this.priceEvaluator ? this.priceEvaluator(slime) : 0;
    const footerEl = document.createElement('div');
    footerEl.className = 'backpack-card-footer';
    footerEl.textContent = `第${slime.generation}代 | 💰${price}`;

    card.append(cardHeader, statsEl, extrasEl, footerEl);

    card.onclick = () => {
      this.selectedSlimeId = slime.id;
      // Update active state on all cards
      const allCards = this.listEl.querySelectorAll<HTMLDivElement>('.backpack-card');
      for (const c of allCards) {
        c.classList.toggle('backpack-card-active', c.dataset['slimeId'] === slime.id);
      }
      this.renderDetail(slime);
      // Mobile: show modal
      if (window.innerWidth <= 600) {
        this.showMobileDetail(slime);
      }
    };

    return card;
  }

  private renderDetail(slime: Slime): void {
    this.detailEl.replaceChildren();
    const s = slime.stats;

    const nameRow = document.createElement('div');
    nameRow.className = 'backpack-detail-name';
    const nameStrong = document.createElement('strong');
    nameStrong.textContent = slime.name;
    const renameBtn = document.createElement('button');
    renameBtn.className = 'backpack-rename-btn pixel-btn';
    renameBtn.textContent = '✏ 改名';
    renameBtn.title = '给史莱姆改名';
    renameBtn.onclick = () => {
      const newName = prompt('输入新名字（1-12个字符）:', slime.name);
      if (newName && newName.trim().length > 0 && newName.trim().length <= 12) {
        this.callbacks?.onRename(slime.id, newName.trim());
      }
    };
    const raritySpan = document.createElement('span');
    raritySpan.className = 'rarity-tag';
    raritySpan.style.background = this.getRarityColor(slime.rarity);
    raritySpan.textContent = RARITY_NAME_CN[slime.rarity] ?? slime.rarity;
    nameRow.append(nameStrong, renameBtn, raritySpan);

    const colorRow = document.createElement('div');
    colorRow.className = 'backpack-detail-color';
    const colorSwatch = document.createElement('span');
    colorSwatch.className = 'backpack-color-swatch';
    colorSwatch.style.background = slime.color;
    colorRow.appendChild(colorSwatch);
    colorRow.appendChild(document.createTextNode(' ' + slime.color));

    const genPrice = document.createElement('div');
    genPrice.className = 'backpack-detail-gen';
    const price = this.priceEvaluator ? this.priceEvaluator(slime) : 0;
    genPrice.textContent = `世代: ${slime.generation} | 估价: 💰${price}`;

    // Stats with bars
    const statsSection = document.createElement('div');
    statsSection.className = 'backpack-detail-stats';
    const caps = STAT_CAPS[slime.rarity];
    const statDefs: Array<{ label: string; value: number; max: number }> = [
      { label: '生命', value: s.health, max: caps.health },
      { label: '攻击', value: s.attack, max: caps.attack },
      { label: '防御', value: s.defense, max: caps.defense },
      { label: '速度', value: s.speed, max: caps.speed },
      { label: '变异', value: Math.round((s.mut ?? 0) * 100), max: Math.round(caps.mut * 100) },
    ];
    for (const { label, value, max } of statDefs) {
      const row = document.createElement('div');
      row.className = 'backpack-stat-row';
      const labelEl = document.createElement('span');
      labelEl.className = 'backpack-stat-label';
      labelEl.textContent = label;
      const barOuter = document.createElement('div');
      barOuter.className = 'backpack-stat-bar-outer';
      const barInner = document.createElement('div');
      barInner.className = 'backpack-stat-bar-inner';
      barInner.style.width = `${Math.min(100, (value / max) * 100)}%`;
      barOuter.appendChild(barInner);
      const valEl = document.createElement('span');
      valEl.className = 'backpack-stat-value';
      valEl.textContent = String(label === '变异' ? `${value}%` : value);
      row.append(labelEl, barOuter, valEl);
      statsSection.appendChild(row);
    }

    // Traits
    const traitsSection = document.createElement('div');
    traitsSection.className = 'backpack-detail-traits';
    const traitsTitle = document.createElement('div');
    traitsTitle.className = 'backpack-detail-section-title';
    traitsTitle.textContent = '✨ 特性';
    traitsSection.appendChild(traitsTitle);
    if (slime.traits.length === 0) {
      const noTraits = document.createElement('div');
      noTraits.className = 'backpack-detail-empty';
      noTraits.textContent = '无特性';
      traitsSection.appendChild(noTraits);
    } else {
      for (const trait of slime.traits) {
        const traitRow = document.createElement('div');
        traitRow.className = 'backpack-detail-trait';
        traitRow.innerHTML = `<span class="rarity-tag" style="background:${this.getRarityColor(trait.rarity)}">${RARITY_LABEL_CN[trait.rarity] ?? trait.rarity.charAt(0)}</span> <strong>${trait.name}</strong> — ${trait.description}`;
        traitsSection.appendChild(traitRow);
      }
    }

    // Skills
    const skillsSection = document.createElement('div');
    skillsSection.className = 'backpack-detail-skills';
    const skillsTitle = document.createElement('div');
    skillsTitle.className = 'backpack-detail-section-title';
    skillsTitle.textContent = '⚡ 技能';
    skillsSection.appendChild(skillsTitle);
    if (slime.skills.length === 0) {
      const noSkills = document.createElement('div');
      noSkills.className = 'backpack-detail-empty';
      noSkills.textContent = '无技能';
      skillsSection.appendChild(noSkills);
    } else {
      for (const skill of slime.skills) {
        const skillRow = document.createElement('div');
        skillRow.className = 'backpack-detail-skill';
        skillRow.innerHTML = `<strong>${skill.name}</strong> [${skill.type}] 伤害:${skill.damage} 冷却:${skill.cooldown}`;
        skillsSection.appendChild(skillRow);
      }
    }

    // Accessory section
    const accSection = document.createElement('div');
    accSection.className = 'backpack-detail-accessory';
    const accTitle = document.createElement('div');
    accTitle.className = 'backpack-detail-section-title';
    accTitle.textContent = '🎀 饰品';
    accSection.appendChild(accTitle);
    if (this.currentState) {
      const equipped = AccessorySystem.getEquipped(this.currentState, slime.id);
      if (equipped) {
        const accLabel = document.createElement('div');
        accLabel.className = 'backpack-detail-acc-label';
        accLabel.textContent = `${equipped.name} — ${equipped.effect.description}`;
        const unequipBtn = document.createElement('button');
        unequipBtn.className = 'backpack-detail-unequip-btn pixel-btn';
        unequipBtn.textContent = '卸下饰品';
        unequipBtn.onclick = () => this.callbacks?.onUnequipAccessory(slime.id);
        accSection.append(accLabel, unequipBtn);
      } else {
        const available = AccessorySystem.getUnequipped(this.currentState);
        if (available.length > 0) {
          const select = document.createElement('select');
          select.className = 'backpack-accessory-select';
          const defaultOpt = document.createElement('option');
          defaultOpt.value = '';
          defaultOpt.textContent = '选择饰品...';
          select.appendChild(defaultOpt);
          for (const acc of available) {
            const opt = document.createElement('option');
            opt.value = acc.id;
            opt.textContent = `${acc.name} (${acc.effect.description})`;
            select.appendChild(opt);
          }
          const equipBtn = document.createElement('button');
          equipBtn.className = 'backpack-detail-equip-btn pixel-btn';
          equipBtn.textContent = '装备';
          equipBtn.onclick = () => {
            if (select.value) this.callbacks?.onEquipAccessory(slime.id, select.value);
          };
          accSection.append(select, equipBtn);
        } else {
          const noAcc = document.createElement('div');
          noAcc.className = 'backpack-detail-empty';
          noAcc.textContent = '无可用饰品';
          accSection.appendChild(noAcc);
        }
      }
    }

    // Action buttons
    const actionsSection = document.createElement('div');
    actionsSection.className = 'backpack-detail-actions';

    if (this.currentTab === 'active') {
      const sellBtn = document.createElement('button');
      sellBtn.className = 'backpack-detail-sell-btn pixel-btn pixel-btn-gold';
      sellBtn.textContent = `出售 (💰${price})`;
      sellBtn.onclick = () => this.callbacks?.onSell(slime.id);

      const cullBtn = document.createElement('button');
      cullBtn.className = 'backpack-detail-cull-btn pixel-btn pixel-btn-danger';
      cullBtn.textContent = '剔除';
      cullBtn.onclick = () => this.callbacks?.onCull(slime.id);

      const archiveBtn = document.createElement('button');
      archiveBtn.className = 'backpack-detail-archive-btn pixel-btn';
      archiveBtn.textContent = '封存';
      if (this.currentState && this.currentState.archivedSlimes.length >= this.currentState.archiveCapacity) {
        archiveBtn.disabled = true;
        archiveBtn.title = '封存库已满';
      }
      archiveBtn.onclick = () => this.callbacks?.onArchive(slime.id);

      actionsSection.append(sellBtn, cullBtn, archiveBtn);
    } else {
      const unarchiveBtn = document.createElement('button');
      unarchiveBtn.className = 'backpack-detail-unarchive-btn pixel-btn';
      unarchiveBtn.textContent = '解封';
      unarchiveBtn.onclick = () => this.callbacks?.onUnarchive(slime.id);

      const sellBtn = document.createElement('button');
      sellBtn.className = 'backpack-detail-sell-btn pixel-btn pixel-btn-gold';
      sellBtn.textContent = `出售 (💰${price})`;
      sellBtn.onclick = () => this.callbacks?.onSell(slime.id);

      actionsSection.append(unarchiveBtn, sellBtn);
    }

    this.detailEl.append(nameRow, colorRow, genPrice, statsSection, traitsSection, skillsSection, accSection, actionsSection);
  }

  private showMobileDetail(slime: Slime): void {
    const content = this.mobileDetailModal.querySelector('.backpack-mobile-modal-content');
    if (!content) return;
    content.replaceChildren();
    // Clone detailEl content into modal
    for (const child of Array.from(this.detailEl.children)) {
      content.appendChild(child.cloneNode(true));
    }
    // Re-bind buttons in mobile modal
    const sellBtn = content.querySelector<HTMLButtonElement>('.backpack-detail-sell-btn');
    if (sellBtn) sellBtn.onclick = () => { this.callbacks?.onSell(slime.id); this.mobileDetailModal.style.display = 'none'; };
    const cullBtn = content.querySelector<HTMLButtonElement>('.backpack-detail-cull-btn');
    if (cullBtn) cullBtn.onclick = () => { this.callbacks?.onCull(slime.id); this.mobileDetailModal.style.display = 'none'; };
    const archiveBtn = content.querySelector<HTMLButtonElement>('.backpack-detail-archive-btn');
    if (archiveBtn) archiveBtn.onclick = () => { this.callbacks?.onArchive(slime.id); this.mobileDetailModal.style.display = 'none'; };
    const unarchiveBtn = content.querySelector<HTMLButtonElement>('.backpack-detail-unarchive-btn');
    if (unarchiveBtn) unarchiveBtn.onclick = () => { this.callbacks?.onUnarchive(slime.id); this.mobileDetailModal.style.display = 'none'; };
    this.mobileDetailModal.style.display = 'flex';
  }

  private updateBatchBar(): void {
    const count = this.selectedIds.size;
    if (count > 0) {
      this.batchBar.style.display = 'flex';
      this.batchSellBtn.textContent = `批量出售 (${count})`;
      this.batchCullBtn.textContent = `批量剔除 (${count})`;
      // Update select-all state
      const total = this.getFilteredSortedSlimes().length;
      this.selectAllCheckbox.checked = count === total && total > 0;
      this.selectAllCheckbox.indeterminate = count > 0 && count < total;
    } else {
      this.batchBar.style.display = 'none';
      this.selectAllCheckbox.checked = false;
      this.selectAllCheckbox.indeterminate = false;
    }
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
