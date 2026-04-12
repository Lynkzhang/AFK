// ===== BattleArena.ts =====
// Canvas battle arena: manages sprites, render loop, background.

import { BattleUnitSprite } from './BattleUnitSprite';
import { BattleEffects } from './BattleEffects';

// Slot coordinates for 4v4 layout
const PLAYER_SLOTS: [number, number][] = [
  [100, 100],
  [80,  160],
  [100, 220],
  [80,  280],
];

const ENEMY_SLOTS: [number, number][] = [
  [540, 100],
  [560, 160],
  [540, 220],
  [560, 280],
];

export class BattleArena {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sprites: BattleUnitSprite[] = [];
  private rafId: number = 0;
  private running = false;
  private startTime = 0;
  private effects: BattleEffects;

  static readonly WIDTH = 640;
  static readonly HEIGHT = 360;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = BattleArena.WIDTH;
    this.canvas.height = BattleArena.HEIGHT;
    this.canvas.style.display = 'block';
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.maxWidth = '100%';
    this.canvas.style.borderRadius = '12px';

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;

    this.effects = new BattleEffects(BattleArena.WIDTH, BattleArena.HEIGHT);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getEffects(): BattleEffects {
    return this.effects;
  }

  initUnits(
    playerData: { name: string; color: string; maxHp: number }[],
    enemyData: { name: string; color: string; maxHp: number }[],
  ): void {
    this.sprites = [];

    for (let i = 0; i < playerData.length && i < 4; i++) {
      const p = playerData[i]!;
      const slot = PLAYER_SLOTS[i] ?? PLAYER_SLOTS[0]!;
      const sprite = new BattleUnitSprite(p.name, 0, i, p.color, p.maxHp, slot[0], slot[1]);
      this.sprites.push(sprite);
    }

    for (let i = 0; i < enemyData.length && i < 4; i++) {
      const e = enemyData[i]!;
      const slot = ENEMY_SLOTS[i] ?? ENEMY_SLOTS[0]!;
      const sprite = new BattleUnitSprite(e.name, 1, i, e.color, e.maxHp, slot[0], slot[1]);
      this.sprites.push(sprite);
    }
  }

  getSprite(name: string): BattleUnitSprite | undefined {
    return this.sprites.find((s) => s.name === name);
  }

  getAllSprites(): BattleUnitSprite[] {
    return this.sprites;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = performance.now();
    this.rafId = requestAnimationFrame((t) => this.render(t));
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private render(timestamp: number): void {
    if (!this.running) return;
    const time = (timestamp - this.startTime) / 1000;

    this.ctx.clearRect(0, 0, BattleArena.WIDTH, BattleArena.HEIGHT);
    this.drawBackground();

    for (const sprite of this.sprites) {
      sprite.draw(this.ctx, time);
    }

    this.effects.draw(this.ctx, time);

    this.rafId = requestAnimationFrame((t) => this.render(t));
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const W = BattleArena.WIDTH;
    const H = BattleArena.HEIGHT;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    sky.addColorStop(0, '#1a1a3e');
    sky.addColorStop(1, '#3a2a5e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H * 0.6);

    // Ground (pixel sandy)
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(0, H * 0.6, W, H * 0.4);

    // Ground texture — alternating darker rows
    ctx.fillStyle = '#3a2a1a';
    for (let y = Math.floor(H * 0.6); y < H; y += 8) {
      ctx.fillRect(0, y, W, 4);
    }

    // Divider line
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    const starPositions = [
      [50, 30], [120, 50], [200, 20], [320, 40], [450, 25], [580, 45],
      [80, 70], [260, 60], [400, 70], [530, 80],
    ];
    for (const [sx, sy] of starPositions) {
      ctx.fillRect(sx!, sy!, 1, 1);
    }
  }

  destroy(): void {
    this.stop();
    this.effects.clear();
    this.sprites = [];
  }
}
