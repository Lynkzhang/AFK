import type { GameState, QuestTemplate, QuestProgress, QuestReward, Slime, ItemType } from '../types';
import { Rarity } from '../types';
import { ItemSystem } from './ItemSystem';

// Quest Templates

const DAILY_QUESTS: QuestTemplate[] = [
  {
    id: 'daily-split-3',
    name: 'Daily Splitter',
    description: 'Trigger 3 slime splits today',
    category: 'daily',
    conditionKey: 'daily_splits',
    targetValue: 3,
    reward: { gold: 50 },
  },
  {
    id: 'daily-sell-2',
    name: 'Daily Seller',
    description: 'Sell 2 slimes today',
    category: 'daily',
    conditionKey: 'daily_sells',
    targetValue: 2,
    reward: { gold: 80 },
  },
  {
    id: 'daily-battle-1',
    name: 'Daily Fighter',
    description: 'Win 1 battle today',
    category: 'daily',
    conditionKey: 'daily_battles_won',
    targetValue: 1,
    reward: { gold: 100 },
  },
  {
    id: 'daily-archive-1',
    name: 'Daily Archivist',
    description: 'Archive 1 slime today',
    category: 'daily',
    conditionKey: 'daily_archives',
    targetValue: 1,
    reward: { gold: 60 },
  },
  {
    id: 'daily-upgrade-1',
    name: 'Daily Builder',
    description: 'Upgrade a facility once today',
    category: 'daily',
    conditionKey: 'daily_upgrades',
    targetValue: 1,
    reward: { gold: 120 },
  },
];

const ACHIEVEMENT_QUESTS: QuestTemplate[] = [
  {
    id: 'ach-total-splits-50',
    name: 'Prolific Breeder',
    description: 'Trigger 50 splits in total',
    category: 'achievement',
    conditionKey: 'total_splits',
    targetValue: 50,
    reward: { gold: 500, crystal: 10 },
  },
  {
    id: 'ach-total-sells-20',
    name: 'Merchant',
    description: 'Sell 20 slimes in total',
    category: 'achievement',
    conditionKey: 'total_sells',
    targetValue: 20,
    reward: { gold: 300, crystal: 5 },
  },
  {
    id: 'ach-battles-won-10',
    name: 'Warrior',
    description: 'Win 10 battles in total',
    category: 'achievement',
    conditionKey: 'total_battles_won',
    targetValue: 10,
    reward: { gold: 400, crystal: 15 },
  },
  {
    id: 'ach-rare-slime-5',
    name: 'Rare Collector',
    description: 'Own 5 rare or higher slimes at once',
    category: 'achievement',
    conditionKey: 'rare_slime_count',
    targetValue: 5,
    reward: { crystal: 20 },
  },
  {
    id: 'ach-chapter-2',
    name: 'Explorer',
    description: 'Unlock Chapter 2',
    category: 'achievement',
    conditionKey: 'chapters_unlocked',
    targetValue: 2,
    reward: { gold: 600, crystal: 25 },
  },
];

const BOUNTY_QUESTS: QuestTemplate[] = [
  {
    id: 'bounty-rare-submit',
    name: 'Rare Specimen',
    description: 'Submit a Rare or higher rarity slime',
    category: 'bounty',
    conditionKey: 'bounty_submit',
    targetValue: 1,
    reward: { gold: 200, crystal: 10 },
    bountyCriteria: { minRarity: Rarity.Rare },
  },
  {
    id: 'bounty-strong-submit',
    name: 'Power Specimen',
    description: 'Submit a slime with total stats >= 100',
    category: 'bounty',
    conditionKey: 'bounty_submit',
    targetValue: 1,
    reward: { gold: 300, crystal: 15 },
    bountyCriteria: { minTotalStats: 100 },
  },
  {
    id: 'bounty-epic-submit',
    name: 'Epic Specimen',
    description: 'Submit an Epic or higher rarity slime',
    category: 'bounty',
    conditionKey: 'bounty_submit',
    targetValue: 1,
    reward: { gold: 500, crystal: 30 },
    bountyCriteria: { minRarity: Rarity.Epic },
  },
];

const ALL_TEMPLATES: QuestTemplate[] = [...DAILY_QUESTS, ...ACHIEVEMENT_QUESTS, ...BOUNTY_QUESTS];

// Helper functions

const RARITY_ORDER: Record<string, number> = {
  [Rarity.Common]: 0,
  [Rarity.Uncommon]: 1,
  [Rarity.Rare]: 2,
  [Rarity.Epic]: 3,
  [Rarity.Legendary]: 4,
};

function slimeTotalStats(s: Slime): number {
  return s.stats.health + s.stats.attack + s.stats.defense + s.stats.speed;
}

function meetsRarity(slime: Slime, minRarity: Rarity): boolean {
  return (RARITY_ORDER[slime.rarity] ?? 0) >= (RARITY_ORDER[minRarity] ?? 0);
}

// QuestSystem

export class QuestSystem {
  static getAllTemplates(): QuestTemplate[] {
    return ALL_TEMPLATES;
  }

  static getTemplate(id: string): QuestTemplate | undefined {
    return ALL_TEMPLATES.find((t) => t.id === id);
  }

