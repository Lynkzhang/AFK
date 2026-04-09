import './style.css';
import { SaveManager } from './core/save/SaveManager';
import { SceneManager } from './core/scene/SceneManager';
import { GameLoop } from './core/systems/GameLoop';
import type { GameState, Slime } from './core/types';
import { Rarity } from './core/types';
import { UIManager } from './core/ui/UIManager';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root not found');

function createDefaultSlimes(): Slime[] {
  return [
    {
      id: 'slime-common',
      name: 'Green Slime',
      stats: { health: 20, attack: 5, defense: 3, speed: 4 },
      traits: [{ id: 'fresh', name: 'Fresh', description: 'Newly born' }],
      skills: [{ id: 'jump', name: 'Jump', power: 5, cooldown: 1 }],
      rarity: Rarity.Common,
      generation: 1,
      parentId: null,
      color: '#56d364',
      position: { x: -2, y: 0.5, z: 0 },
    },
    {
      id: 'slime-rare',
      name: 'Blue Slime',
      stats: { health: 28, attack: 7, defense: 4, speed: 5 },
      traits: [{ id: 'calm', name: 'Calm', description: 'Stable and focused' }],
      skills: [{ id: 'splash', name: 'Splash', power: 8, cooldown: 2 }],
      rarity: Rarity.Rare,
      generation: 1,
      parentId: null,
      color: '#4f8cff',
      position: { x: 0, y: 0.5, z: 0 },
    },
    {
      id: 'slime-epic',
      name: 'Purple Slime',
      stats: { health: 36, attack: 10, defense: 5, speed: 6 },
      traits: [{ id: 'arcane', name: 'Arcane', description: 'Mystic energy' }],
      skills: [{ id: 'pulse', name: 'Arcane Pulse', power: 12, cooldown: 3 }],
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
      { id: 'bg-1', name: 'Starter Pen', level: 1, capacity: 4, assignedSlimeIds: [] },
    ],
    facilities: [{ id: 'fac-1', name: 'Nursery', level: 1, active: true }],
    currency: 100,
    timestamp: Date.now(),
  };
}

const gameRoot = document.createElement('div');
gameRoot.className = 'game-root';
const sceneRoot = document.createElement('div');
sceneRoot.className = 'scene-root';

app.appendChild(gameRoot);
gameRoot.appendChild(sceneRoot);

const ui = new UIManager();
gameRoot.appendChild(ui.root);

const saveManager = new SaveManager();
let state = saveManager.load() ?? createDefaultState();

const scene = new SceneManager(sceneRoot);
const loop = new GameLoop({
  update: (_deltaTime, elapsedTime) => {
    state.timestamp = Date.now();
    scene.update(state, elapsedTime);
    ui.render(state);
  },
  render: () => {
    scene.render();
  },
});

const stopAutoSave = saveManager.startAutoSave(10000, () => state);

ui.bind({
  onNewGame: () => {
    state = createDefaultState();
    ui.render(state);
  },
  onSave: () => {
    state.timestamp = Date.now();
    saveManager.save(state);
  },
  onLoad: () => {
    const loaded = saveManager.load();
    if (loaded) {
      state = loaded;
      ui.render(state);
    }
  },
});

window.addEventListener('beforeunload', () => {
  stopAutoSave();
  saveManager.save(state);
});

ui.render(state);
loop.start();
