import type { GameState } from '../types';

const SAVE_KEY = 'slime-keeper-save';

export class SaveManager {
  save(state: GameState): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  load(): GameState | null {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as GameState;
    } catch {
      return null;
    }
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  startAutoSave(intervalMs: number, getState: () => GameState): () => void {
    const timer = window.setInterval(() => {
      this.save(getState());
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }
}
