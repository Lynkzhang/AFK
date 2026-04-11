import { Rarity } from '../types';
import type { GameState, Slime } from '../types';

// ---------------------------------------------------------------------------
// Pixel art Canvas2DRenderer
// Renders a pixel-art style scene with 8x8 pixel-block slimes.
// ---------------------------------------------------------------------------

/** 10x10 slime template — 0=transparent, 1=body, 2=outline, 3=eye, 4=highlight */
const SLIME_IDLE: number[][] = [
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

/** 10x10 slime bounce frame — slightly squished vertically */
const SLIME_BOUNCE: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 2, 2, 2, 2, 2, 2, 2, 0, 0],
  [2, 1, 4, 1, 1, 1, 1, 1, 2, 0],
  [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
  [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
  [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
  [0, 2, 1, 1, 1, 1, 1, 2, 0, 0],
  [0, 2, 2, 1, 2, 1, 2, 2, 0, 0],
  [0, 2, 2, 2, 2, 2, 2, 2, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const GRID = 10; // template size

export class Canvas2DRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState | null = null;
  private elapsedTime = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.imageRendering = 'pixelated';
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context is not supported');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.resize(container);
    window.addEventListener('resize', () => this.resize(container));
  }

  update(state: GameState, elapsedTime: number): void {
    this.state = state;
    this.elapsedTime = elapsedTime;
  }

  render(): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    this.drawBackground();
    if (!this.state) return;

    const sortedSlimes = [...this.state.slimes].sort((a, b) => a.position.z - b.position.z);
    for (const slime of sortedSlimes) {
      this.drawSlime(slime);
    }
  }

  private resize(container: HTMLElement): void {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  // ---------------------------------------------------------------------------
  // Background — pixel art bands for sky, pixel grid for grass, decorations
  // ---------------------------------------------------------------------------

  private drawBackground(): void {
    const { ctx } = this;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const grassTop = Math.floor(h * 0.68);

    // --- Sky: horizontal color-band stripes (each 4-6px tall) ---
    const skyColors = [
      '#5b9bd5', // top dark blue
      '#6aaee0',
      '#7fc0ec',
      '#93d0f5',
      '#a8dcf7',
      '#bde7ff',
      '#cdefff',
      '#ddf4ff',
    ];
    const bandH = Math.max(4, Math.floor(grassTop / skyColors.length));
    for (let i = 0; i < skyColors.length; i++) {
      const by = i * bandH;
      const bh = (i === skyColors.length - 1) ? Math.max(0, grassTop - by) : bandH;
      ctx.fillStyle = skyColors[i];
      ctx.fillRect(0, by, w, bh);
    }

    // --- Pixel clouds ---
    this.drawPixelClouds(w, h, grassTop);

    // --- Grass: 4 green colors in pixel-block grid pattern ---
    const grassColors = ['#5da832', '#6dbf3a', '#7dd444', '#4a9026'];
    const blockSize = 4; // pixel block size
    for (let gy = grassTop; gy < h; gy += blockSize) {
      for (let gx = 0; gx < w; gx += blockSize) {
        // deterministic color per block based on position
        const ci = ((gx / blockSize) * 3 + (gy / blockSize) * 7) % grassColors.length | 0;
        ctx.fillStyle = grassColors[ci];
        ctx.fillRect(gx, gy, blockSize, blockSize);
      }
    }

    // --- Grass top edge: 2px darker strip for contrast ---
    ctx.fillStyle = '#3a7a20';
    ctx.fillRect(0, grassTop, w, 2);

    // --- Pixel decorations ---
    this.drawPixelDecorations(w, h, grassTop);
  }

  /** Draw pixel-art block clouds */
  private drawPixelClouds(w: number, _h: number, grassTop: number): void {
    const t = this.elapsedTime / 1000;

    // Cloud template: 1=white, 2=light-gray shadow
    const cloudTemplate: number[][] = [
      [0, 0, 1, 1, 1, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 0, 0],
      [1, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [0, 2, 2, 2, 2, 2, 2, 0],
    ];
    const cloudDefs = [
      { baseX: 0.1, y: 0.05, scale: 5, speed: 6 },
      { baseX: 0.4, y: 0.12, scale: 7, speed: 4 },
      { baseX: 0.7, y: 0.07, scale: 5, speed: 8 },
      { baseX: 0.88, y: 0.16, scale: 4, speed: 5 },
    ];

    for (const cd of cloudDefs) {
      const cloudW = cloudTemplate[0].length * cd.scale;
      const cx = Math.floor(((cd.baseX * w + t * cd.speed) % (w + cloudW * 2)) - cloudW);
      const cy = Math.floor(cd.y * grassTop);
      this.drawPixelSprite(cloudTemplate, cx, cy, cd.scale, { 1: '#e8f4ff', 2: '#c8dff0' });
    }
  }

  /** Draw pixel art decorations: flowers, mushrooms, stones */
  private drawPixelDecorations(w: number, h: number, grassTop: number): void {
    // Pixel flower template (5x8)
    const flowerTemplate: number[][] = [
      [0, 0, 1, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 2, 0, 0],
      [0, 0, 2, 0, 0],
    ];

    // Pixel mushroom template (7x8)
    const shroomTemplate: number[][] = [
      [0, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 2, 1, 1, 1, 2, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [0, 0, 3, 3, 3, 0, 0],
      [0, 0, 3, 3, 3, 0, 0],
    ];

    // Pixel stone template (6x4)
    const stoneTemplate: number[][] = [
      [0, 1, 1, 1, 1, 0],
      [1, 1, 2, 1, 1, 1],
      [1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 0],
    ];

    const flowerColors = ['#ff6b7a', '#ff9ecb', '#ffe066', '#c49bff', '#ff8f5b', '#7be69a'];

    // Scattered flowers
    const flowerPositions = [0.08, 0.22, 0.45, 0.62, 0.78, 0.91];
    for (let i = 0; i < flowerPositions.length; i++) {
      const fx = Math.floor(flowerPositions[i] * w) - 4;
      const depthFrac = ((i * 79) % 100) / 100;
      const fy = Math.floor(grassTop + depthFrac * (h - grassTop) * 0.6);
      const scale = 2;
      const fc = flowerColors[i % flowerColors.length];
      this.drawPixelSprite(flowerTemplate, fx, fy, scale, { 1: fc, 2: '#4aad52' });
    }

    // Mushrooms
    const mushroomPositions = [0.15, 0.55, 0.82];
    for (let i = 0; i < mushroomPositions.length; i++) {
      const mx = Math.floor(mushroomPositions[i] * w) - 7;
      const depthFrac = ((i * 113 + 30) % 100) / 100;
      const my = Math.floor(grassTop + depthFrac * (h - grassTop) * 0.55);
      const scale = 2 + (i % 2);
      this.drawPixelSprite(shroomTemplate, mx, my, scale, {
        1: '#e85d6f',
        2: '#ffffff',
        3: '#f5eed5',
      });
    }

    // Stones
    const stonePositions = [0.28, 0.67, 0.88];
    for (let i = 0; i < stonePositions.length; i++) {
      const sx = Math.floor(stonePositions[i] * w) - 6;
      const depthFrac = ((i * 97 + 50) % 100) / 100;
      const sy = Math.floor(grassTop + depthFrac * (h - grassTop) * 0.65);
      this.drawPixelSprite(stoneTemplate, sx, sy, 3, { 1: '#a8b4bc', 2: '#d0dde5' });
    }
  }

  /** Render a 2D pixel sprite template at given world position with given scale */
  private drawPixelSprite(
    template: number[][],
    x: number,
    y: number,
    scale: number,
    colors: Record<number, string>,
  ): void {
    const { ctx } = this;
    for (let row = 0; row < template.length; row++) {
      for (let col = 0; col < template[row].length; col++) {
        const v = template[row][col];
        if (v === 0) continue;
        const c = colors[v];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Slime drawing — pixel art block sprite
  // ---------------------------------------------------------------------------

  private drawSlime(slime: Slime): void {
    const { x, z } = this.mapTo2D(slime.position.x, slime.position.z);
    const t = this.elapsedTime / 1000;
    const phase = this.hashPhase(slime.id);
    const bounceVal = Math.sin(t * 3.2 + phase);
    const isBouncing = bounceVal > 0.3;

    // Rarity-based scale: pixel block size
    const rarityScale = this.getRaritySizeScale(slime.rarity);
    const pixelSize = Math.max(2, Math.floor(4 * rarityScale));

    // Bounce offset (vertical)
    const bounceOffset = isBouncing ? Math.floor(-bounceVal * 6) : 0;

    // Rarity glow — drawn under slime
    const rarityGlow = this.getRarityGlow(slime.rarity);
    if (rarityGlow) {
      const glowW = GRID * pixelSize * 1.4;
      const glowH = pixelSize * 3;
      this.ctx.save();
      this.ctx.globalAlpha = 0.5;
      this.ctx.fillStyle = rarityGlow;
      this.ctx.fillRect(
        Math.floor(x - glowW / 2),
        Math.floor(z + GRID * pixelSize * 0.6),
        Math.floor(glowW),
        Math.floor(glowH),
      );
      this.ctx.restore();
    }

    const template = isBouncing ? SLIME_BOUNCE : SLIME_IDLE;
    const drawX = Math.floor(x - (GRID * pixelSize) / 2);
    const drawY = Math.floor(z - GRID * pixelSize * 0.8 + bounceOffset);

    // Parse slime color
    const { r: sr, g: sg, b: sb } = this.parseHexColor(slime.color);

    // Derive colors from base color
    const bodyColor = `rgb(${sr},${sg},${sb})`;
    const outlineColor = `rgb(${Math.max(0, sr - 60)},${Math.max(0, sg - 60)},${Math.max(0, sb - 60)})`;
    const highlightColor = `rgb(${Math.min(255, sr + 60)},${Math.min(255, sg + 60)},${Math.min(255, sb + 60)})`;
    const eyeColor = '#1a1a2e';

    this.drawPixelSprite(template, drawX, drawY, pixelSize, {
      1: bodyColor,
      2: outlineColor,
      3: eyeColor,
      4: highlightColor,
    });

    // Legendary pixel stars
    if (slime.rarity === Rarity.Legendary) {
      this.drawPixelStars(drawX, drawY, pixelSize);
    }
  }

  /** Draw small pixel stars around legendary slime */
  private drawPixelStars(x: number, y: number, ps: number): void {
    const { ctx } = this;
    const starPositions: Array<[number, number]> = [
      [-ps * 2, -ps * 2],
      [GRID * ps + ps, -ps * 2],
      [GRID * ps / 2 - ps, -ps * 4],
    ];
    ctx.fillStyle = '#ffd867';
    for (const [sx, sy] of starPositions) {
      ctx.fillRect(x + sx, y + sy, ps, ps);
      ctx.fillRect(x + sx - ps, y + sy + ps, ps * 3, ps);
      ctx.fillRect(x + sx, y + sy + ps * 2, ps, ps);
    }
  }

  // ---------------------------------------------------------------------------
  // Utilities (preserved from original)
  // ---------------------------------------------------------------------------

  private mapTo2D(worldX: number, worldZ: number): { x: number; z: number } {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    return {
      x: w * 0.5 + worldX * 58,
      z: h * 0.7 + worldZ * 34,
    };
  }

  private getRarityGlow(rarity: Rarity): string | null {
    switch (rarity) {
      case Rarity.Uncommon:
        return 'rgba(145, 255, 156, 0.95)';
      case Rarity.Rare:
        return 'rgba(119, 191, 255, 0.95)';
      case Rarity.Epic:
        return 'rgba(200, 137, 255, 0.95)';
      case Rarity.Legendary:
        return 'rgba(255, 212, 93, 0.98)';
      case Rarity.Common:
      default:
        return null;
    }
  }

  private getRaritySizeScale(rarity: Rarity): number {
    switch (rarity) {
      case Rarity.Legendary:
        return 1.5;
      case Rarity.Epic:
        return 1.3;
      case Rarity.Rare:
        return 1.15;
      case Rarity.Uncommon:
        return 1.0;
      case Rarity.Common:
      default:
        return 0.85;
    }
  }

  private hashPhase(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return (hash % 628) / 100;
  }

  private parseHexColor(color: string): { r: number; g: number; b: number } {
    let r = 128, g = 128, b = 128;
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length >= 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    }
    return { r, g, b };
  }
}
