const BASE = import.meta.env.BASE_URL;
import { Rarity } from '../types';
import type { GameState, Slime } from '../types';
import { AccessorySystem } from '../systems/AccessorySystem';

export interface ArchiveUICallbacks {
  onUnarchive: (slimeId: string) => void;
  onSell: (slimeId: string) => void;
  onEquipAccessory: (slimeId: string, accessoryId: string) => void;
  onUnequipAccessory: (slimeId: string) => void;
  onBack: () => void;
}

export class ArchiveUI {
  readonly root: HTMLDivElement;
  private listEl: HTMLDivElement;
  private countEl: HTMLSpanElement;
  private callbacks: ArchiveUICallbacks | null = null;
  private priceEvaluator: ((slime: Slime) => number) | null = null;
  private currentState: GameState | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'archive-panel overlay-panel';

    const backBtn = document.createElement('button');
    backBtn.textContent = '← 返回';
    backBtn.className = 'back-btn';
    backBtn.onclick = () => this.callbacks?.onBack();

    const title = document.createElement('h2');
const archiveTitleIcon = document.createElement('img');
    archiveTitleIcon.src = `${BASE}assets/icon-archive.png`;
    archiveTitleIcon.alt = '';
    archiveTitleIcon.className = 'btn-icon';
    archiveTitleIcon.onerror = () => { archiveTitleIcon.style.display = 'none'; };
    title.append(archiveTitleIcon, document.createTextNode('封存库'));
    title.className = 'panel-title';

    this.countEl = document.createElement('span');
    this.countEl.className = 'archive-count';

    const header = document.createElement('div');
    header.className = 'archive-header';
    header.append(title, this.countEl);

    this.listEl = document.createElement('div');
    this.listEl.className = 'archive-list';

    this.root.append(backBtn, header, this.listEl);
  }

  bind(callbacks: ArchiveUICallbacks): void {
    this.callbacks = callbacks;
  }

  setPriceEvaluator(fn: (slime: Slime) => number): void {
    this.priceEvaluator = fn;
  }

  render(state: GameState): void {
    this.currentState = state;
    this.countEl.textContent = `${state.archivedSlimes.length} / ${state.archiveCapacity}`;
    this.listEl.replaceChildren();
    for (const slime of state.archivedSlimes) {
      this.listEl.appendChild(this.createCard(slime));
    }
  }

  private createCard(slime: Slime): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'archive-slime-card';

    const nameRow = document.createElement('div');
    nameRow.className = 'archive-slime-name';
    nameRow.innerHTML = `<strong>${slime.name}</strong> <span class="rarity-tag" style="background:${this.rarityColor(slime.rarity)}">${slime.rarity}</span>`;

    const statsRow = document.createElement('div');
    statsRow.className = 'archive-slime-stats';
    const s = slime.stats;
    statsRow.textContent = `HP:${s.health} ATK:${s.attack} DEF:${s.defense} SPD:${s.speed}`;

    const price = this.priceEvaluator ? this.priceEvaluator(slime) : 0;
    const priceRow = document.createElement('div');
    priceRow.className = 'archive-slime-price';
    priceRow.textContent = `估价: 💰${price}`;

    const actions = document.createElement('div');
    actions.className = 'archive-slime-actions';

    const unarchiveBtn = document.createElement('button');
    unarchiveBtn.textContent = '解封';
    unarchiveBtn.className = 'archive-action-btn';
    unarchiveBtn.onclick = () => this.callbacks?.onUnarchive(slime.id);

    const sellBtn = document.createElement('button');
    sellBtn.textContent = `出售 (💰${price})`;
    sellBtn.className = 'archive-action-btn sell-btn';
    sellBtn.onclick = () => this.callbacks?.onSell(slime.id);

    actions.append(unarchiveBtn, sellBtn);

    // Accessory section
    const accSection = document.createElement('div');
    accSection.className = 'archive-accessory-section';
    if (this.currentState) {
      const equipped = AccessorySystem.getEquipped(this.currentState, slime.id);
      if (equipped) {
        const accLabel = document.createElement('span');
        accLabel.className = 'equipped-accessory';
        accLabel.textContent = `🎀 ${equipped.name} (${equipped.effect.description})`;
        const unequipBtn = document.createElement('button');
        unequipBtn.textContent = '卸下';
        unequipBtn.className = 'archive-action-btn';
        unequipBtn.onclick = () => this.callbacks?.onUnequipAccessory(slime.id);
        accSection.append(accLabel, unequipBtn);
      } else {
        const available = AccessorySystem.getUnequipped(this.currentState);
        if (available.length > 0) {
          const select = document.createElement('select');
          select.className = 'accessory-select';
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
          equipBtn.textContent = '装备';
          equipBtn.className = 'archive-action-btn';
          equipBtn.onclick = () => {
            if (select.value) this.callbacks?.onEquipAccessory(slime.id, select.value);
          };
          accSection.append(select, equipBtn);
        } else {
          const noAcc = document.createElement('span');
          noAcc.textContent = '无可用饰品';
          accSection.appendChild(noAcc);
        }
      }
    }

    card.append(nameRow, statsRow, priceRow, actions, accSection);
    return card;
  }

  private rarityColor(rarity: Rarity): string {
    const colors: Record<Rarity, string> = {
      [Rarity.Common]: '#56d364',
      [Rarity.Uncommon]: '#4f8cff',
      [Rarity.Rare]: '#9b59ff',
      [Rarity.Epic]: '#ff6b6b',
      [Rarity.Legendary]: '#ffd700',
    };
    return colors[rarity];
  }

  show(): void {
    this.root.style.display = 'flex';
  }
  hide(): void {
    this.root.style.display = 'none';
  }
}
