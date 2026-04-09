import type { GameState, RuntimeStats } from './types';

export interface UiOverlayController {
  root: HTMLDivElement;
  bindActions: (actions: { onSave: () => void; onReset: () => void }) => void;
  render: (state: GameState, stats: RuntimeStats) => void;
}

export function createUiOverlay(): UiOverlayController {
  const root = document.createElement('div');
  root.className = 'ui-overlay';
  root.innerHTML = `
    <section class="panel">
      <h1>AFK Slime Prototype</h1>
      <div id="stats"></div>
      <div id="slime"></div>
      <div class="actions">
        <button id="save-btn">Save</button>
        <button id="reset-btn">Reset</button>
      </div>
    </section>
  `;

  const statsEl = root.querySelector<HTMLDivElement>('#stats');
  const slimeEl = root.querySelector<HTMLDivElement>('#slime');
  const saveBtn = root.querySelector<HTMLButtonElement>('#save-btn');
  const resetBtn = root.querySelector<HTMLButtonElement>('#reset-btn');

  return {
    root,
    bindActions({ onSave, onReset }) {
      saveBtn?.addEventListener('click', onSave);
      resetBtn?.addEventListener('click', onReset);
    },
    render(state, stats) {
      if (statsEl) {
        statsEl.innerHTML = `
          <p>Stage: <strong>${state.world.stage}</strong></p>
          <p>Gold: <strong>${Math.floor(state.world.gold)}</strong></p>
          <p>FPS: <strong>${stats.fps.toFixed(0)}</strong></p>
        `;
      }

      const slime = state.slimes[0];
      if (slimeEl && slime) {
        slimeEl.innerHTML = `
          <p>Slime: <strong>${slime.name}</strong></p>
          <p>Level ${slime.level} | HP ${slime.hp}</p>
          <p>Pos (${slime.position.x.toFixed(2)}, ${slime.position.z.toFixed(2)})</p>
        `;
      }
    },
  };
}
