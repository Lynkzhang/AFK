import type { GameState, Facility } from '../types';
import { FacilitySystem } from '../systems/FacilitySystem';

interface FacilityUIHandlers {
  onUpgrade: (id: string) => void;
  onBack: () => void;
}

export class FacilityUI {
  readonly root: HTMLDivElement;
  private handlers: FacilityUIHandlers | null = null;
  private readonly titleEl: HTMLHeadingElement;
  private readonly cardsContainer: HTMLDivElement;
  private readonly backBtn: HTMLButtonElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'facility-panel';

    this.titleEl = document.createElement('h2');
    this.titleEl.textContent = '设施管理';

    this.cardsContainer = document.createElement('div');
    this.cardsContainer.className = 'facility-cards';

    this.backBtn = document.createElement('button');
    this.backBtn.className = 'facility-back-btn';
    this.backBtn.textContent = '返回';

    this.root.append(this.titleEl, this.cardsContainer, this.backBtn);
  }

  bind(handlers: FacilityUIHandlers): void {
    this.handlers = handlers;
    this.backBtn.onclick = () => handlers.onBack();
  }

  render(state: GameState): void {
    this.cardsContainer.replaceChildren(
      ...state.facilities.map((f) => this.createCard(f, state)),
    );
  }

  show(): void {
    this.root.style.display = '';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  private createCard(facility: Facility, state: GameState): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'facility-card';

    const nameEl = document.createElement('div');
    nameEl.className = 'facility-name';
    nameEl.textContent = facility.name;

    const levelEl = document.createElement('div');
    levelEl.className = 'facility-level';
    levelEl.textContent = `等级: ${facility.level} / ${facility.maxLevel}`;

    const effectEl = document.createElement('div');
    effectEl.className = 'facility-effect';
    effectEl.textContent = `效果: ${this.getEffectDescription(facility, state)}`;

    const costEl = document.createElement('div');
    costEl.className = 'facility-cost';
    const isMaxLevel = facility.level >= facility.maxLevel;
    costEl.textContent = isMaxLevel
      ? '已满级'
      : `升级费用: ${FacilitySystem.getUpgradeCost(facility)}`;

    const upgradeBtn = document.createElement('button');
    upgradeBtn.className = 'facility-upgrade-btn';
    upgradeBtn.textContent = isMaxLevel ? '已满级' : '升级';
    upgradeBtn.disabled = isMaxLevel || state.currency < FacilitySystem.getUpgradeCost(facility);
    upgradeBtn.onclick = () => {
      this.handlers?.onUpgrade(facility.id);
    };

    card.append(nameEl, levelEl, effectEl, costEl, upgradeBtn);
    return card;
  }

  private getEffectDescription(facility: Facility, state: GameState): string {
    switch (facility.id) {
      case 'breeding-accelerator':
        return `分裂间隔 ${FacilitySystem.getSplitInterval(state)}ms`;
      case 'field-expansion':
        return `最大容量 ${FacilitySystem.getMaxCapacity(state)}`;
      case 'archive-expansion':
        return `封存容量 ${FacilitySystem.getArchiveCapacity(state)}`;
      case 'mutation-lab':
        return `变异倍率 ${FacilitySystem.getMutationMultiplier(state).toFixed(2)}x`;
      default:
        return facility.effect;
    }
  }
}
