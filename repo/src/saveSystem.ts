import type { GameState } from './types';
import { createInitialGameState } from './gameState';

const STORAGE_KEY = 'afk-threejs-save';

function isGameState(data: unknown): data is GameState {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<GameState>;
  return (
    typeof candidate.version === 'number' &&
    typeof candidate.world?.gold === 'number' &&
    typeof candidate.world?.stage === 'number' &&
    Array.isArray(candidate.slimes)
  );
}

export function loadGameState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialGameState();
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isGameState(parsed)) {
      return createInitialGameState();
    }

    return parsed;
  } catch {
    return createInitialGameState();
  }
}

export function saveGameState(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
