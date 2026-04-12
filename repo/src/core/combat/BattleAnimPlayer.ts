// ===== BattleAnimPlayer.ts =====
// Converts BattleLogEntry[] into timed animation clips for BattleArena.

import type { BattleLogEntry } from './CombatTypes';
import type { BattleArena } from './BattleArena';
import type { BattleUnitSprite } from './BattleUnitSprite';

export type AnimClipType =
  | 'attack'
  | 'crit'
  | 'dodge'
  | 'heal'
  | 'shield'
  | 'dot'
  | 'rage'
  | 'skip'
  | 'status'
  | 'buff';

interface AnimClip {
  type: AnimClipType;
  entry: BattleLogEntry;
  duration: number;
}

export interface AnimPlayerCallbacks {
  onTurnChange: (turn: number) => void;
  onComplete: () => void;
}

export class BattleAnimPlayer {
  private arena: BattleArena;
  private clips: AnimClip[] = [];
  private currentIndex = 0;
  private playing = false;
  private callbacks: AnimPlayerCallbacks | null = null;
  private lastTurn = 0;
  private animTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(arena: BattleArena) {
    this.arena = arena;
  }

  bind(callbacks: AnimPlayerCallbacks): void {
    this.callbacks = callbacks;
  }

  loadLog(log: BattleLogEntry[]): void {
    this.clips = [];
    this.currentIndex = 0;
    this.lastTurn = 0;

    for (const entry of log) {
      let type: AnimClipType;
      let duration = 600;

      switch (entry.detail) {
        case 'HIT':
          type = 'attack';
          duration = 700;
          break;
        case 'CRIT':
          type = 'crit';
          duration = 900;
          break;
        case 'DODGE':
          type = 'dodge';
          duration = 600;
          break;
        case 'HEAL':
          type = 'heal';
          duration = 600;
          break;
        case 'SHIELD':
          type = 'shield';
          duration = 500;
          break;
        case 'DOT_DAMAGE':
          type = 'dot';
          duration = 500;
          break;
        default:
          if (entry.action === 'RAGE') {
            type = 'rage';
            duration = 1000;
          } else if (entry.action === 'SKIP') {
            type = 'skip';
            duration = 400;
          } else if (entry.detail.includes('applied')) {
            type = 'status';
            duration = 300;
          } else {
            type = 'buff';
            duration = 300;
          }
          break;
      }

      this.clips.push({ type, entry, duration });
    }
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.playNextClip();
  }

  skipAll(): void {
    // Cancel any pending timer
    if (this.animTimer) {
      clearTimeout(this.animTimer);
      this.animTimer = null;
    }
    this.playing = false;

    // Apply all remaining state changes instantly
    for (let i = this.currentIndex; i < this.clips.length; i++) {
      const clip = this.clips[i]!;
      this.applyClipState(clip);
    }
    this.currentIndex = this.clips.length;

    if (this.clips.length > 0) {
      const lastClip = this.clips[this.clips.length - 1]!;
      if (this.callbacks) this.callbacks.onTurnChange(lastClip.entry.turn);
    }
    if (this.callbacks) this.callbacks.onComplete();
  }

  // Apply only the state changes (no animation) — used for skip
  private applyClipState(clip: AnimClip): void {
    const entry = clip.entry;

    if (entry.turn !== this.lastTurn) {
      this.lastTurn = entry.turn;
    }

    const targetSprite = this.arena.getSprite(entry.target);
    const actorSprite = this.arena.getSprite(entry.actorName);

    switch (clip.type) {
      case 'attack':
      case 'crit':
        if (targetSprite) {
          if (entry.value > 0) {
            const newHp = Math.max(0, targetSprite.currentHp - entry.value);
            targetSprite.updateHp(newHp, targetSprite.shield);
            if (newHp <= 0) targetSprite.startDeath();
          }
        }
        break;
      case 'heal':
        if (targetSprite) {
          const newHp = Math.min(targetSprite.maxHp, targetSprite.currentHp + entry.value);
          targetSprite.updateHp(newHp, targetSprite.shield);
        }
        break;
      case 'shield':
        if (actorSprite) {
          actorSprite.shield = entry.value;
        }
        break;
      case 'dot':
        if (targetSprite) {
          const newHp = Math.max(0, targetSprite.currentHp - entry.value);
          targetSprite.updateHp(newHp, targetSprite.shield);
          if (newHp <= 0) targetSprite.startDeath();
        }
        break;
      case 'status': {
        const statusTarget = this.arena.getSprite(entry.target) ?? this.arena.getSprite(entry.actorName);
        if (statusTarget) {
          const icon = this.detailToIcon(entry.detail);
          if (icon && !statusTarget.statusIcons.includes(icon)) {
            statusTarget.setStatusIcons([...statusTarget.statusIcons, icon]);
          }
        }
        break;
      }
      default:
        break;
    }
  }

  private detailToIcon(detail: string): string | null {
    if (detail.includes('POISON') || detail.includes('poison')) return 'poison';
    if (detail.includes('BURN') || detail.includes('burn')) return 'burn';
    if (detail.includes('FREEZE') || detail.includes('freeze')) return 'freeze';
    return null;
  }

  private playNextClip(): void {
    if (!this.playing) return;

    if (this.currentIndex >= this.clips.length) {
      this.playing = false;
      if (this.callbacks) this.callbacks.onComplete();
      return;
    }

    const clip = this.clips[this.currentIndex]!;
    this.currentIndex++;

    // Notify turn change
    if (clip.entry.turn !== this.lastTurn) {
      this.lastTurn = clip.entry.turn;
      if (this.callbacks) this.callbacks.onTurnChange(clip.entry.turn);
    }

    this.executeClip(clip);

    this.animTimer = setTimeout(() => {
      this.playNextClip();
    }, clip.duration);
  }

