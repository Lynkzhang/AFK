import './style.css';
import { SaveManager } from './core/save/SaveManager';
import { SceneManager } from './core/scene/SceneManager';
import { BreedingSystem } from './core/systems/BreedingSystem';
import { GameLoop } from './core/systems/GameLoop';
import type { GameState, Slime } from './core/types';
import { Rarity } from './core/types';
import { UIManager } from './core/ui/UIManager';
import { StageSelectUI } from './core/ui/StageSelectUI';
import { TeamSelectUI } from './core/ui/TeamSelectUI';
import { BattleUI } from './core/ui/BattleUI';
import { ArchiveUI } from './core/ui/ArchiveUI';
import { FacilityUI } from './core/ui/FacilityUI';
import { ShopUI } from './core/ui/ShopUI';
import type { BattleResult } from './core/combat/CombatTypes';
import { initGM } from './core/debug/GMCommands';
import { archiveSlime, unarchiveSlime, removeArchivedSlime } from './core/systems/ArchiveSystem';
import { evaluatePrice } from './core/systems/EvaluationSystem';
import { FacilitySystem, DEFAULT_FACILITIES } from './core/systems/FacilitySystem';
import { ShopSystem } from './core/systems/ShopSystem';
import { ItemSystem } from './core/systems/ItemSystem';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root not found');

function createDefaultSlimes(): Slime[] {
  return [
    {
      id: 'slime-common',
      name: 'Green Slime',
      stats: { health: 20, attack: 5, defense: 3, speed: 4, mut: 0.05 },
      traits: [{ id: 'fresh', name: 'Fresh', description: 'Newly born', rarity: Rarity.Common, effect: '无特殊效果' }],
      skills: [{ id: 'jump', name: 'Jump', type: 'attack', targetType: 'single', damage: 5, cooldown: 1 }],
      rarity: Rarity.Common,
      generation: 1,
      parentId: null,
      color: '#56d364',
      position: { x: -2, y: 0.5, z: 0 },
    },
    {
      id: 'slime-rare',
      name: 'Blue Slime',
      stats: { health: 28, attack: 7, defense: 4, speed: 5, mut: 0.05 },
      traits: [{ id: 'calm', name: 'Calm', description: 'Stable and focused', rarity: Rarity.Common, effect: '无特殊效果' }],
      skills: [{ id: 'splash', name: 'Splash', type: 'attack', targetType: 'single', damage: 8, cooldown: 2 }],
      rarity: Rarity.Rare,
      generation: 1,
      parentId: null,
      color: '#4f8cff',
      position: { x: 0, y: 0.5, z: 0 },
    },
    {
      id: 'slime-epic',
      name: 'Purple Slime',
      stats: { health: 36, attack: 10, defense: 5, speed: 6, mut: 0.05 },
      traits: [{ id: 'arcane', name: 'Arcane', description: 'Mystic energy', rarity: Rarity.Common, effect: '无特殊效果' }],
      skills: [{ id: 'pulse', name: 'Arcane Pulse', type: 'attack', targetType: 'single', damage: 12, cooldown: 3 }],
      rarity: Rarity.Epic,
      generation: 1,
      parentId: null,
      color: '#9b59ff',
      position: { x: 2, y: 0.5, z: 0 },
    },
  ];
}

function createDefaultState(): GameState {
  return {
    slimes: createDefaultSlimes(),
    breedingGrounds: [
      { id: 'bg-1', name: 'Starter Pen', level: 1, capacity: 4, slimes: [], facilityLevel: 1 },
    ],
    facilities: DEFAULT_FACILITIES.map((f) => ({ ...f })),
    currency: 100,
    crystal: 0,
    timestamp: Date.now(),
    stageProgress: {},
    archivedSlimes: [],
    archiveCapacity: 10,
    items: [],
  };
}

function migrateState(state: GameState): void {
  const s = state as unknown as Record<string, unknown>;
  if (!Array.isArray(s['archivedSlimes'])) s['archivedSlimes'] = [];
  if (typeof s['archiveCapacity'] !== 'number') s['archiveCapacity'] = 10;
  if (typeof s['crystal'] !== 'number') s['crystal'] = 0;
  if (!Array.isArray(s['items'])) s['items'] = [];
  if (!Array.isArray(state.facilities) || state.facilities.length === 0) {
    state.facilities = DEFAULT_FACILITIES.map((f) => ({ ...f }));
  } else {
    for (const f of state.facilities) {
      if (typeof f.maxLevel !== 'number') {
        f.maxLevel = 10;
      }
    }
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

const saveManager = new SaveManager();
let state = saveManager.load() ?? createDefaultState();
migrateState(state);

const scene = new SceneManager(sceneRoot);
const breedingSystem = new BreedingSystem({ splitIntervalMs: 10000, maxCapacity: 12 });
const loop = new GameLoop({
  update: (deltaTime, elapsedTime) => {
    state.timestamp = Date.now();
    const dynamicConfig = {
      splitIntervalMs: FacilitySystem.getSplitInterval(state),
      maxCapacity: FacilitySystem.getMaxCapacity(state),
    };
    breedingSystem.update(state, deltaTime, dynamicConfig);
    scene.update(state, elapsedTime);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  render: () => {
    scene.render();
  },
});

const stopAutoSave = saveManager.startAutoSave(10000, () => state);

ui.bind({
  onNewGame: () => {
    state = createDefaultState();
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onSave: () => {
    state.timestamp = Date.now();
    saveManager.save(state);
  },
  onLoad: () => {
    const loaded = saveManager.load();
    if (loaded) {
      state = loaded;
      migrateState(state);
      ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
    }
  },
  onBattle: () => {
    stageSelectUI.render(state);
    stageSelectUI.show();
  },
  onCull: (id: string) => {
    state.slimes = state.slimes.filter((slime) => slime.id !== id);
  },
  onSell: (id: string) => {
    const slime = state.slimes.find((item) => item.id === id);
    if (!slime) return;
    state.currency += evaluatePrice(slime);
    state.slimes = state.slimes.filter((item) => item.id !== id);
  },
  onArchive: (id: string) => {
    archiveSlime(state, id);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onOpenArchive: () => {
    archiveUI.render(state);
    archiveUI.show();
  },
  onOpenFacility: () => {
    facilityUI.render(state);
    facilityUI.show();
  },
  onOpenShop: () => {
    shopUI.render(state);
    shopUI.show();
  },
});

facilityUI.bind({
  onUpgrade: (id: string) => {
    FacilitySystem.upgrade(state, id);
    facilityUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onBack: () => {
    facilityUI.hide();
  },
});

shopUI.bind({
  onBuy: (shopItemId: string) => {
    ShopSystem.buyItem(state, shopItemId);
    shopUI.render(state);
    ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
  },
  onUseItem: (itemType: string) => {
    // For stat-booster, use first slime as target. In a real UI you'd pick.
    const targetSlime = state.slimes[0];
    ItemSystem.useItem(state, itemType as 'mutation-catalyst' | 'stat-booster' | 'rare-essence', targetSlime?.id);
    shopUI.render(state);
  },
  onBack: () => {
    shopUI.hide();
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
    }
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
      archiveUI.render(state);
      ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
    }
  },
  onBack: () => {
    archiveUI.hide();
  },
});

window.addEventListener('beforeunload', () => {
  stopAutoSave();
  saveManager.save(state);
});

ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state));
initGM(() => state, (s) => { state = s; });

loop.start();
