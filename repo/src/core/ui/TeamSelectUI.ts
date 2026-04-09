import type { GameState, Slime } from '../types';

export interface TeamSelectCallbacks {
  onConfirm: (selectedSlimeIds: string[]) => void;
  onBack: () => void;
}

export class TeamSelectUI {
  readonly root: HTMLDivElement;
  private listEl: HTMLDivElement;
  private confirmBtn: HTMLButtonElement;
  private selectedCountEl: HTMLSpanElement;
  private callbacks: TeamSelectCallbacks | null = null;
  private selected: Set<string> = new Set();
  private stageLabel: HTMLDivElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'team-select-panel overlay-panel';

    const backBtn = document.createElement('button');
    backBtn.textContent = '← 返回';
    backBtn.className = 'back-btn';
    backBtn.onclick = () => this.callbacks?.onBack();

    this.stageLabel = document.createElement('div');
    this.stageLabel.className = 'stage-label';

    const title = document.createElement('h2');
    title.textContent = '选择队伍（最多4只）';
    title.className = 'panel-title';

    const headerRow = document.createElement('div');
    headerRow.className = 'team-header';
    this.selectedCountEl = document.createElement('span');
    this.selectedCountEl.textContent = '已选: 0/4';
    this.confirmBtn = document.createElement('button');
    this.confirmBtn.textContent = '开始战斗';
    this.confirmBtn.className = 'confirm-btn';
    this.confirmBtn.onclick = () => {
      if (this.selected.size > 0) {
        this.callbacks?.onConfirm(Array.from(this.selected));
      }
    };
    headerRow.append(this.selectedCountEl, this.confirmBtn);

    this.listEl = document.createElement('div');
    this.listEl.className = 'team-list';

    this.root.append(backBtn, this.stageLabel, title, headerRow, this.listEl);
  }

  bind(callbacks: TeamSelectCallbacks): void {
    this.callbacks = callbacks;
  }

  render(state: GameState, stageId: string): void {
    this.selected.clear();
    this.stageLabel.textContent = `关卡: ${stageId}`;
    this.updateCount();
    this.listEl.replaceChildren();

    for (const slime of state.archivedSlimes) {
      const card = this.createSlimeCard(slime);
      this.listEl.appendChild(card);
    }
  }

  private createSlimeCard(slime: Slime): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'team-slime-card';

    const nameRow = document.createElement('div');
    nameRow.className = 'team-slime-name';
    nameRow.innerHTML = `<strong>${slime.name}</strong> <span class="rarity-tag" style="background:${this.rarityColor(slime.rarity)}">${slime.rarity}</span>`;

    const statsRow = document.createElement('div');
    statsRow.className = 'team-slime-stats';
    const s = slime.stats;
    statsRow.textContent = `HP:${s.health} ATK:${s.attack} DEF:${s.defense} SPD:${s.speed}`;

    const skillsRow = document.createElement('div');
    skillsRow.className = 'team-slime-skills';
    skillsRow.textContent = `技能: ${slime.skills.map(sk => sk.name).join(', ') || '无'}`;

    card.append(nameRow, statsRow, skillsRow);

    card.onclick = () => {
      if (this.selected.has(slime.id)) {
        this.selected.delete(slime.id);
        card.classList.remove('selected');
      } else if (this.selected.size < 4) {
        this.selected.add(slime.id);
        card.classList.add('selected');
      }
      this.updateCount();
    };

    return card;
  }

  private updateCount(): void {
    this.selectedCountEl.textContent = `已选: ${this.selected.size}/4`;
    this.confirmBtn.disabled = this.selected.size === 0;
  }

  private rarityColor(rarity: string): string {
    const colors: Record<string, string> = {
      Common: '#56d364', Uncommon: '#4f8cff', Rare: '#9b59ff', Epic: '#ff6b6b', Legendary: '#ffd700',
    };
    return colors[rarity] ?? '#888';
  }

  show(): void { this.root.style.display = 'flex'; }
  hide(): void { this.root.style.display = 'none'; }
}
