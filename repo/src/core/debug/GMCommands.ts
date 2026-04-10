import type { GameState, Slime, Stats, Facility, Item, QuestProgress, QuestTemplate, CodexData } from '../types';
import { Rarity } from '../types';
import type { BattleResult } from '../combat/CombatTypes';
import { runBattle } from '../combat/CombatEngine';
import { getStage } from '../combat/StageData';
import { archiveSlime as doArchive, unarchiveSlime as doUnarchive } from '../systems/ArchiveSystem';
import { evaluatePrice as doEvaluatePrice } from '../systems/EvaluationSystem';
import { FacilitySystem } from '../systems/FacilitySystem';
import { ShopSystem } from '../systems/ShopSystem';
import { ItemSystem } from '../systems/ItemSystem';
import { QuestSystem } from '../systems/QuestSystem';
import { CodexSystem } from '../systems/CodexSystem';

type GetState = () => GameState;
type SetState = (s: GameState) => void;

interface GMApi {
  addSlime(): void;
  removeSlime(id: string): void;
  setStats(id: string, partial: Partial<Stats>): void;
  triggerSplit(): void;
  getState(): GameState;
  setCurrency(n: number): void;
  setCrystal(n: number): void;
  startBattle(stageId: string): BattleResult;
  autoBattle(stageId: string): BattleResult;
  archiveSlime(id: string): { success: boolean; reason?: string };
  unarchiveSlime(id: string): { success: boolean; reason?: string };
  getArchivedSlimes(): Slime[];
  evaluatePrice(id: string): number;
  upgradeFacility(id: string): boolean;
  getFacilities(): Facility[];
  buyItem(shopItemId: string): boolean;
  getItems(): Item[];
  useItem(itemType: string, slimeId?: string): string;
  unlockChapter(n: number): void;
  getUnlockedChapters(): number;
  // Quest GM commands
  completeQuest(questId: string): boolean;
  resetDailyQuests(): void;
  getQuests(): Array<QuestProgress & { template: QuestTemplate }>;
  claimQuest(questId: string): boolean;
  submitBounty(questId: string, slimeId: string): boolean;
  incrementQuestCounter(key: string, amount?: number): void;
  // Codex GM commands
  getCodex(): { codex: CodexData; allRarities: string[]; allTraits: { id: string; name: string; rarity: string }[]; allSkills: { id: string; name: string; type: string }[] };
  unlockCodexEntry(category: string, id: string): boolean;
  getCodexCompletion(): { rarities: { unlocked: number; total: number; percent: number }; traits: { unlocked: number; total: number; percent: number }; skills: { unlocked: number; total: number; percent: number }; overall: { unlocked: number; total: number; percent: number } };
}

declare global {
  interface Window {
    __GM?: GMApi;
  }
}

