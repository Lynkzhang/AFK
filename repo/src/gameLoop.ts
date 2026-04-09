import type { GameLoopContext } from './types';

export interface GameLoopController {
  start: () => void;
  stop: () => void;
}

export function createGameLoop(context: GameLoopContext): GameLoopController {
  let rafId = 0;
  let running = false;
  let previousMs = 0;
  let startMs = 0;

  function frame(timestampMs: number): void {
    if (!running) return;

    if (startMs === 0) {
      startMs = timestampMs;
      previousMs = timestampMs;
    }

    const deltaMs = timestampMs - previousMs;
    const elapsedMs = timestampMs - startMs;
    previousMs = timestampMs;

    context.update(deltaMs / 1000, elapsedMs / 1000);
    context.render();

    rafId = window.requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      rafId = window.requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      window.cancelAnimationFrame(rafId);
    },
  };
}
