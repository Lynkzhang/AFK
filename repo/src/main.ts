import './style.css';
import { createGameLoop } from './gameLoop';
import { createInitialGameState } from './gameState';
import { loadGameState, saveGameState } from './saveSystem';
import { createThreeScene } from './threeScene';
import type { RuntimeStats } from './types';
import { createUiOverlay } from './uiOverlay';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('App root not found');
}

const gameRoot = document.createElement('div');
gameRoot.className = 'game-root';

const sceneRoot = document.createElement('div');
sceneRoot.className = 'scene-root';

const ui = createUiOverlay();

gameRoot.append(sceneRoot, ui.root);
app.appendChild(gameRoot);

let state = loadGameState();
const scene = createThreeScene();
scene.mount(sceneRoot);

const stats: RuntimeStats = {
  fps: 0,
  deltaMs: 0,
  elapsedMs: 0,
};

ui.bindActions({
  onSave: () => {
    state.world.lastTick = Date.now();
    saveGameState(state);
  },
  onReset: () => {
    state = createInitialGameState();
    saveGameState(state);
  },
});

const loop = createGameLoop({
  update(deltaSeconds, elapsedSeconds) {
    stats.deltaMs = deltaSeconds * 1000;
    stats.elapsedMs = elapsedSeconds * 1000;
    stats.fps = deltaSeconds > 0 ? 1 / deltaSeconds : 0;

    state.world.gold += deltaSeconds * 2;
    state.world.lastTick = Date.now();

    const slime = state.slimes[0];
    if (slime) {
      slime.position.x = Math.sin(elapsedSeconds) * 1.5;
      slime.position.z = Math.cos(elapsedSeconds * 0.8) * 1.2;
    }

    scene.updateFromState(state, elapsedSeconds);
    ui.render(state, stats);
  },
  render() {
    scene.render();
  },
});

ui.render(state, stats);
loop.start();
