import type { GameState, QuestCategory } from '../types';
import { QuestSystem } from '../systems/QuestSystem';

interface QuestUIHandlers {
  onClaim: (questId: string) => void;
  onSubmitBounty: (questId: string, slimeId: string) => void;
  onBack: () => void;
}

export class QuestUI {
  readonly root: HTMLDivElement;
  private handlers: QuestUIHandlers | null = null;
  private activeTab: QuestCategory = 'daily';

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'quest-panel overlay-panel';
  }

  bind(handlers: QuestUIHandlers): void {
    this.handlers = handlers;
  }

  show(): void {
    this.root.style.display = 'flex';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  render(state: GameState): void {
    this.root.replaceChildren();

    const title = document.createElement('h2');
    title.textContent = 'Quest Board';
    this.root.appendChild(title);

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.className = 'quest-tabs';
    const categories: QuestCategory[] = ['daily', 'achievement', 'bounty'];
    const tabLabels: Record<QuestCategory, string> = {
      daily: 'Daily',
      achievement: 'Achievement',
      bounty: 'Bounty',
    };

    for (const cat of categories) {
      const tab = document.createElement('button');
      tab.className = 'quest-tab' + (this.activeTab === cat ? ' active' : '');
      tab.textContent = tabLabels[cat];
      tab.dataset['category'] = cat;
      tab.onclick = () => {
        this.activeTab = cat;
        this.render(state);
      };
      tabBar.appendChild(tab);
    }
    this.root.appendChild(tabBar);

    // Quest list
    const quests = QuestSystem.getQuests(state).filter((q) => q.template.category === this.activeTab);
    const listEl = document.createElement('div');
    listEl.className = 'quest-list';

    if (quests.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'quest-empty';
      empty.textContent = 'No quests available';
      listEl.appendChild(empty);
    }

    for (const q of quests) {
      const card = document.createElement('div');
      card.className = 'quest-card' + (q.status === 'claimed' ? ' claimed' : q.status === 'completed' ? ' completed' : '');
      card.dataset['questId'] = q.questId;

      const header = document.createElement('div');
      header.className = 'quest-header';
      const nameEl = document.createElement('strong');
      nameEl.className = 'quest-name';
      nameEl.textContent = q.template.name;
      const statusEl = document.createElement('span');
      statusEl.className = 'quest-status';
      statusEl.textContent = q.status === 'claimed' ? 'Claimed' : q.status === 'completed' ? 'Complete!' : 'In Progress';
      header.append(nameEl, statusEl);

      const desc = document.createElement('div');
      desc.className = 'quest-desc';
      desc.textContent = q.template.description;

      // Progress bar
      const progressContainer = document.createElement('div');
      progressContainer.className = 'quest-progress-container';
      const progressBar = document.createElement('div');
      progressBar.className = 'quest-progress-bar';
      const pct = Math.min(100, (q.currentValue / q.template.targetValue) * 100);
      progressBar.style.width = pct + '%';
      progressContainer.appendChild(progressBar);

      const progressText = document.createElement('span');
      progressText.className = 'quest-progress-text';
      progressText.textContent = `${Math.min(q.currentValue, q.template.targetValue)} / ${q.template.targetValue}`;

      // Reward display
      const rewardEl = document.createElement('div');
      rewardEl.className = 'quest-reward';
      const parts: string[] = [];
      if (q.template.reward.gold) parts.push(`${q.template.reward.gold} Gold`);
      if (q.template.reward.crystal) parts.push(`${q.template.reward.crystal} Crystal`);
      rewardEl.textContent = 'Reward: ' + parts.join(', ');

      // Action button
      const actions = document.createElement('div');
      actions.className = 'quest-actions';

      if (q.status === 'completed') {
        const claimBtn = document.createElement('button');
        claimBtn.className = 'quest-claim-btn';
        claimBtn.textContent = 'Claim';
        claimBtn.onclick = () => {
          this.handlers?.onClaim(q.questId);
        };
        actions.appendChild(claimBtn);
      }

      if (q.status === 'active' && q.template.category === 'bounty') {
        // Show submit options for bounty quests
        const allSlimes = [...state.slimes, ...state.archivedSlimes];
        if (allSlimes.length > 0) {
          const submitBtn = document.createElement('button');
          submitBtn.className = 'quest-submit-btn';
          submitBtn.textContent = 'Submit Slime';
          submitBtn.onclick = () => {
            // Submit first eligible slime
            for (const s of allSlimes) {
              const submitted = this.handlers !== null;
              if (submitted) {
                this.handlers!.onSubmitBounty(q.questId, s.id);
                break;
              }
            }
          };
          actions.appendChild(submitBtn);
        }
      }

      card.append(header, desc, progressContainer, progressText, rewardEl, actions);
      listEl.appendChild(card);
    }
    this.root.appendChild(listEl);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.textContent = 'Back';
    backBtn.onclick = () => this.handlers?.onBack();
    this.root.appendChild(backBtn);
  }
}
