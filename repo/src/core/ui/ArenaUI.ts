import type { GameState, ArenaId } from '../types';

export interface ArenaCallbacks {
  onBuy: (arenaId: ArenaId) => void;
  onSwitch: (arenaId: ArenaId) => void;
  onBack: () => void;
}

export class ArenaUI {
  readonly root: HTMLDivElement;
  private listEl: HTMLDivElement;
  private callbacks: ArenaCallbacks | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'arena-panel overlay-panel';

    const backBtn = document.createElement('button');
    backBtn.textContent = '← 返回';
    backBtn.className = 'back-btn';
    backBtn.onclick = () => this.callbacks?.onBack();

    const title = document.createElement('h2');
    title.className = 'panel-title';
    title.textContent = '🏔️ 培养场地';

    this.listEl = document.createElement('div');
    this.listEl.className = 'arena-list';

    this.root.append(backBtn, title, this.listEl);
  }

  bind(callbacks: ArenaCallbacks): void {
    this.callbacks = callbacks;
  }

  render(state: GameState): void {
    this.listEl.replaceChildren();

    for (const arena of state.arenas) {
      const card = document.createElement('div');
      card.className = 'arena-card';

      const isActive = arena.id === state.activeArenaId;

      if (isActive) card.classList.add('active');
      if (!arena.owned) card.classList.add('locked');

      // Name
      const nameEl = document.createElement('div');
      nameEl.className = 'arena-name';
      nameEl.textContent = arena.name;
      if (isActive) nameEl.textContent += ' ✅ 当前';

      // Description
      const descEl = document.createElement('div');
      descEl.className = 'arena-desc';
      descEl.textContent = arena.description;

      // Effects
      const effectEl = document.createElement('div');
      effectEl.className = 'arena-effect';
      const bonusParts: string[] = [];
      for (const [stat, val] of Object.entries(arena.statBonus)) {
        if (typeof val === 'number') {
          bonusParts.push(`${stat} +${(val * 100).toFixed(0)}%`);
        }
      }
      if (bonusParts.length > 0) {
        effectEl.textContent = `属性加成: ${bonusParts.join(', ')}`;
      }
      if (arena.mutationBias.preferTraitIds && arena.mutationBias.preferTraitIds.length > 0) {
        effectEl.textContent += ` | 特性偏好: ${arena.mutationBias.preferTraitIds.join(', ')}`;
      }
      if (arena.mutationBias.preferSkillTypes && arena.mutationBias.preferSkillTypes.length > 0) {
        effectEl.textContent += ` | 技能偏好: ${arena.mutationBias.preferSkillTypes.join(', ')}`;
      }
      if (arena.mutationBias.rarityWeightBonus && arena.mutationBias.rarityWeightBonus > 0) {
        effectEl.textContent += ` | 稀有变异 +${(arena.mutationBias.rarityWeightBonus * 100).toFixed(0)}%`;
      }

      card.append(nameEl, descEl, effectEl);

      // Action button
      if (!arena.owned) {
        const priceEl = document.createElement('div');
        priceEl.className = 'arena-price';
        const currLabel = arena.currencyType === 'gold' ? '💰' : '💎';
        priceEl.textContent = `${currLabel} ${arena.price}`;

        const buyBtn = document.createElement('button');
        buyBtn.className = 'arena-buy-btn';
        buyBtn.textContent = '购买';
        buyBtn.onclick = () => this.callbacks?.onBuy(arena.id);

        card.append(priceEl, buyBtn);
      } else if (!isActive) {
        const switchBtn = document.createElement('button');
        switchBtn.className = 'arena-switch-btn';
        switchBtn.textContent = '切换';
        switchBtn.onclick = () => this.callbacks?.onSwitch(arena.id);

        card.append(switchBtn);
      }

      this.listEl.appendChild(card);
    }
  }

  show(): void { this.root.style.display = 'flex'; }
  hide(): void { this.root.style.display = 'none'; }
}
