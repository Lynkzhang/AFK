import type { GameState, Slime, Stats, Facility } from '../types';
import { Rarity } from '../types';
import type { BattleResult } from '../combat/CombatTypes';
import { runBattle } from '../combat/CombatEngine';
import { getStage } from '../combat/StageData';
import { archiveSlime as doArchive, unarchiveSlime as doUnarchive } from '../systems/ArchiveSystem';
import { evaluatePrice as doEvaluatePrice } from '../systems/EvaluationSystem';
import { FacilitySystem } from '../systems/FacilitySystem';

/** Getter / Setter injected from main.ts */
type GetState = () => GameState;
type SetState = (s: GameState) => void;

interface GMApi {
  addSlime(): void;
  removeSlime(id: string): void;
  setStats(id: string, partial: Partial<Stats>): void;
  triggerSplit(): void;
  getState(): GameState;
  setCurrency(n: number): void;
  startBattle(stageId: string): BattleResult;
  autoBattle(stageId: string): BattleResult;
  archiveSlime(id: string): { success: boolean; reason?: string };
  unarchiveSlime(id: string): { success: boolean; reason?: string };
  getArchivedSlimes(): Slime[];
  evaluatePrice(id: string): number;
  upgradeFacility(id: string): boolean;
  getFacilities(): Facility[];
}

declare global {
  interface Window {
    __GM?: GMApi;
  }
}

function createDefaultSlime(): Slime {
  const id = `gm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    name: `GM Slime ${id.slice(-4)}`,
    stats: { health: 20, attack: 5, defense: 3, speed: 4, mut: 0.05 },
    traits: [
      {
        id: 'gm',
        name: 'GM-Spawned',
        description: 'Created by GM command',
        rarity: Rarity.Common,
        effect: 'none',
      },
    ],
    skills: [
      {
        id: 'gm-atk',
        name: 'GM Strike',
        type: 'attack',
        targetType: 'single',
        damage: 5,
        cooldown: 1,
      },
    ],
    rarity: Rarity.Common,
    generation: 0,
    parentId: null,
    color: '#ff0',
    position: {
      x: (Math.random() - 0.5) * 4,
      y: 0.5,
      z: (Math.random() - 0.5) * 4,
    },
  };
}

function runBattleWithTeam(getState: GetState, setState: SetState, stageId: string): BattleResult {
  const stage = getStage(stageId);
  if (!stage) {
    throw new Error(`Stage not found: ${stageId}`);
  }

  let s = getState();
  let slimes = s.slimes;

  // If no slimes, create a default GM slime
  if (slimes.length === 0) {
    const gmSlime = createDefaultSlime();
    s = { ...s, slimes: [gmSlime] };
    setState(s);
    slimes = s.slimes;
  }

  // Take up to 4 slimes
  const team = slimes.slice(0, 4);
  return runBattle(team, stage);
}

export function initGM(getState: GetState, setState: SetState): void {
  const api: GMApi = {
    addSlime() {
      const s = getState();
      setState({ ...s, slimes: [...s.slimes, createDefaultSlime()] });
    },
    removeSlime(id: string) {
      const s = getState();
      setState({ ...s, slimes: s.slimes.filter((sl) => sl.id !== id) });
    },
    setStats(id: string, partial: Partial<Stats>) {
      const s = getState();
      setState({
        ...s,
        slimes: s.slimes.map((sl) =>
          sl.id === id ? { ...sl, stats: { ...sl.stats, ...partial } } : sl,
        ),
      });
    },
    triggerSplit() {
      const s = getState();
      if (s.slimes.length === 0) return;
      const parent = s.slimes[Math.floor(Math.random() * s.slimes.length)]!;
      const child: Slime = {
        ...parent,
        id: `gm-split-${Date.now()}`,
        name: `${parent.name} Jr`,
        generation: parent.generation + 1,
        parentId: parent.id,
        position: {
          x: parent.position.x + 1,
          y: 0.5,
          z: parent.position.z,
        },
      };
      setState({ ...s, slimes: [...s.slimes, child] });
    },
    getState() {
      return getState();
    },
    setCurrency(n: number) {
      const s = getState();
      setState({ ...s, currency: n });
    },
    startBattle(stageId: string): BattleResult {
      return runBattleWithTeam(getState, setState, stageId);
    },
    autoBattle(stageId: string): BattleResult {
      return runBattleWithTeam(getState, setState, stageId);
    },
    archiveSlime(id: string) {
      const s = getState();
      const result = doArchive(s, id);
      setState({ ...s, slimes: [...s.slimes], archivedSlimes: [...s.archivedSlimes] });
      return result;
    },
    unarchiveSlime(id: string) {
      const s = getState();
      const result = doUnarchive(s, id);
      setState({ ...s, slimes: [...s.slimes], archivedSlimes: [...s.archivedSlimes] });
      return result;
    },
    getArchivedSlimes() {
      return getState().archivedSlimes;
    },
    evaluatePrice(id: string) {
      const s = getState();
      const slime = s.slimes.find((sl) => sl.id === id) ?? s.archivedSlimes.find((sl) => sl.id === id);
      return slime ? doEvaluatePrice(slime) : 0;
    },
    upgradeFacility(id: string): boolean {
      const s = getState();
      const result = FacilitySystem.upgrade(s, id);
      // Trigger state update so UI reflects changes
      setState({ ...s, facilities: [...s.facilities] });
      return result;
    },
    getFacilities(): Facility[] {
      return getState().facilities;
    },
  };

  window.__GM = api;

  if (import.meta.env.DEV) {
    console.log('[GM] Commands available via window.__GM');
  }
}
