import './style.css';
import { SaveManager } from './core/save/SaveManager';
import { SceneManager } from './core/scene/SceneManager';
import { BreedingSystem } from './core/systems/BreedingSystem';
import { GameLoop } from './core/systems/GameLoop';
import type { GameState } from './core/types';
import { Rarity } from './core/types';
import { UIManager } from './core/ui/UIManager';
import { StageSelectUI } from './core/ui/StageSelectUI';
import { TeamSelectUI } from './core/ui/TeamSelectUI';
import { BattleUI } from './core/ui/BattleUI';
import { ArchiveUI } from './core/ui/ArchiveUI';
import { FacilityUI } from './core/ui/FacilityUI';
import { ShopUI } from './core/ui/ShopUI';
import { QuestUI } from './core/ui/QuestUI';
import { CodexUI } from './core/ui/CodexUI';
import { ArenaUI } from './core/ui/ArenaUI';
import { OnboardingUI } from './core/ui/OnboardingUI';
import type { BattleResult } from './core/combat/CombatTypes';
import { initGM } from './core/debug/GMCommands';
import { archiveSlime, unarchiveSlime, removeArchivedSlime } from './core/systems/ArchiveSystem';
import { evaluatePrice } from './core/systems/EvaluationSystem';
import { FacilitySystem, DEFAULT_FACILITIES } from './core/systems/FacilitySystem';
import { ShopSystem } from './core/systems/ShopSystem';
import { ItemSystem } from './core/systems/ItemSystem';
import { QuestSystem } from './core/systems/QuestSystem';
import { CodexSystem } from './core/systems/CodexSystem';
import { ArenaSystem } from './core/systems/ArenaSystem';
import { AccessorySystem } from './core/systems/AccessorySystem';
import { OnboardingSystem, createDefaultOnboarding, createAllUnlockedOnboarding } from './core/systems/OnboardingSystem';
import { DEFAULT_ARENAS } from './core/data/arenas';
import { getStage } from './core/combat/StageData';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root not found');

function showToast(msg: string): void {
  const el = document.createElement('div');
  el.className = 'toast-message';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('toast-show'), 10);
  setTimeout(() => {
    el.classList.remove('toast-show');
    setTimeout(() => el.remove(), 300);
  }, 2000);
}

function createStarterSlime(): import('./core/types').Slime {
  return {
    id: 'slime-starter',
    name: '小绿',
    stats: { health: 15, attack: 3, defense: 2, speed: 3, mut: 0.08 },
    traits: [{
      id: 'eager',
      name: '活力充沛',
      description: '分裂速度略微提升',
      rarity: Rarity.Common,
      effect: 'split-speed-up-10%',
    }],
    skills: [{
      id: 'bounce',
      name: '弹跳',
      type: 'attack',
      targetType: 'single',
      damage: 3,
      cooldown: 0,
    }],
    rarity: Rarity.Common,
    generation: 1,
    parentId: null,
    color: '#7ecf6a',
    position: { x: 0, y: 0.5, z: 0 },
  };
}

function createDefaultState(): GameState {
  const s: GameState = {
    slimes: [createStarterSlime()],
    breedingGrounds: [
      { id: 'bg-1', name: 'Starter Pen', level: 1, capacity: 4, slimes: [], facilityLevel: 1 },
    ],
    facilities: DEFAULT_FACILITIES.map((f) => ({ ...f })),
    currency: 0,
    crystal: 0,
    timestamp: Date.now(),
    stageProgress: {},
    archivedSlimes: [],
    archiveCapacity: 10,
    items: [],
    unlockedChapters: 1,
    quests: [],
    questDailyRefreshTime: 0,
    questCounters: {},
    codex: CodexSystem.createDefaultCodex(),
    arenas: DEFAULT_ARENAS.map((a) => ({ ...a, mutationBias: { ...a.mutationBias } })),
    activeArenaId: 'grassland',
    accessories: [],
    onboarding: createDefaultOnboarding(),
  };
  QuestSystem.initQuests(s);
  CodexSystem.recordFromState(s);
  return s;
}

