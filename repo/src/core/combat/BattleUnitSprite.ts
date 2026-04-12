// ===== BattleUnitSprite.ts =====
// Pixel-art sprite for a single battle unit rendered on a Canvas2D context.

export type SpriteState = 'idle' | 'attack' | 'hit' | 'dead' | 'dodge';

// 10x10 pixel template (val: 0=transparent, 1=body, 2=outline, 3=eyes, 4=highlight)
const SPRITE_TEMPLATE: number[][] = [
  [0, 0, 2, 2, 2, 2, 2, 0, 0, 0],
  [0, 2, 1, 1, 1, 1, 1, 2, 0, 0],
  [2, 1, 4, 1, 1, 1, 1, 1, 2, 0],
  [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
  [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
  [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
  [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
  [0, 2, 1, 1, 1, 1, 1, 2, 0, 0],
  [0, 2, 2, 1, 1, 1, 2, 2, 0, 0],
  [0, 0, 2, 2, 2, 2, 2, 0, 0, 0],
];

const PIXEL = 4; // each logical pixel = 4 real px

export class BattleUnitSprite {
  name: string;
  side: 0 | 1;
  slotIndex: number;
  color: string;

  homeX: number;
  homeY: number;
  x: number;
  y: number;

  state: SpriteState = 'idle';
  hpPercent: number = 1;
  maxHp: number;
  currentHp: number;
  shield: number = 0;
  alive: boolean = true;
  statusIcons: string[] = [];

  alpha: number = 1;
  flashTimer: number = 0;

  constructor(
    name: string,
    side: 0 | 1,
    slotIndex: number,
    color: string,
    maxHp: number,
    homeX: number,
    homeY: number,
  ) {
    this.name = name;
    this.side = side;
    this.slotIndex = slotIndex;
    this.color = color;
    this.maxHp = maxHp;
    this.currentHp = maxHp;
    this.homeX = homeX;
    this.homeY = homeY;
    this.x = homeX;
    this.y = homeY;
  }

  updateHp(current: number, shield: number): void {
    this.currentHp = Math.max(0, current);
    this.shield = Math.max(0, shield);
    this.hpPercent = this.maxHp > 0 ? this.currentHp / this.maxHp : 0;
    if (this.currentHp <= 0) {
      this.alive = false;
    }
  }

  setStatusIcons(icons: string[]): void {
    this.statusIcons = [...icons];
  }

  startDeath(): void {
    this.alive = false;
    this.state = 'dead';
  }

  isFullyDead(): boolean {
    return !this.alive && this.alpha <= 0;
  }

  private getPixelColor(val: number): string {
    switch (val) {
      case 1: return this.color;
      case 2: return '#222222';
      case 3: return '#111111';
      case 4: return this.lightenColor(this.color, 50);
      default: return 'transparent';
    }
  }

  private lightenColor(hex: string, amount: number): string {
    // simple lightening: parse #rrggbb or CSS color
    try {
      const clean = hex.replace('#', '');
      if (clean.length !== 6) return hex;
      const r = Math.min(255, parseInt(clean.slice(0, 2), 16) + amount);
      const g = Math.min(255, parseInt(clean.slice(2, 4), 16) + amount);
      const b = Math.min(255, parseInt(clean.slice(4, 6), 16) + amount);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch {
      return hex;
    }
  }

  private drawHpBar(ctx: CanvasRenderingContext2D): void {
    const barW = 40;
    const barH = 4;
    const bx = -barW / 2;
    const by = PIXEL * 5 + 4; // below sprite

    // background
    ctx.fillStyle = '#333';
    ctx.fillRect(bx, by, barW, barH);

    // hp fill
    const pct = Math.max(0, Math.min(1, this.hpPercent));
    ctx.fillStyle = pct > 0.5 ? '#44ee44' : pct > 0.25 ? '#ffcc00' : '#ee4444';
    ctx.fillRect(bx, by, barW * pct, barH);

    // border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, barW, barH);
  }

  private drawStatusIcons(ctx: CanvasRenderingContext2D): void {
    const iconY = -PIXEL * 5 - 14;
    let iconX = -((this.statusIcons.length - 1) * 10) / 2;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const icon of this.statusIcons) {
      switch (icon) {
        case 'poison': ctx.fillStyle = '#cc44ff'; ctx.fillText('☠', iconX, iconY); break;
        case 'burn':   ctx.fillStyle = '#ff6600'; ctx.fillText('🔥', iconX, iconY); break;
        case 'freeze': ctx.fillStyle = '#66ccff'; ctx.fillText('❄', iconX, iconY); break;
        default: break;
      }
      iconX += 10;
    }
  }

  private drawShieldFrame(ctx: CanvasRenderingContext2D): void {
    const r = PIXEL * 5 + 6;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(80, 180, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    if (!this.alive && this.alpha <= 0) return;

    // Update death fade
    if (!this.alive && this.alpha > 0) {
      this.alpha = Math.max(0, this.alpha - 0.02);
    }

    // Update flash timer
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - 0.016);
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.side === 1) ctx.scale(-1, 1);
    ctx.globalAlpha = this.alpha;

    // Breathing scale
    const breathScale = 1 + Math.sin(time * 2) * 0.02;
    ctx.scale(breathScale, breathScale);

    // Draw 10x10 pixel template
    for (let row = 0; row < 10; row++) {
      // Death dissolve: bottom rows disappear first
      if (!this.alive && row > 10 * this.alpha) continue;

      for (let col = 0; col < 10; col++) {
        const val = SPRITE_TEMPLATE[row]![col]!;
        if (val === 0) continue;

        if (this.flashTimer > 0) {
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = this.getPixelColor(val);
        }
        ctx.fillRect((col - 5) * PIXEL, (row - 5) * PIXEL, PIXEL, PIXEL);
      }
    }

    // HP bar
    this.drawHpBar(ctx);

    // Status icons
    if (this.statusIcons.length > 0) {
      this.drawStatusIcons(ctx);
    }

    // Shield frame
    if (this.shield > 0) {
      this.drawShieldFrame(ctx);
    }

    ctx.restore();
  }
}
