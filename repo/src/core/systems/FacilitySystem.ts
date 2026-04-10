import type { Facility, GameState } from '../types';

export const DEFAULT_FACILITIES: Facility[] = [
  {
    id: 'breeding-accelerator',
    name: '繁殖加速器',
    level: 1,
    active: true,
    effect: '缩短分裂间隔',
    upgradeCost: 100,
    maxLevel: 10,
  },
  {
    id: 'field-expansion',
    name: '场地扩展',
    level: 1,
    active: true,
    effect: '每级+2容量',
    upgradeCost: 150,
    maxLevel: 10,
  },
  {
    id: 'archive-expansion',
    name: '封存扩展',
    level: 1,
    active: true,
    effect: '每级+5封存容量',
    upgradeCost: 120,
    maxLevel: 10,
  },
  {
    id: 'mutation-lab',
    name: '变异实验室',
    level: 1,
    active: true,
    effect: '提高变异率',
    upgradeCost: 200,
    maxLevel: 10,
  },
];

export class FacilitySystem {
  static getUpgradeCost(f: Facility): number {
    return Math.ceil(f.upgradeCost * f.level * 1.5);
  }

  static upgrade(state: GameState, id: string): boolean {
    const facility = state.facilities.find((f) => f.id === id);
    if (!facility) return false;
    if (facility.level >= facility.maxLevel) return false;
    const cost = FacilitySystem.getUpgradeCost(facility);
    if (state.currency < cost) return false;
    state.currency -= cost;
    facility.level += 1;
    return true;
  }

  static getLevel(state: GameState, id: string): number {
    const facility = state.facilities.find((f) => f.id === id);
    return facility ? facility.level : 0;
  }

  static getSplitInterval(state: GameState): number {
    const level = FacilitySystem.getLevel(state, 'breeding-accelerator');
    return Math.round(10000 / (1 + 0.1 * (level - 1)));
  }

  static getMaxCapacity(state: GameState): number {
    const level = FacilitySystem.getLevel(state, 'field-expansion');
    const baseCapacity = (state.onboarding && state.onboarding.currentStep !== null) ? 6 : 12;
    return baseCapacity + 2 * (level - 1);
  }

  static getArchiveCapacity(state: GameState): number {
    const level = FacilitySystem.getLevel(state, 'archive-expansion');
    return 10 + 5 * (level - 1);
  }

  static getMutationMultiplier(state: GameState): number {
    const level = FacilitySystem.getLevel(state, 'mutation-lab');
    return 1 + 0.15 * (level - 1);
  }
}