function createDefaultSlime(): Slime {
  const id = `gm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    name: `GM Slime ${id.slice(-4)}`,
    stats: { health: 20, attack: 5, defense: 3, speed: 4, mut: 0.05 },
    traits: [
      {
        id: 'gm',
        name: 'GM-Spawned',
        description: 'Created by GM command',
        rarity: Rarity.Common,
        effect: 'none',
      },
    ],
    skills: [
      {
        id: 'gm-atk',
        name: 'GM Strike',
        type: 'attack',
        targetType: 'single',
        damage: 5,
        cooldown: 1,
      },
    ],
    rarity: Rarity.Common,
    generation: 0,
    parentId: null,
    color: '#ff0',
    position: {
      x: (Math.random() - 0.5) * 4,
      y: 0.5,
      z: (Math.random() - 0.5) * 4,
    },
  };
}

function runBattleWithTeam(getState: GetState, setState: SetState, stageId: string): BattleResult {
  const stage = getStage(stageId);
  if (!stage) {
    throw new Error(`Stage not found: ${stageId}`);
  }

  let s = getState();
  let slimes = s.slimes;

  if (slimes.length === 0) {
    const gmSlime = createDefaultSlime();
    s = { ...s, slimes: [gmSlime] };
    setState(s);
    slimes = s.slimes;
  }

  const team = slimes.slice(0, 4);
  const result = runBattle(team, stage);
  if (result.victory) {
    const updated = getState();
    const prevProgress = updated.stageProgress[stageId];
    const newStars = (!prevProgress || result.stars > prevProgress.stars) ? result.stars : prevProgress.stars;
    const newStageProgress = { ...updated.stageProgress, [stageId]: { stars: newStars } };

    let unlocked = updated.unlockedChapters;
    if (newStageProgress['1-10']?.stars > 0) unlocked = Math.max(unlocked, 2);
    if (newStageProgress['2-10']?.stars > 0) unlocked = Math.max(unlocked, 3);

    setState({
      ...updated,
      currency: updated.currency + result.rewards.gold,
      crystal: updated.crystal + result.rewards.crystals,
      stageProgress: newStageProgress,
      unlockedChapters: unlocked,
    });
  }
  return result;
}

export function initGM(getState: GetState, setState: SetState): void {
  const api: GMApi = {
    addSlime() {
      const s = getState();
      setState({ ...s, slimes: [...s.slimes, createDefaultSlime()] });
    },
    removeSlime(id: string) {
      const s = getState();
      setState({ ...s, slimes: s.slimes.filter((sl) => sl.id !== id) });
    },
    setStats(id: string, partial: Partial<Stats>) {
      const s = getState();
      setState({
        ...s,
        slimes: s.slimes.map((sl) =>
          sl.id === id ? { ...sl, stats: { ...sl.stats, ...partial } } : sl,
        ),
      });
    },
    triggerSplit() {
      const s = getState();
      if (s.slimes.length === 0) return;
      const parent = s.slimes[Math.floor(Math.random() * s.slimes.length)]!;
      const child: Slime = {
        ...parent,
        id: `gm-split-${Date.now()}`,
        name: `${parent.name} Jr`,
        generation: parent.generation + 1,
        parentId: parent.id,
        position: {
          x: parent.position.x + 1,
          y: 0.5,
          z: parent.position.z,
        },
      };
      setState({ ...s, slimes: [...s.slimes, child] });
    },
    getState() {
      return getState();
    },
    setCurrency(n: number) {
      const s = getState();
      setState({ ...s, currency: n });
    },
    setCrystal(n: number) {
      const s = getState();
      setState({ ...s, crystal: n });
    },
    startBattle(stageId: string): BattleResult {
      return runBattleWithTeam(getState, setState, stageId);
    },
    autoBattle(stageId: string): BattleResult {
      return runBattleWithTeam(getState, setState, stageId);
    },
    archiveSlime(id: string) {
      const s = getState();
      const result = doArchive(s, id);
      setState({ ...s, slimes: [...s.slimes], archivedSlimes: [...s.archivedSlimes] });
      return result;
    },
    unarchiveSlime(id: string) {
      const s = getState();
      const result = doUnarchive(s, id);
      setState({ ...s, slimes: [...s.slimes], archivedSlimes: [...s.archivedSlimes] });
      return result;
    },
    getArchivedSlimes() {
      return getState().archivedSlimes;
    },
    evaluatePrice(id: string) {
      const s = getState();
      const slime = s.slimes.find((sl) => sl.id === id) ?? s.archivedSlimes.find((sl) => sl.id === id);
      return slime ? doEvaluatePrice(slime) : 0;
    },
    upgradeFacility(id: string): boolean {
      const s = getState();
      const result = FacilitySystem.upgrade(s, id);
      setState({ ...s, facilities: [...s.facilities] });
      return result;
    },
    getFacilities(): Facility[] {
      return getState().facilities;
    },
    buyItem(shopItemId: string): boolean {
      const s = getState();
      const result = ShopSystem.buyItem(s, shopItemId);
      setState({ ...s, currency: s.currency, crystal: s.crystal, items: [...s.items] });
      return result;
    },
    getItems(): Item[] {
      return getState().items;
    },
    useItem(itemType: string, slimeId?: string): string {
      const s = getState();
      const result = ItemSystem.useItem(s, itemType as Item['type'], slimeId);
      setState({ ...s, items: [...s.items], slimes: [...s.slimes] });
      return result;
    },
    unlockChapter(n: number): void {
      const s = getState();
      setState({ ...s, unlockedChapters: Math.max(s.unlockedChapters, n) });
    },
    getUnlockedChapters(): number {
      return getState().unlockedChapters;
    },
    // Quest GM commands
    completeQuest(questId: string): boolean {
      const s = getState();
      const result = QuestSystem.completeQuest(s, questId);
      setState({ ...s, quests: [...s.quests] });
      return result;
    },
    resetDailyQuests(): void {
      const s = getState();
      QuestSystem.resetDailyQuests(s);
      setState({ ...s, quests: [...s.quests], questCounters: { ...s.questCounters } });
    },
    getQuests(): Array<QuestProgress & { template: QuestTemplate }> {
      return QuestSystem.getQuests(getState());
    },
    claimQuest(questId: string): boolean {
      const s = getState();
      const result = QuestSystem.claimQuest(s, questId);
      setState({ ...s, quests: [...s.quests], currency: s.currency, crystal: s.crystal, items: [...s.items] });
      return result;
    },
    submitBounty(questId: string, slimeId: string): boolean {
      const s = getState();
      const result = QuestSystem.submitBounty(s, questId, slimeId);
      setState({ ...s, quests: [...s.quests], slimes: [...s.slimes], archivedSlimes: [...s.archivedSlimes] });
      return result;
    },
    incrementQuestCounter(key: string, amount?: number): void {
      const s = getState();
      QuestSystem.incrementCounter(s, key, amount);
      setState({ ...s, quests: [...s.quests], questCounters: { ...s.questCounters } });
    },
    // Codex GM commands
    getCodex() {
      const s = getState();
      CodexSystem.recordFromState(s);
      return CodexSystem.getCodex(s);
    },
    unlockCodexEntry(category: string, id: string): boolean {
      const s = getState();
      const result = CodexSystem.unlockEntry(s, category, id);
      setState({ ...s, codex: { ...s.codex } });
      return result;
    },
    getCodexCompletion() {
      const s = getState();
      if (!s.codex) {
        s.codex = CodexSystem.createDefaultCodex();
      }
      return CodexSystem.getCompletion(s.codex);
    },
  };

  window.__GM = api;

  if (import.meta.env.DEV) {
    console.log('[GM] Commands available via window.__GM');
  }
}
