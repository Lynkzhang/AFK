import type { BattleResult, BattleLogEntry, BattleReward } from '../combat/CombatTypes';
import type { Slime } from '../types';
import { runBattle } from '../combat/CombatEngine';
import { getStage } from '../combat/StageData';
import { soundManager } from '../audio/SoundManager';

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
  private callbacks: BattleUICallbacks | null = null;

  private battleResult: BattleResult | null = null;
  private currentLogIndex = 0;
  private playTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'battle-panel overlay-panel';

    this.turnLabel = document.createElement('div');
    this.turnLabel.className = 'battle-turn-label';
    this.turnLabel.textContent = '回合 0';

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

    this.logContainer = document.createElement('div');
    this.logContainer.className = 'battle-log';

    this.resultContainer = document.createElement('div');
    this.resultContainer.className = 'battle-result hidden';

    this.root.append(this.turnLabel, unitsRow, controls, this.logContainer, this.resultContainer);
  }

  bind(callbacks: BattleUICallbacks): void {
    this.callbacks = callbacks;
  }

  startBattle(playerSlimes: Slime[], stageId: string): void {
    const stage = getStage(stageId);
    if (!stage) throw new Error(`Stage not found: ${stageId}`);

    this.battleResult = runBattle(playerSlimes, stage);
    this.currentLogIndex = 0;
    this.logContainer.replaceChildren();
    this.resultContainer.classList.add('hidden');
    this.resultContainer.replaceChildren();

    this.renderInitialUnits(playerSlimes, stage.enemies.map((e) => ({ name: e.name, maxHp: e.baseHp })));
    this.playLog();
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

  private playLog(): void {
    if (this.playTimer) clearInterval(this.playTimer);
    const log = this.battleResult?.log ?? [];
    this.playTimer = setInterval(() => {
      if (this.currentLogIndex >= log.length) {
        if (this.playTimer) clearInterval(this.playTimer);
        this.playTimer = null;
        this.showResult();
        return;
      }
      const entry = log[this.currentLogIndex]!;
      this.appendLogEntry(entry);
      this.turnLabel.textContent = `回合 ${entry.turn}`;
      this.currentLogIndex++;
    }, 300);
  }

  private skipToEnd(): void {
    if (this.playTimer) clearInterval(this.playTimer);
    this.playTimer = null;
    const log = this.battleResult?.log ?? [];
    while (this.currentLogIndex < log.length) {
      this.appendLogEntry(log[this.currentLogIndex]!);
      this.currentLogIndex++;
    }
    if (log.length > 0) {
      this.turnLabel.textContent = `回合 ${log[log.length - 1]!.turn}`;
    }
    this.showResult();
  }

  private appendLogEntry(entry: BattleLogEntry): void {
    // Play battle sounds
    if (entry.detail === 'HEAL') {
      soundManager.playHeal();
    } else if (entry.detail === 'SHIELD' || entry.detail === 'DODGE') {
      soundManager.playDefense();
    } else if (entry.action !== 'DOT' && entry.action !== 'SKIP' && entry.action !== 'RAGE') {
      soundManager.playAttack();
    }

    const line = document.createElement('div');
    line.className = `log-entry log-${entry.detail.toLowerCase().replace(/[^a-z]/g, '')}`;
    let text = `[回合${entry.turn}] ${entry.actorName}`;
    if (entry.action === 'DOT') {
      text += ` 受到持续伤害 ${entry.value}`;
    } else if (entry.action === 'SKIP') {
      text += ` 被控制，跳过行动 (${entry.detail})`;
    } else if (entry.action === 'RAGE') {
      text += ` 进入狂暴状态！${entry.detail}`;
    } else if (entry.detail === 'DODGE') {
      text += ` → ${entry.target} ${entry.action} MISS`;
    } else if (entry.detail === 'HEAL') {
      text += ` → ${entry.target} 治疗 +${entry.value}`;
    } else if (entry.detail === 'SHIELD') {
      text += ` 施放 ${entry.action}，护盾 ${entry.value}`;
    } else {
      text += ` → ${entry.target} ${entry.action} ${entry.value}`;
      if (entry.detail === 'CRIT') text += ' 暴击!';
    }
    line.textContent = text;
    this.logContainer.appendChild(line);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }

  private showResult(): void {
    if (!this.battleResult) return;
    const r = this.battleResult;
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

  show(): void { this.root.style.display = 'flex'; }
  hide(): void {
    this.root.style.display = 'none';
    if (this.playTimer) clearInterval(this.playTimer);
    this.playTimer = null;
  }
}
