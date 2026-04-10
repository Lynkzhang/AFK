import type { GameState, StageProgress } from '../types';
import { STAGES } from '../combat/StageData';

export interface StageSelectCallbacks {
  onSelectStage: (stageId: string) => void;
  onBack: () => void;
}

const CHAPTER_NAMES: Record<number, string> = {
  1: '第一章：史莱姆平原',
  2: '第二章：火焰洞窟',
  3: '第三章：寒冰深渊',
};

export class StageSelectUI {
  readonly root: HTMLDivElement;
  private tabsEl: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private listEl: HTMLDivElement;
  private callbacks: StageSelectCallbacks | null = null;
  private currentChapter = 1;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'stage-select-panel overlay-panel';

    this.titleEl = document.createElement('h2');
    this.titleEl.textContent = CHAPTER_NAMES[1]!;
    this.titleEl.className = 'panel-title';

    const backBtn = document.createElement('button');
    backBtn.textContent = '← 返回';
    backBtn.className = 'back-btn';
    backBtn.onclick = () => this.callbacks?.onBack();

    this.tabsEl = document.createElement('div');
    this.tabsEl.className = 'chapter-tabs';

    this.listEl = document.createElement('div');
    this.listEl.className = 'stage-list';

    this.root.append(backBtn, this.tabsEl, this.titleEl, this.listEl);
  }

  bind(callbacks: StageSelectCallbacks): void {
    this.callbacks = callbacks;
  }

  render(state: GameState): void {
    const unlockedChapters = state.unlockedChapters ?? 1;

    // Render chapter tabs
    this.tabsEl.replaceChildren();
    const chapterIds = [1, 2, 3];
    for (const ch of chapterIds) {
      const tab = document.createElement('button');
      tab.className = 'chapter-tab';
      if (ch === this.currentChapter) tab.classList.add('active');
      if (ch > unlockedChapters) {
        tab.classList.add('locked');
        tab.textContent = `${CHAPTER_NAMES[ch]} 🔒`;
        tab.disabled = true;
      } else {
        tab.textContent = CHAPTER_NAMES[ch]!;
        tab.onclick = () => {
          this.currentChapter = ch;
          this.render(state);
        };
      }
      this.tabsEl.appendChild(tab);
    }

    // Update title
    this.titleEl.textContent = CHAPTER_NAMES[this.currentChapter] ?? `第${this.currentChapter}章`;

    // Render stage list for current chapter
    this.listEl.replaceChildren();

    const stageIds = Array.from(STAGES.keys())
      .filter((id) => {
        const stage = STAGES.get(id)!;
        return stage.chapter === this.currentChapter;
      })
      .sort((a, b) => {
        const [, as_] = a.split('-').map(Number);
        const [, bs_] = b.split('-').map(Number);
        return as_! - bs_!;
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
