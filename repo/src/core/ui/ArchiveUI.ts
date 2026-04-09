import { Rarity } from '../types';
import type { GameState, Slime } from '../types';

export interface ArchiveUICallbacks {
  onUnarchive: (slimeId: string) => void;
  onSell: (slimeId: string) => void;
  onBack: () => void;
}

export class ArchiveUI {
  readonly root: HTMLDivElement;
  private listEl: HTMLDivElement;
  private countEl: HTMLSpanElement;
  private callbacks: ArchiveUICallbacks | null = null;
  private priceEvaluator: ((slime: Slime) => number) | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'archive-panel overlay-panel';

    const backBtn = document.createElement('button');
    backBtn.textContent = '← 返回';
    backBtn.className = 'back-btn';
    backBtn.onclick = () => this.callbacks?.onBack();

    const title = document.createElement('h2');
    title.textContent = '封存库';
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
    card.append(nameRow, statsRow, priceRow, actions);
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
