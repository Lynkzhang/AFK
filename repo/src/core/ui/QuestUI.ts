import type { GameState, QuestCategory, Slime } from '../types';
import { Rarity } from '../types';
import { QuestSystem } from '../systems/QuestSystem';

interface QuestUIHandlers {
  onClaim: (questId: string) => void;
  onSubmitBounty: (questId: string, slimeId: string) => void;
  onBack: () => void;
}

function slimeTotalStats(s: Slime): number {
  return s.stats.health + s.stats.attack + s.stats.defense + s.stats.speed;
}

function meetsRarity(s: Slime, minRarity: Rarity): boolean {
  const order: Record<Rarity, number> = {
    [Rarity.Common]: 1,
    [Rarity.Uncommon]: 2,
    [Rarity.Rare]: 3,
    [Rarity.Epic]: 4,
    [Rarity.Legendary]: 5,
  };
  return (order[s.rarity] ?? 0) >= (order[minRarity] ?? 0);
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
const questTitleIcon = document.createElement('img');
    questTitleIcon.src = '/assets/icon-quest.png';
    questTitleIcon.alt = '';
    questTitleIcon.className = 'btn-icon';
    questTitleIcon.onerror = () => { questTitleIcon.style.display = 'none'; };
    title.append(questTitleIcon, document.createTextNode('\u4efb\u52a1\u9762\u677f'));
    this.root.appendChild(title);

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.className = 'quest-tabs';
    const categories: QuestCategory[] = ['daily', 'achievement', 'bounty'];
    const tabLabels: Record<QuestCategory, string> = {
      daily: '\u65e5\u5e38',
      achievement: '\u6210\u5c31',
      bounty: '\u60ac\u8d4f',
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
      empty.textContent = '\u6682\u65e0\u4efb\u52a1';
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
      statusEl.textContent = q.status === 'claimed' ? '\u5df2\u9886\u53d6' : q.status === 'completed' ? '\u5df2\u5b8c\u6210' : '\u8fdb\u884c\u4e2d';
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
      if (q.template.reward.gold) parts.push(`${q.template.reward.gold} \u91d1\u5e01`);
      if (q.template.reward.crystal) parts.push(`${q.template.reward.crystal} \u6676\u77f3`);
      rewardEl.textContent = '\u5956\u52b1: ' + parts.join(', ');

      // Action button
      const actions = document.createElement('div');
      actions.className = 'quest-actions';

      if (q.status === 'completed') {
        const claimBtn = document.createElement('button');
        claimBtn.className = 'quest-claim-btn';
        claimBtn.textContent = '\u9886\u53d6';
        claimBtn.onclick = () => {
          this.handlers?.onClaim(q.questId);
        };
        actions.appendChild(claimBtn);
      }

      if (q.status === 'active' && q.template.category === 'bounty') {
        // Show submit options for bounty quests — properly check criteria
        const allSlimes = [...state.slimes, ...state.archivedSlimes];
        const criteria = q.template.bountyCriteria;
        const eligible = allSlimes.filter((s) => {
          if (criteria?.minRarity && !meetsRarity(s, criteria.minRarity)) return false;
          if (criteria?.minTotalStats && slimeTotalStats(s) < criteria.minTotalStats) return false;
          if (criteria?.requiredTraitId && !s.traits.some((tr) => tr.id === criteria.requiredTraitId)) return false;
          return true;
        });

        if (eligible.length > 0) {
          // Create a select dropdown for choosing which slime to submit
          const select = document.createElement('select');
          select.className = 'bounty-slime-select';
          for (const s of eligible) {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.name} (${s.rarity}, \u603b${slimeTotalStats(s)})`;
            select.appendChild(opt);
          }

          const submitBtn = document.createElement('button');
          submitBtn.className = 'quest-submit-btn';
          submitBtn.textContent = '\u63d0\u4ea4\u53f2\u83b1\u59c6';
          submitBtn.onclick = () => {
            if (select.value) {
              this.handlers?.onSubmitBounty(q.questId, select.value);
            }
          };
          actions.append(select, submitBtn);
        } else {
          const hintEl = document.createElement('span');
          hintEl.className = 'bounty-no-eligible';
          hintEl.textContent = '\u65e0\u7b26\u5408\u6761\u4ef6\u7684\u53f2\u83b1\u59c6';
          actions.appendChild(hintEl);
        }
      }

      card.append(header, desc, progressContainer, progressText, rewardEl, actions);
      listEl.appendChild(card);
    }
    this.root.appendChild(listEl);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.textContent = '\u8fd4\u56de';
    backBtn.onclick = () => this.handlers?.onBack();
    this.root.appendChild(backBtn);
  }
}
