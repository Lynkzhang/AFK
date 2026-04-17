import type { BattleResult, BattleReward } from '../combat/CombatTypes';
import type { Slime } from '../types';
import { runBattle } from '../combat/CombatEngine';
import { getStage } from '../combat/StageData';
import { soundManager } from '../audio/SoundManager';
import { BattleArena } from '../combat/BattleArena';
import { BattleAnimPlayer } from '../combat/BattleAnimPlayer';

export interface BattleUICallbacks {
  onFinish: (result: BattleResult) => void;
}

export class BattleUI {
  readonly root: HTMLDivElement;
  private logContainer: HTMLDivElement;
  private resultContainer: HTMLDivElement;
  private playerUnitsEl: HTMLDivElement;
  private enemyUnitsEl: HTMLDivElement;
  private turnLabel: HTMLDivElement;
  private canvasContainer: HTMLDivElement;
  private callbacks: BattleUICallbacks | null = null;

  private battleResult: BattleResult | null = null;

  private arena: BattleArena | null = null;
  private animPlayer: BattleAnimPlayer | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'battle-panel overlay-panel';

    this.turnLabel = document.createElement('div');
    this.turnLabel.className = 'battle-turn-label';
    this.turnLabel.textContent = '回合 0';

    // Canvas container
    this.canvasContainer = document.createElement('div');
    this.canvasContainer.className = 'battle-canvas-container';

    const unitsRow = document.createElement('div');
    unitsRow.className = 'battle-units-row';

    this.playerUnitsEl = document.createElement('div');
    this.playerUnitsEl.className = 'battle-side player-side';
    this.playerUnitsEl.innerHTML = '<h3>我方</h3>';

    this.enemyUnitsEl = document.createElement('div');
    this.enemyUnitsEl.className = 'battle-side enemy-side';
    this.enemyUnitsEl.innerHTML = '<h3>敌方</h3>';

    unitsRow.append(this.playerUnitsEl, this.enemyUnitsEl);

    const controls = document.createElement('div');
    controls.className = 'battle-controls';
    const skipBtn = document.createElement('button');
    skipBtn.textContent = '跳过动画';
    skipBtn.onclick = () => this.skipToEnd();
    controls.appendChild(skipBtn);

    // Keep log container hidden — canvas replaces visual log
    this.logContainer = document.createElement('div');
    this.logContainer.className = 'battle-log';
    this.logContainer.style.display = 'none';

    this.resultContainer = document.createElement('div');
    this.resultContainer.className = 'battle-result hidden';