  static initQuests(state: GameState): void {
    state.quests = [];
    state.questDailyRefreshTime = Date.now();
    state.questCounters = {};

    for (const t of DAILY_QUESTS) {
      state.quests.push({ questId: t.id, currentValue: 0, status: 'active' });
    }
    for (const t of ACHIEVEMENT_QUESTS) {
      state.quests.push({ questId: t.id, currentValue: 0, status: 'active' });
    }
    for (const t of BOUNTY_QUESTS) {
      state.quests.push({ questId: t.id, currentValue: 0, status: 'active' });
    }
  }

  static resetDailyQuests(state: GameState): void {
    state.quests = state.quests.filter((q) => {
      const t = QuestSystem.getTemplate(q.questId);
      return t ? t.category !== 'daily' : false;
    });
    for (const t of DAILY_QUESTS) {
      state.quests.push({ questId: t.id, currentValue: 0, status: 'active' });
    }
    for (const key of Object.keys(state.questCounters)) {
      if (key.startsWith('daily_')) {
        state.questCounters[key] = 0;
      }
    }
    state.questDailyRefreshTime = Date.now();
  }

  static incrementCounter(state: GameState, key: string, amount: number = 1): void {
    if (!state.questCounters) state.questCounters = {};
    state.questCounters[key] = (state.questCounters[key] ?? 0) + amount;

    for (const qp of state.quests) {
      if (qp.status !== 'active') continue;
      const t = QuestSystem.getTemplate(qp.questId);
      if (!t) continue;
      if (t.conditionKey === key) {
        qp.currentValue = state.questCounters[key]!;
        if (qp.currentValue >= t.targetValue) {
          qp.status = 'completed';
        }
      }
    }
  }

  static syncDerivedCounters(state: GameState): void {
    if (!state.questCounters) state.questCounters = {};

    const allSlimes = [...state.slimes, ...state.archivedSlimes];
    const rareCount = allSlimes.filter(
      (s) => (RARITY_ORDER[s.rarity] ?? 0) >= (RARITY_ORDER[Rarity.Rare] ?? 0),
    ).length;
    state.questCounters['rare_slime_count'] = rareCount;
    state.questCounters['chapters_unlocked'] = state.unlockedChapters;

    for (const qp of state.quests) {
      if (qp.status !== 'active') continue;
      const t = QuestSystem.getTemplate(qp.questId);
      if (!t) continue;
      if (t.conditionKey === 'rare_slime_count' || t.conditionKey === 'chapters_unlocked') {
        qp.currentValue = state.questCounters[t.conditionKey]!;
        if (qp.currentValue >= t.targetValue) {
          qp.status = 'completed';
        }
      }
    }
  }

  static claimQuest(state: GameState, questId: string): boolean {
    const qp = state.quests.find((q) => q.questId === questId);
    if (!qp || qp.status !== 'completed') return false;

    const t = QuestSystem.getTemplate(questId);
    if (!t) return false;

    QuestSystem.applyReward(state, t.reward);
    qp.status = 'claimed';
    return true;
  }

  static completeQuest(state: GameState, questId: string): boolean {
    const qp = state.quests.find((q) => q.questId === questId);
    if (!qp) return false;
    const t = QuestSystem.getTemplate(questId);
    if (!t) return false;

    qp.currentValue = t.targetValue;
    qp.status = 'completed';
    return true;
  }

  static submitBounty(state: GameState, questId: string, slimeId: string): boolean {
    const qp = state.quests.find((q) => q.questId === questId);
    if (!qp || qp.status !== 'active') return false;

    const t = QuestSystem.getTemplate(questId);
    if (!t || t.category !== 'bounty' || !t.bountyCriteria) return false;

    const slimeIdx = state.slimes.findIndex((s) => s.id === slimeId);
    const archivedIdx = state.archivedSlimes.findIndex((s) => s.id === slimeId);
    const slime = slimeIdx >= 0 ? state.slimes[slimeIdx] : archivedIdx >= 0 ? state.archivedSlimes[archivedIdx] : undefined;
    if (!slime) return false;

    const criteria = t.bountyCriteria;
    if (criteria.minRarity && !meetsRarity(slime, criteria.minRarity)) return false;
    if (criteria.minTotalStats && slimeTotalStats(slime) < criteria.minTotalStats) return false;
    if (criteria.requiredTraitId && !slime.traits.some((tr) => tr.id === criteria.requiredTraitId)) return false;

    if (slimeIdx >= 0) {
      state.slimes.splice(slimeIdx, 1);
    } else if (archivedIdx >= 0) {
      state.archivedSlimes.splice(archivedIdx, 1);
    }

    qp.currentValue = t.targetValue;
    qp.status = 'completed';
    return true;
  }

  static getQuests(state: GameState): Array<QuestProgress & { template: QuestTemplate }> {
    return state.quests
      .map((qp) => {
        const t = QuestSystem.getTemplate(qp.questId);
        if (!t) return null;
        return { ...qp, template: t };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  private static applyReward(state: GameState, reward: QuestReward): void {
    if (reward.gold) state.currency += reward.gold;
    if (reward.crystal) state.crystal += reward.crystal;
    if (reward.items) {
      for (const ri of reward.items) {
        for (let i = 0; i < ri.quantity; i++) {
          ItemSystem.addItem(state, ri.type as ItemType);
        }
      }
    }
  }
}