function migrateState(state: GameState): void {
  const s = state as unknown as Record<string, unknown>;
  if (!Array.isArray(s['archivedSlimes'])) s['archivedSlimes'] = [];
  if (typeof s['archiveCapacity'] !== 'number') s['archiveCapacity'] = 10;
  if (typeof s['crystal'] !== 'number') s['crystal'] = 0;
  if (!Array.isArray(s['items'])) s['items'] = [];
  if (typeof s['unlockedChapters'] !== 'number') s['unlockedChapters'] = 1;
  if (!Array.isArray(state.facilities) || state.facilities.length === 0) {
    state.facilities = DEFAULT_FACILITIES.map((f) => ({ ...f }));
  } else {
    for (const f of state.facilities) {
      if (typeof f.maxLevel !== 'number') {
        f.maxLevel = 10;
      }
    }
  }
  // Quest migration
  if (!Array.isArray(s['quests'])) s['quests'] = [];
  if (typeof s['questDailyRefreshTime'] !== 'number') s['questDailyRefreshTime'] = 0;
  if (!s['questCounters'] || typeof s['questCounters'] !== 'object') s['questCounters'] = {};
  // If no quests exist, initialize them
  if (state.quests.length === 0) {
    QuestSystem.initQuests(state);
  }
  // Codex migration
  if (!s['codex'] || typeof s['codex'] !== 'object') {
    s['codex'] = CodexSystem.createDefaultCodex();
  }
  const codexObj = s['codex'] as Record<string, unknown>;
  if (!Array.isArray(codexObj['unlockedRarities'])) codexObj['unlockedRarities'] = [];
  if (!Array.isArray(codexObj['unlockedTraits'])) codexObj['unlockedTraits'] = [];
  if (!Array.isArray(codexObj['unlockedSkills'])) codexObj['unlockedSkills'] = [];
  // Scan existing slimes to populate codex from old saves
  CodexSystem.recordFromState(state);
  // Arena migration
  if (!Array.isArray(s['arenas'])) {
    s['arenas'] = DEFAULT_ARENAS.map((a) => ({ ...a, mutationBias: { ...a.mutationBias } }));
  }
  if (typeof s['activeArenaId'] !== 'string') {
    s['activeArenaId'] = 'grassland';
  }
  if (!Array.isArray(s['accessories'])) s['accessories'] = [];
  if (!s['onboarding'] || typeof s['onboarding'] !== 'object') {
    s['onboarding'] = createAllUnlockedOnboarding();
  }
}

const gameRoot = document.createElement('div');
gameRoot.className = 'game-root';
const sceneRoot = document.createElement('div');
sceneRoot.className = 'scene-root';

app.appendChild(gameRoot);
gameRoot.appendChild(sceneRoot);

const ui = new UIManager();
gameRoot.appendChild(ui.root);

const stageSelectUI = new StageSelectUI();
stageSelectUI.hide();
gameRoot.appendChild(stageSelectUI.root);

const teamSelectUI = new TeamSelectUI();
teamSelectUI.hide();
gameRoot.appendChild(teamSelectUI.root);

const battleUI = new BattleUI();
battleUI.hide();
gameRoot.appendChild(battleUI.root);

const archiveUI = new ArchiveUI();
archiveUI.hide();
archiveUI.setPriceEvaluator(evaluatePrice);
gameRoot.appendChild(archiveUI.root);

const facilityUI = new FacilityUI();
facilityUI.hide();
gameRoot.appendChild(facilityUI.root);

const shopUI = new ShopUI();
shopUI.hide();
gameRoot.appendChild(shopUI.root);

const questUI = new QuestUI();
questUI.hide();
gameRoot.appendChild(questUI.root);

const codexUI = new CodexUI();
codexUI.hide();
gameRoot.appendChild(codexUI.root);

const arenaUI = new ArenaUI();
arenaUI.hide();
gameRoot.appendChild(arenaUI.root);

const onboardingUI = new OnboardingUI();
gameRoot.appendChild(onboardingUI.root);

const saveManager = new SaveManager();
let state = saveManager.load() ?? createDefaultState();
migrateState(state);

let onboardingSystem = new OnboardingSystem(state, onboardingUI);

