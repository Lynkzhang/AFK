import type { GameState, StageProgress } from '../types';
import { STAGES } from '../combat/StageData';

export interface StageSelectCallbacks {
  onSelectStage: (stageId: string) => void;
  onBack: () => void;
}

export class StageSelectUI {
  readonly root: HTMLDivElement;
  private listEl: HTMLDivElement;
  private callbacks: StageSelectCallbacks | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'stage-select-panel overlay-panel';

    const title = document.createElement('h2');
    title.textContent = '第一章：史莱姆平原';
    title.className = 'panel-title';

    const backBtn = document.createElement('button');
    backBtn.textContent = '← 返回';
    backBtn.className = 'back-btn';
    backBtn.onclick = () => this.callbacks?.onBack();

    this.listEl = document.createElement('div');
    this.listEl.className = 'stage-list';

    this.root.append(backBtn, title, this.listEl);
  }

  bind(callbacks: StageSelectCallbacks): void {
    this.callbacks = callbacks;
  }

  render(state: GameState): void {
    this.listEl.replaceChildren();

    const stageIds = Array.from(STAGES.keys()).sort((a, b) => {
      const [ac, as_] = a.split('-').map(Number);
      const [bc, bs_] = b.split('-').map(Number);
      if (ac !== bc) return ac - bc;
      return as_ - bs_;
    });

    for (const stageId of stageIds) {
      const stage = STAGES.get(stageId)!;
      const progress: StageProgress | undefined = state.stageProgress[stageId];
      const stars = progress?.stars ?? 0;

      const card = document.createElement('div');
      card.className = 'stage-card';
      if (stars > 0) card.classList.add('cleared');

      const nameEl = document.createElement('div');
      nameEl.className = 'stage-name';
      nameEl.textContent = `${stage.chapter}-${stage.stage}`;
      if (stage.isBoss) nameEl.textContent += ' 👑';
      if (stage.isElite) nameEl.textContent += ' ⚔';

      const starsEl = document.createElement('div');
      starsEl.className = 'stage-stars';
      starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);

      const rewardEl = document.createElement('div');
      rewardEl.className = 'stage-reward';
      rewardEl.textContent = `💰${stage.reward.gold}`;
      if (stage.reward.crystals > 0) rewardEl.textContent += ` 💎${stage.reward.crystals}`;

      card.append(nameEl, starsEl, rewardEl);
      card.onclick = () => this.callbacks?.onSelectStage(stageId);
      this.listEl.appendChild(card);
    }
  }

  show(): void { this.root.style.display = 'flex'; }
  hide(): void { this.root.style.display = 'none'; }
}
