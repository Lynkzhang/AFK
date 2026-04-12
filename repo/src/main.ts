import './style.css';
import { SaveManager } from './core/save/SaveManager';
import { Canvas2DRenderer } from './core/scene/Canvas2DRenderer';
import { BreedingSystem } from './core/systems/BreedingSystem';
import { GameLoop } from './core/systems/GameLoop';
import type { GameState } from './core/types';
import { Rarity } from './core/types';
import { UIManager } from './core/ui/UIManager';
import { BackpackUI } from './core/ui/BackpackUI';
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
import { soundManager } from './core/audio/SoundManager';
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

function showBuffToast(message: string): void {
  const toast = document.createElement('div');
  toast.className = 'buff-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  // Force reflow for animation
  void toast.offsetWidth;
  toast.classList.add('buff-toast-visible');
  setTimeout(() => {
    toast.classList.remove('buff-toast-visible');
    toast.classList.add('buff-toast-fade');
    setTimeout(() => toast.remove(), 500);
  }, 2500);
}

function createStarterSlime(): import('./core/types').Slime {
  return {
    id: 'slime-starter',
    name: '\u5c0f\u7eff',
    stats: { health: 15, attack: 3, defense: 2, speed: 3, mut: 0.08 },
    traits: [{
      id: 'eager',
      name: '\u6d3b\u529b\u5145\u6c9b',
      description: '\u5206\u88c2\u901f\u5ea6\u7565\u5fae\u63d0\u5347',
      rarity: Rarity.Common,
      effect: 'split-speed-up-10%',
    }],
    skills: [{
      id: 'bounce',
      name: '\u5f39\u8df3',
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


function createSecondSlime(): import('./core/types').Slime {
  return {
    id: 'slime-starter-2',
    name: '小蓝',
    stats: { health: 12, attack: 4, defense: 3, speed: 2, mut: 0.06 },
    traits: [{
      id: 'tough-body',
      name: '坚韧体质',
      description: '防御略微提升',
      rarity: Rarity.Common,
      effect: 'defense+8%',
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
    color: '#6ab4e8',
    position: { x: 1.5, y: 0.5, z: 0.3 },
  };
}
function createDefaultState(): GameState {
  const s: GameState = {
    slimes: [createStarterSlime(), createSecondSlime()],
    breedingGrounds: [
      { id: 'bg-1', name: 'Starter Pen', level: 1, capacity: 4, slimes: [], facilityLevel: 1 },
    ],
    facilities: DEFAULT_FACILITIES.map((f) => ({ ...f })),
    currency: 50,
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
    activeBuffs: {
      mutationCatalystActive: false,
      rareEssenceActive: false,
    },
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
  // Buff migration
  if (!s['activeBuffs'] || typeof s['activeBuffs'] !== 'object') {
    s['activeBuffs'] = { mutationCatalystActive: false, rareEssenceActive: false };
  }
}

const gameRoot = document.createElement('div');
gameRoot.className = 'game-root';
const sceneRoot = document.createElement('div');
sceneRoot.className = 'scene-root';

app.appendChild(gameRoot);
gameRoot.appendChild(sceneRoot);

const ui = new UIManager();
ui.setPriceEvaluator(evaluatePrice);
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

const backpackUI = new BackpackUI();
backpackUI.hide();
backpackUI.setPriceEvaluator(evaluatePrice);
gameRoot.appendChild(backpackUI.root);

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

/* === M32: Audio Control UI === */
const audioControlEl = document.createElement('div');
audioControlEl.className = 'audio-control';

const muteBtn = document.createElement('button');
muteBtn.className = 'mute-btn pixel-btn';
muteBtn.textContent = '🔊';
muteBtn.onclick = () => {
  const muted = soundManager.toggleMute();
  muteBtn.textContent = muted ? '🔇' : '🔊';
};

const bgmBtn = document.createElement('button');
bgmBtn.className = 'bgm-btn pixel-btn';
bgmBtn.textContent = '🎵 BGM';
bgmBtn.onclick = () => {
  soundManager.playUIClick();
  const playing = soundManager.toggleBGM();
  bgmBtn.textContent = playing ? '🎵 BGM' : '🎵 OFF';
};

const volumeSlider = document.createElement('input');
volumeSlider.type = 'range';
volumeSlider.className = 'volume-slider';
volumeSlider.min = '0';
volumeSlider.max = '100';
volumeSlider.value = '50';
volumeSlider.oninput = () => {
  soundManager.setMasterVolume(parseInt(volumeSlider.value, 10) / 100);
};

audioControlEl.append(muteBtn, bgmBtn, volumeSlider);
gameRoot.appendChild(audioControlEl);

const saveManager = new SaveManager();
let state = saveManager.load() ?? createDefaultState();
migrateState(state);

let onboardingSystem = new OnboardingSystem(state, onboardingUI);

const scene = new Canvas2DRenderer(sceneRoot);
const breedingSystem = new BreedingSystem({ splitIntervalMs: 10000, maxCapacity: 12 });
const loop = new GameLoop({
  update: (deltaTime, elapsedTime) => {
    state.timestamp = Date.now();
    const baseSplitInterval = FacilitySystem.getSplitInterval(state);
    const isWaitingForSplit = state.onboarding?.currentStep === 'step-wait-split'
      || state.onboarding?.currentStep === 'step-wait-recover-1'
      || state.onboarding?.currentStep === 'step-wait-recover-2';
    const effectiveSplitInterval = isWaitingForSplit
      ? Math.min(baseSplitInterval, 5000)
      : baseSplitInterval;
    const dynamicConfig = {
      splitIntervalMs: effectiveSplitInterval,
      maxCapacity: FacilitySystem.getMaxCapacity(state),
    };
    const isOnboarding = state.onboarding?.currentStep !== null && state.onboarding?.currentStep !== undefined;
    const isWaitingSplit = state.onboarding?.currentStep === 'step-wait-split'
      || state.onboarding?.currentStep === 'step-wait-recover-1'
      || state.onboarding?.currentStep === 'step-wait-recover-2';
    const effectiveDelta = (isOnboarding && !isWaitingSplit) ? 0 : deltaTime;
    const breedResult = breedingSystem.update(state, effectiveDelta, dynamicConfig);
    if (breedResult.didSplit) {
      soundManager.playSplit();
      if (breedResult.wasMutation) {
        soundManager.playMutation();
      }
      // Show buff effect toast on split
      if (breedResult.buffApplied?.mutationCatalyst) {
        showBuffToast('🧬 变异催化加持！变异概率已翻倍！');
      }
      if (breedResult.buffApplied?.rareEssence) {
        showBuffToast('💎 稀有精华加持！稀有特性概率×3！');
      }
    }
    scene.update(state, elapsedTime, breedingSystem.getTimeUntilNextSplit());
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
    soundManager.playUIClick();
    if (saveManager.hasSave()) {
      if (!confirm('\u786e\u5b9a\u8981\u5f00\u59cb\u65b0\u6e38\u620f\u5417\uff1f\u5f53\u524d\u672a\u4fdd\u5b58\u7684\u8fdb\u5ea6\u5c06\u4e22\u5931\u3002')) return;
    }
    state = createDefaultState();
    onboardingSystem = new OnboardingSystem(state, onboardingUI);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onSave: () => {
    soundManager.playUIClick();
    state.timestamp = Date.now();
    try {
      saveManager.save(state);
      showToast('\u4fdd\u5b58\u6210\u529f \u2713');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        showToast('\u5b58\u50a8\u7a7a\u95f4\u5df2\u6ee1\uff0c\u8bf7\u6e05\u7406\u6d4f\u89c8\u5668\u6570\u636e \u2717');
      } else {
        showToast('\u4fdd\u5b58\u5931\u8d25 \u2717');
      }
    }
  },
  onLoad: () => {
    soundManager.playUIClick();
    const loaded = saveManager.load();
    if (loaded) {
      state = loaded;
      migrateState(state);
      onboardingSystem = new OnboardingSystem(state, onboardingUI);
      ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
      showToast('\u52a0\u8f7d\u6210\u529f \u2713');
    } else {
      showToast('\u65e0\u5b58\u6863\u53ef\u52a0\u8f7d');
    }
  },
  onBattle: () => {
    soundManager.playUIClick();
    soundManager.playPanelOpen();
    ui.setActionsDisabled(true);
    stageSelectUI.render(state);
    stageSelectUI.show();
  },
  onOpenBackpack: () => {
    soundManager.playUIClick();
    soundManager.playPanelOpen();
    ui.setActionsDisabled(true);
    backpackUI.render(state);
    backpackUI.show();
  },
  onOpenArchive: () => {
    soundManager.playUIClick();
    soundManager.playPanelOpen();
    ui.setActionsDisabled(true);
    archiveUI.render(state);
    archiveUI.show();
  },
  onOpenFacility: () => {
    soundManager.playUIClick();
    soundManager.playPanelOpen();
    ui.setActionsDisabled(true);
    facilityUI.render(state);
    facilityUI.show();
  },
  onOpenShop: () => {
    soundManager.playUIClick();
    soundManager.playPanelOpen();
    ui.setActionsDisabled(true);
    shopUI.render(state);
    shopUI.show();
  },
  onOpenQuest: () => {
    soundManager.playUIClick();
    soundManager.playPanelOpen();
    ui.setActionsDisabled(true);
    QuestSystem.syncDerivedCounters(state);
    questUI.render(state);
    questUI.show();
    onboardingSystem.notifyEvent('quest-opened');
  },
  onOpenCodex: () => {
    soundManager.playUIClick();
    soundManager.playPanelOpen();
    ui.setActionsDisabled(true);
    CodexSystem.recordFromState(state);
    codexUI.render(state);
    codexUI.show();
  },
  onOpenArena: () => {
    soundManager.playUIClick();
    soundManager.playPanelOpen();
    ui.setActionsDisabled(true);
    arenaUI.render(state);
    arenaUI.show();
  },
});

facilityUI.bind({
  onUpgrade: (id: string) => {
    const facility = state.facilities.find((f) => f.id === id);
    const oldLevel = facility ? facility.level : 0;
    const ok = FacilitySystem.upgrade(state, id);
    // Track quest counters
    QuestSystem.incrementCounter(state, 'daily_upgrades');
    onboardingSystem.notifyEvent('facility-upgrade');
    facilityUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
    if (ok) {
      soundManager.playAchievement();
      const newLevel = facility ? facility.level : oldLevel;
      showToast(`${facility?.name ?? '\u8bbe\u65bd'} \u5347\u7ea7\u5230 Lv.${newLevel} \u2713`);
    }
  },
  onBack: () => {
    soundManager.playPanelClose();
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
  onUseItem: (itemType: string, slimeId?: string) => {
    const targetId = slimeId ?? state.slimes[0]?.id;
    ItemSystem.useItem(state, itemType as 'mutation-catalyst' | 'stat-booster' | 'rare-essence', targetId);
    shopUI.render(state);

    // Show buff activation toast
    if (itemType === 'mutation-catalyst' && state.activeBuffs.mutationCatalystActive) {
      showBuffToast('🧬 变异催化剂已激活！下次分裂变异概率×2');
    } else if (itemType === 'rare-essence' && state.activeBuffs.rareEssenceActive) {
      showBuffToast('💎 稀有精华已激活！下次分裂稀有特性概率×3');
    }
  },
  onBack: () => {
    soundManager.playPanelClose();
    shopUI.hide();
    ui.setActionsDisabled(false);
  },
});

questUI.bind({
  onClaim: (questId: string) => {
    soundManager.playRewardClaim();
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
    soundManager.playPanelClose();
    questUI.hide();
    ui.setActionsDisabled(false);
  },
});

codexUI.bind({
  onBack: () => {
    soundManager.playPanelClose();
    codexUI.hide();
    ui.setActionsDisabled(false);
  },
});

arenaUI.bind({
  onBuy: (arenaId) => {
    const ok = ArenaSystem.buyArena(state, arenaId);
    if (!ok) {
      showToast('\u2716 \u8d27\u5e01\u4e0d\u8db3');
    }
    arenaUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onSwitch: (arenaId) => {
    ArenaSystem.switchArena(state, arenaId);
    arenaUI.render(state);
  },
  onBack: () => {
    soundManager.playPanelClose();
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
    soundManager.playPanelClose();
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
    soundManager.playPanelClose();
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
      soundManager.playVictory();
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
    } else {
      soundManager.playDefeat();
    }
    onboardingSystem.notifyEvent('battle-complete');
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
});

archiveUI.bind({
  onUnarchive: (slimeId: string) => {
    const maxCap = FacilitySystem.getMaxCapacity(state);
    if (state.slimes.length >= maxCap) {
      showToast('\u2716 \u57f9\u517b\u573a\u5730\u5df2\u6ee1\uff0c\u8bf7\u5148\u5254\u9664\u6216\u51fa\u552e');
      return;
    }
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
    soundManager.playPanelClose();
    archiveUI.hide();
    ui.setActionsDisabled(false);
  },
});

backpackUI.bind({
  onSell: (id: string) => {
    const slime = state.slimes.find((s) => s.id === id) || state.archivedSlimes.find((s) => s.id === id);
    if (!slime) return;
    soundManager.playSell();
    const price = evaluatePrice(slime);
    state.currency += price;
    if (state.slimes.find((s) => s.id === id)) {
      state.slimes = state.slimes.filter((s) => s.id !== id);
      onboardingSystem.notifyEvent('sell');
    } else {
      removeArchivedSlime(state, id);
    }
    QuestSystem.incrementCounter(state, 'daily_sells');
    QuestSystem.incrementCounter(state, 'total_sells');
    showToast(`\u51fa\u552e\u6210\u529f\uff0c\u83b7\u5f97 \ud83d\udcb0${price} \u91d1\u5e01`);
    backpackUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onCull: (id: string) => {
    soundManager.playCull();
    state.slimes = state.slimes.filter((s) => s.id !== id);
    showToast('\u5254\u9664\u6210\u529f \ud83d\uddd1\ufe0f');
    onboardingSystem.notifyEvent('cull');
    backpackUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onArchive: (id: string) => {
    const result = archiveSlime(state, id);
    if (result.success) {
      soundManager.playArchive();
      showToast('\u5c01\u5b58\u6210\u529f \ud83d\udce6');
      QuestSystem.incrementCounter(state, 'daily_archives');
      onboardingSystem.notifyEvent('archive');
    } else {
      showToast(`\u2716 ${result.reason ?? '\u5c01\u5b58\u5931\u8d25'}`);
    }
    backpackUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onUnarchive: (id: string) => {
    const maxCap = FacilitySystem.getMaxCapacity(state);
    if (state.slimes.length >= maxCap) {
      showToast('\u2716 \u57f9\u517b\u573a\u5730\u5df2\u6ee1\uff0c\u8bf7\u5148\u5254\u9664\u6216\u51fa\u552e');
      return;
    }
    unarchiveSlime(state, id);
    backpackUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onEquipAccessory: (slimeId: string, accessoryId: string) => {
    AccessorySystem.equip(state, accessoryId, slimeId);
    backpackUI.render(state);
  },
  onUnequipAccessory: (slimeId: string) => {
    AccessorySystem.unequip(state, slimeId);
    backpackUI.render(state);
  },
  onBatchSell: (ids: string[]) => {
    soundManager.playSell();
    let total = 0;
    for (const id of ids) {
      const slime = state.slimes.find((s) => s.id === id) || state.archivedSlimes.find((s) => s.id === id);
      if (slime) {
        total += evaluatePrice(slime);
        QuestSystem.incrementCounter(state, 'daily_sells');
        QuestSystem.incrementCounter(state, 'total_sells');
      }
    }
    state.currency += total;
    state.slimes = state.slimes.filter((s) => !ids.includes(s.id));
    for (const id of ids) { removeArchivedSlime(state, id); }
    showToast(`\u6279\u91cf\u51fa\u552e ${ids.length} \u53ea\uff0c\u83b7\u5f97 \ud83d\udcb0${total} \u91d1\u5e01`);
    backpackUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onBatchCull: (ids: string[]) => {
    soundManager.playCull();
    state.slimes = state.slimes.filter((s) => !ids.includes(s.id));
    showToast(`\u6279\u91cf\u5254\u9664 ${ids.length} \u53ea\u53f2\u83b1\u59c6 \ud83d\uddd1\ufe0f`);
    backpackUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onBack: () => {
    soundManager.playPanelClose();
    backpackUI.hide();
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

// Extend GM with backpack commands
if (window.__GM) {
  window.__GM.openBackpack = () => {
    backpackUI.render(state);
    backpackUI.show();
  };
  window.__GM.closeBackpack = () => {
    backpackUI.hide();
    ui.setActionsDisabled(false);
  };
}

loop.start();
