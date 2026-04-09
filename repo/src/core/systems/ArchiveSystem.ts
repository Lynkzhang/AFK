import type { GameState } from '../types';

export interface ArchiveResult {
  success: boolean;
  reason?: string;
}

/** Move a slime from breeding grounds (slimes[]) to archive (archivedSlimes[]). */
export function archiveSlime(state: GameState, slimeId: string): ArchiveResult {
  if (state.archivedSlimes.length >= state.archiveCapacity) {
    return { success: false, reason: '封存库已满' };
  }
  const idx = state.slimes.findIndex((s) => s.id === slimeId);
  if (idx === -1) {
    return { success: false, reason: '未找到该史莱姆' };
  }
  const slime = state.slimes[idx]!;
  state.slimes.splice(idx, 1);
  state.archivedSlimes.push(slime);
  return { success: true };
}

/** Move a slime from archive back to breeding grounds. */
export function unarchiveSlime(state: GameState, slimeId: string): ArchiveResult {
  const idx = state.archivedSlimes.findIndex((s) => s.id === slimeId);
  if (idx === -1) {
    return { success: false, reason: '封存库中未找到该史莱姆' };
  }
  const slime = state.archivedSlimes[idx]!;
  state.archivedSlimes.splice(idx, 1);
  state.slimes.push(slime);
  return { success: true };
}

/** Remove a slime from the archive (for selling). Returns true if found and removed. */
export function removeArchivedSlime(state: GameState, slimeId: string): boolean {
  const idx = state.archivedSlimes.findIndex((s) => s.id === slimeId);
  if (idx === -1) return false;
  state.archivedSlimes.splice(idx, 1);
  return true;
}