    this.root.append(
      this.turnLabel,
      this.canvasContainer,
      unitsRow,
      controls,
      this.logContainer,
      this.resultContainer,
    );
  }

  bind(callbacks: BattleUICallbacks): void {
    this.callbacks = callbacks;
  }

  startBattle(playerSlimes: Slime[], stageId: string): void {
    const stage = getStage(stageId);
    if (!stage) throw new Error(`Stage not found: ${stageId}`);

    this.battleResult = runBattle(playerSlimes, stage);
    this.logContainer.replaceChildren();
    this.resultContainer.classList.add('hidden');
    this.resultContainer.replaceChildren();
    this.turnLabel.textContent = '回合 0';

    // Destroy previous arena
    if (this.arena) {
      this.arena.destroy();
      this.arena = null;
    }
    this.animPlayer = null;

    // Build canvas arena
    this.arena = new BattleArena();
    this.canvasContainer.replaceChildren();
    this.canvasContainer.appendChild(this.arena.getCanvas());

    // Initialize sprites
    const playerData = playerSlimes.map((s) => ({
      name: s.name,
      color: s.color,
      maxHp: s.stats.health,
    }));
    const enemyData = stage.enemies.map((e) => ({
      name: e.name,
      color: '#cc4444',
      maxHp: e.baseHp,
    }));
    this.arena.initUnits(playerData, enemyData);

    // Render initial DOM HP bars
    this.renderInitialUnits(playerSlimes, stage.enemies.map((e) => ({ name: e.name, maxHp: e.baseHp })));

    // Setup anim player
    this.animPlayer = new BattleAnimPlayer(this.arena);
    this.animPlayer.loadLog(this.battleResult.log);
    this.animPlayer.bind({
      onTurnChange: (turn) => {
        this.turnLabel.textContent = `回合 ${turn}`;
        soundManager.playAttack();
      },
      onAction: () => {
        // 每个战斗动作后实时同步HP条
        this.syncHpBars();
      },
      onComplete: () => {
        this.showResult();
      },
    });

    this.arena.start();
    this.animPlayer.play();
  }

  private renderInitialUnits(players: Slime[], enemies: { name: string; maxHp: number }[]): void {
    this.playerUnitsEl.innerHTML = '<h3>我方</h3>';
    this.enemyUnitsEl.innerHTML = '<h3>敌方</h3>';

    for (const p of players) {
      this.playerUnitsEl.appendChild(this.createUnitBar(p.name, p.stats.health, p.stats.health, 'player'));
    }
    for (const e of enemies) {
      this.enemyUnitsEl.appendChild(this.createUnitBar(e.name, e.maxHp, e.maxHp, 'enemy'));
    }
  }

  private createUnitBar(name: string, currentHp: number, maxHp: number, side: 'player' | 'enemy'): HTMLDivElement {
    const bar = document.createElement('div');
    bar.className = `unit-bar ${side}`;
    bar.dataset['name'] = name;

    const nameEl = document.createElement('div');
    nameEl.className = 'unit-name';
    nameEl.textContent = name;

    const hpOuter = document.createElement('div');
    hpOuter.className = 'hp-bar-outer';
    const hpInner = document.createElement('div');
    hpInner.className = 'hp-bar-inner';
    const pct = maxHp > 0 ? Math.max(0, currentHp / maxHp) * 100 : 0;
    hpInner.style.width = `${pct}%`;
    hpOuter.appendChild(hpInner);

    const hpText = document.createElement('div');
    hpText.className = 'hp-text';
    hpText.textContent = `${currentHp}/${maxHp}`;

    bar.append(nameEl, hpOuter, hpText);
    return bar;
  }

  private syncHpBars(): void {
    if (!this.arena) return;
    for (const sprite of this.arena.getAllSprites()) {
      const bar = this.root.querySelector<HTMLDivElement>(`.unit-bar[data-name="${CSS.escape(sprite.name)}"]`);
      if (!bar) continue;
      const hpInner = bar.querySelector<HTMLDivElement>('.hp-bar-inner');
      const hpText = bar.querySelector<HTMLDivElement>('.hp-text');
      if (hpInner) {
        const pct = sprite.maxHp > 0 ? Math.max(0, sprite.currentHp / sprite.maxHp) * 100 : 0;
        hpInner.style.width = `${pct}%`;
      }
      if (hpText) {
        hpText.textContent = `${Math.max(0, sprite.currentHp)}/${sprite.maxHp}`;
      }
    }
  }

  private skipToEnd(): void {
    if (this.animPlayer) {
      this.animPlayer.skipAll();
    } else {
      this.showResult();
    }
    // Final HP bar sync
    this.syncHpBars();
  }

  private showResult(): void {
    if (!this.battleResult) return;
    const r = this.battleResult;

    // Final sync
    this.syncHpBars();
    if (this.arena) this.arena.stop();

    this.resultContainer.classList.remove('hidden');
    this.resultContainer.replaceChildren();

    const header = document.createElement('h3');
    header.textContent = r.victory ? '🎉 战斗胜利!' : '💀 战斗失败';
    header.className = r.victory ? 'result-victory' : 'result-defeat';

    const starsEl = document.createElement('div');
    starsEl.className = 'result-stars';
    starsEl.textContent = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars);

    const info = document.createElement('div');
    info.className = 'result-info';
    info.innerHTML = `回合: ${r.turnsUsed}/${r.maxTurns} | 阵亡: ${r.alliesDead}`;

    const rewardsEl = document.createElement('div');
    rewardsEl.className = 'result-rewards';
    if (r.victory) {
      rewardsEl.innerHTML = this.formatRewards(r.rewards);
    }

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '确定';
    closeBtn.className = 'confirm-btn';
    closeBtn.onclick = () => this.callbacks?.onFinish(r);

    this.resultContainer.append(header, starsEl, info, rewardsEl, closeBtn);
  }

  private formatRewards(rewards: BattleReward): string {
    let html = `<div>💰 金币 +${rewards.gold}</div>`;
    if (rewards.crystals > 0) html += `<div>💎 水晶 +${rewards.crystals}</div>`;
    for (const item of rewards.items) {
      html += `<div>📦 ${item.name} x${item.count}</div>`;
    }
    return html;
  }

  show(): void {
    this.root.style.display = 'flex';
  }

  hide(): void {
    this.root.style.display = 'none';
    if (this.arena) {
      this.arena.stop();
      this.arena.destroy();
      this.arena = null;
    }
    this.animPlayer = null;
  }
}
