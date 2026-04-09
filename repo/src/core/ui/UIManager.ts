import type { GameState } from '../types';

interface UIHandlers {
  onNewGame: () => void;
  onSave: () => void;
  onLoad: () => void;
}

export class UIManager {
  readonly root: HTMLDivElement;
  private readonly currencyEl: HTMLSpanElement;
  private readonly slimeCountEl: HTMLSpanElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'ui-panel';

    const title = document.createElement('h1');
    title.textContent = 'Slime Keeper';

    const currency = document.createElement('div');
    currency.innerHTML = 'Currency: <span>0</span>';
    this.currencyEl = currency.querySelector('span') as HTMLSpanElement;

    const slimeCount = document.createElement('div');
    slimeCount.innerHTML = 'Slimes: <span>0</span>';
    this.slimeCountEl = slimeCount.querySelector('span') as HTMLSpanElement;

    const actions = document.createElement('div');
    actions.className = 'ui-actions';

    const newBtn = this.makeButton('新游戏');
    const saveBtn = this.makeButton('保存');
    const loadBtn = this.makeButton('加载');

    actions.append(newBtn, saveBtn, loadBtn);
    this.root.append(title, currency, slimeCount, actions);

    this.buttons = { newBtn, saveBtn, loadBtn };
  }

  private readonly buttons: {
    newBtn: HTMLButtonElement;
    saveBtn: HTMLButtonElement;
    loadBtn: HTMLButtonElement;
  };

  private makeButton(label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    return btn;
  }

  bind(handlers: UIHandlers): void {
    this.buttons.newBtn.onclick = handlers.onNewGame;
    this.buttons.saveBtn.onclick = handlers.onSave;
    this.buttons.loadBtn.onclick = handlers.onLoad;
  }

  render(state: GameState): void {
    this.currencyEl.textContent = state.currency.toFixed(0);
    this.slimeCountEl.textContent = String(state.slimes.length);
  }
}