  private executeClip(clip: AnimClip): void {
    const entry = clip.entry;
    const effects = this.arena.getEffects();
    const actorSprite = this.arena.getSprite(entry.actorName);
    const targetSprite = this.arena.getSprite(entry.target);

    switch (clip.type) {
      case 'attack':
      case 'crit':
        this.executeAttackClip(clip, actorSprite, targetSprite);
        break;

      case 'dodge':
        this.executeDodgeClip(actorSprite, targetSprite);
        break;

      case 'heal':
        if (targetSprite) {
          effects.addHealParticles(targetSprite.x, targetSprite.y);
          effects.addHealFloat(targetSprite.x, targetSprite.y - 20, entry.value);
          const newHp = Math.min(targetSprite.maxHp, targetSprite.currentHp + entry.value);
          targetSprite.updateHp(newHp, targetSprite.shield);
        }
        break;

      case 'shield':
        if (actorSprite) {
          actorSprite.shield = entry.value;
        }
        break;

      case 'dot':
        if (targetSprite) {
          targetSprite.flashTimer = 0.2;
          effects.addDotFloat(targetSprite.x, targetSprite.y - 20, entry.value);
          const newHp = Math.max(0, targetSprite.currentHp - entry.value);
          targetSprite.updateHp(newHp, targetSprite.shield);
          if (newHp <= 0) targetSprite.startDeath();
        }
        break;

      case 'rage':
        effects.triggerRageFlash();
        if (actorSprite) {
          this.pulseScale(actorSprite);
        }
        break;

      case 'status': {
        const statusTarget = targetSprite ?? actorSprite;
        if (statusTarget) {
          const icon = this.detailToIcon(entry.detail);
          if (icon && !statusTarget.statusIcons.includes(icon)) {
            statusTarget.setStatusIcons([...statusTarget.statusIcons, icon]);
          }
        }
        break;
      }

      case 'skip':
        // Show frozen/stunned icon above actor
        break;

      case 'buff':
        // No special visual
        break;
    }
  }

  private executeAttackClip(
    clip: AnimClip,
    actorSprite: BattleUnitSprite | undefined,
    targetSprite: BattleUnitSprite | undefined,
  ): void {
    const entry = clip.entry;
    const effects = this.arena.getEffects();
    const isCrit = clip.type === 'crit';

    if (!actorSprite || !targetSprite) {
      // Still apply HP update even if sprites not found
      if (targetSprite && entry.value > 0) {
        const newHp = Math.max(0, targetSprite.currentHp - entry.value);
        targetSprite.updateHp(newHp, targetSprite.shield);
        if (newHp <= 0) targetSprite.startDeath();
      }
      return;
    }

    const startX = actorSprite.x;
    const dx = targetSprite.x - actorSprite.x;
    const sign = dx > 0 ? 1 : -1;
    const rushTargetX = targetSprite.x - sign * 50;

    // Sprint toward target
    const steps = 10;
    let step = 0;
    const rushTimer = setInterval(() => {
      step++;
      actorSprite.x = startX + (rushTargetX - startX) * (step / steps);
      if (step >= steps) {
        clearInterval(rushTimer);

        // Hit effects
        targetSprite.flashTimer = 0.15;
        if (entry.value > 0) {
          effects.addDamageFloat(targetSprite.x, targetSprite.y - 20, entry.value, isCrit);
          if (isCrit) {
            effects.addCritBurst(targetSprite.x, targetSprite.y);
          }
          const newHp = Math.max(0, targetSprite.currentHp - entry.value);
          targetSprite.updateHp(newHp, targetSprite.shield);
          if (newHp <= 0) targetSprite.startDeath();
        }

        // Return to home
        setTimeout(() => {
          let rStep = 0;
          const returnTimer = setInterval(() => {
            rStep++;
            actorSprite.x = rushTargetX + (actorSprite.homeX - rushTargetX) * (rStep / 12);
            if (rStep >= 12) {
              clearInterval(returnTimer);
              actorSprite.x = actorSprite.homeX;
            }
          }, 16);
        }, 150);
      }
    }, 16);
  }

  private executeDodgeClip(
    actorSprite: BattleUnitSprite | undefined,
    targetSprite: BattleUnitSprite | undefined,
  ): void {
    const effects = this.arena.getEffects();

    if (targetSprite) {
      // Target dodge flash
      const origX = targetSprite.x;
      const dodgeOffset = targetSprite.side === 0 ? -30 : 30;
      targetSprite.x = origX + dodgeOffset;
      effects.addMissFloat(targetSprite.x, targetSprite.y - 20);

      setTimeout(() => {
        if (targetSprite) {
          targetSprite.x = origX;
        }
      }, 150);
    }

    // Actor still rushes
    if (actorSprite && targetSprite) {
      const startX = actorSprite.x;
      const dx = targetSprite.homeX - actorSprite.x;
      const sign = dx > 0 ? 1 : -1;
      const rushTargetX = targetSprite.homeX - sign * 50;
      let step = 0;
      const rushTimer = setInterval(() => {
        step++;
        actorSprite.x = startX + (rushTargetX - startX) * (step / 8);
        if (step >= 8) {
          clearInterval(rushTimer);
          setTimeout(() => {
            actorSprite.x = actorSprite.homeX;
          }, 200);
        }
      }, 16);
      // Prevent unused variable warning
      void rushTimer;
    }
  }

  private pulseScale(sprite: BattleUnitSprite): void {
    // Brief flash to indicate rage
    sprite.flashTimer = 0.3;
    setTimeout(() => {
      sprite.flashTimer = 0;
    }, 300);
  }
}