const scene = new SceneManager(sceneRoot);
const breedingSystem = new BreedingSystem({ splitIntervalMs: 10000, maxCapacity: 12 });
const loop = new GameLoop({
  update: (deltaTime, elapsedTime) => {
    state.timestamp = Date.now();
    const baseSplitInterval = FacilitySystem.getSplitInterval(state);
    const effectiveSplitInterval = (state.onboarding?.currentStep === 'step-wait-split')
      ? Math.min(baseSplitInterval, 5000)
      : baseSplitInterval;
    const dynamicConfig = {
      splitIntervalMs: effectiveSplitInterval,
      maxCapacity: FacilitySystem.getMaxCapacity(state),
    };
    breedingSystem.update(state, deltaTime, dynamicConfig);
    scene.update(state, elapsedTime);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
    // Sync derived quest counters each frame
    QuestSystem.syncDerivedCounters(state);
    // Auto-record codex entries from current slimes
    CodexSystem.recordFromState(state);
    onboardingSystem.tick();
  },
  render: () => {
    scene.render();
  },
});

const stopAutoSave = saveManager.startAutoSave(10000, () => state);

ui.bind({
  onNewGame: () => {
    if (!confirm('确定要开始新游戏吗？当前未保存的进度将丢失。')) return;
    state = createDefaultState();
    onboardingSystem = new OnboardingSystem(state, onboardingUI);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onSave: () => {
    state.timestamp = Date.now();
    try {
      saveManager.save(state);
      showToast('保存成功 ✓');
    } catch (_e) {
      showToast('保存失败 ✗');
    }
  },
  onLoad: () => {
    const loaded = saveManager.load();
    if (loaded) {
      state = loaded;
      migrateState(state);
      onboardingSystem = new OnboardingSystem(state, onboardingUI);
      ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
      showToast('加载成功 ✓');
    } else {
      showToast('无存档可加载');
    }
  },
  onBattle: () => {
    ui.setActionsDisabled(true);
    stageSelectUI.render(state);
    stageSelectUI.show();
  },
  onCull: (id: string) => {
    state.slimes = state.slimes.filter((slime) => slime.id !== id);
    onboardingSystem.notifyEvent('cull');
  },
  onSell: (id: string) => {
    const slime = state.slimes.find((item) => item.id === id);
    if (!slime) return;
    state.currency += evaluatePrice(slime);
    state.slimes = state.slimes.filter((item) => item.id !== id);
    // Track quest counters
    QuestSystem.incrementCounter(state, 'daily_sells');
    QuestSystem.incrementCounter(state, 'total_sells');
    onboardingSystem.notifyEvent('sell');
  },
  onArchive: (id: string) => {
    archiveSlime(state, id);
    // Track quest counters
    QuestSystem.incrementCounter(state, 'daily_archives');
    onboardingSystem.notifyEvent('archive');
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onOpenArchive: () => {
    ui.setActionsDisabled(true);
    archiveUI.render(state);
    archiveUI.show();
  },
  onOpenFacility: () => {
    ui.setActionsDisabled(true);
    facilityUI.render(state);
    facilityUI.show();
  },
  onOpenShop: () => {
    ui.setActionsDisabled(true);
    shopUI.render(state);
    shopUI.show();
  },
  onOpenQuest: () => {
    ui.setActionsDisabled(true);
    QuestSystem.syncDerivedCounters(state);
    questUI.render(state);
    questUI.show();
    onboardingSystem.notifyEvent('quest-opened');
  },
  onOpenCodex: () => {
    ui.setActionsDisabled(true);
    CodexSystem.recordFromState(state);
    codexUI.render(state);
    codexUI.show();
  },
  onOpenArena: () => {
    ui.setActionsDisabled(true);
    arenaUI.render(state);
    arenaUI.show();
  },
});

facilityUI.bind({
  onUpgrade: (id: string) => {
    FacilitySystem.upgrade(state, id);
    // Track quest counters
    QuestSystem.incrementCounter(state, 'daily_upgrades');
    onboardingSystem.notifyEvent('facility-upgrade');
    facilityUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onBack: () => {
    facilityUI.hide();
    ui.setActionsDisabled(false);
  },
});

shopUI.bind({
  onBuy: (shopItemId: string) => {
    if (shopItemId.startsWith('acc-')) {
      ShopSystem.buyAccessory(state, shopItemId);
    } else {
      ShopSystem.buyItem(state, shopItemId);
    }
    shopUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onUseItem: (itemType: string) => {
    const targetSlime = state.slimes[0];
    ItemSystem.useItem(state, itemType as 'mutation-catalyst' | 'stat-booster' | 'rare-essence', targetSlime?.id);
    shopUI.render(state);
  },
  onBack: () => {
    shopUI.hide();
    ui.setActionsDisabled(false);
  },
});

questUI.bind({
  onClaim: (questId: string) => {
    QuestSystem.claimQuest(state, questId);
    questUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onSubmitBounty: (questId: string, slimeId: string) => {
    QuestSystem.submitBounty(state, questId, slimeId);
    questUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onBack: () => {
    questUI.hide();
    ui.setActionsDisabled(false);
  },
});

codexUI.bind({
  onBack: () => {
    codexUI.hide();
    ui.setActionsDisabled(false);
  },
});

arenaUI.bind({
  onBuy: (arenaId) => {
    ArenaSystem.buyArena(state, arenaId);
    arenaUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onSwitch: (arenaId) => {
    ArenaSystem.switchArena(state, arenaId);
    arenaUI.render(state);
  },
  onBack: () => {
    arenaUI.hide();
    ui.setActionsDisabled(false);
  },
});

let currentStageId = '';

stageSelectUI.bind({
  onSelectStage: (stageId: string) => {
    currentStageId = stageId;
    stageSelectUI.hide();
    teamSelectUI.render(state, stageId);
    teamSelectUI.show();
  },
  onBack: () => {
    stageSelectUI.hide();
    ui.setActionsDisabled(false);
  },
});

teamSelectUI.bind({
  onConfirm: (selectedIds: string[]) => {
    teamSelectUI.hide();
    const team = state.archivedSlimes.filter((s) => selectedIds.includes(s.id));
    battleUI.show();
    battleUI.startBattle(team, currentStageId);
  },
  onBack: () => {
    teamSelectUI.hide();
    stageSelectUI.render(state);
    stageSelectUI.show();
  },
});

battleUI.bind({
  onFinish: (result: BattleResult) => {
    battleUI.hide();
    ui.setActionsDisabled(false);
    if (result.victory) {
      const prev = state.stageProgress[currentStageId];
      if (!prev || result.stars > prev.stars) {
        state.stageProgress = {
          ...state.stageProgress,
          [currentStageId]: { stars: result.stars },
        };
      }
      state.currency += result.rewards.gold;
      state.crystal += result.rewards.crystals;

      // Chapter unlock logic
      if (state.stageProgress['1-10']?.stars > 0) state.unlockedChapters = Math.max(state.unlockedChapters, 2);
      if (state.stageProgress['2-10']?.stars > 0) state.unlockedChapters = Math.max(state.unlockedChapters, 3);

      // Accessory drops from boss/elite stages
      const stageConfig = getStage(currentStageId);
      if (stageConfig?.accessoryDropIds && stageConfig.accessoryDropIds.length > 0) {
        const dropId = stageConfig.accessoryDropIds[Math.floor(Math.random() * stageConfig.accessoryDropIds.length)]!;
        AccessorySystem.giveAccessory(state, dropId);
      }

      // Track quest counters
      QuestSystem.incrementCounter(state, 'daily_battles_won');
      QuestSystem.incrementCounter(state, 'total_battles_won');
      onboardingSystem.notifyEvent('battle-victory');
    }
    onboardingSystem.notifyEvent('battle-complete');
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
});

archiveUI.bind({
  onUnarchive: (slimeId: string) => {
    unarchiveSlime(state, slimeId);
    archiveUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onSell: (slimeId: string) => {
    const slime = state.archivedSlimes.find((s) => s.id === slimeId);
    if (slime) {
      state.currency += evaluatePrice(slime);
      removeArchivedSlime(state, slimeId);
      // Track quest counters
      QuestSystem.incrementCounter(state, 'daily_sells');
      QuestSystem.incrementCounter(state, 'total_sells');
      archiveUI.render(state);
      ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
    }
  },
  onEquipAccessory: (slimeId: string, accessoryId: string) => {
    AccessorySystem.equip(state, accessoryId, slimeId);
    archiveUI.render(state);
  },
  onUnequipAccessory: (slimeId: string) => {
    AccessorySystem.unequip(state, slimeId);
    archiveUI.render(state);
  },
  onBack: () => {
    archiveUI.hide();
    ui.setActionsDisabled(false);
  },
});

window.addEventListener('beforeunload', () => {
  stopAutoSave();
  saveManager.save(state);
});

ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
initGM(() => state, (s) => { state = s; onboardingSystem.setState(s); }, {
  skip: () => onboardingSystem.skip(),
  reset: () => onboardingSystem.reset(),
  goToStep: (stepId: string) => onboardingSystem.goToStep(stepId),
});

loop.start();
