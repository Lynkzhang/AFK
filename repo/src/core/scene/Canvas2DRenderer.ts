import { Rarity } from '../types';
import type { GameState, Slime } from '../types';
import { calcEffectiveSplitTime } from '../systems/SplitFormula';

// ---------------------------------------------------------------------------
// Pixel art Canvas2DRenderer
// Renders a pixel-art style scene with 8x8 pixel-block slimes.
// ---------------------------------------------------------------------------

/** 场地背景配色主题 */
interface ArenaTheme {
  skyColors: string[];       // 天空渐变色带（从上到下）
  groundColors: string[];    // 地面像素块颜色
  groundEdge: string;        // 地面顶部边缘色
  cloudLight: string;        // 云朵亮色
  cloudShadow: string;       // 云朵阴影色
}

const ARENA_THEMES: Record<string, ArenaTheme> = {
  grassland: {
    skyColors: ['#3a6fa0', '#4a88c0', '#5a9ed8', '#6ab4e8', '#7ac8f0', '#8ad8f5', '#9ae4fa', '#aaeeff'],
    groundColors: ['#d4c8a0', '#c9bc96', '#e0d5b5', '#bfb48a'],
    groundEdge: '#b8a882',
    cloudLight: '#e8f4ff',
    cloudShadow: '#c8dff0',
  },
  'ice-cave': {
    skyColors: ['#0a1a2a', '#1a3050', '#2a4a70', '#3a6090', '#4a78aa', '#5a8abb', '#6a9acc', '#8ab0dd'],
    groundColors: ['#8aaacc', '#9abcdd', '#7a9abb', '#6a8aaa'],
    groundEdge: '#aaccee',
    cloudLight: '#e0f0ff',
    cloudShadow: '#a0c8e8',
  },
};

/** 10x10 slime IDLE frames — 4-frame breathing cycle */
const IDLE_FRAMES: number[][][] = [
  // IDLE_0 — standard posture
  [
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
  ],
  // IDLE_1 — slight inhale, bottom row pulled in
  [
    [0, 0, 2, 2, 2, 2, 2, 0, 0, 0],
    [0, 2, 1, 1, 1, 1, 1, 2, 0, 0],
    [2, 1, 4, 1, 1, 1, 1, 1, 2, 0],
    [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [0, 2, 1, 1, 1, 1, 1, 2, 0, 0],
    [0, 0, 2, 2, 2, 2, 2, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // IDLE_2 — inhale peak, top slightly wider
  [
    [0, 0, 0, 2, 2, 2, 2, 0, 0, 0],
    [0, 2, 2, 1, 1, 1, 1, 2, 2, 0],
    [2, 1, 4, 1, 1, 1, 1, 1, 2, 0],
    [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
    [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [0, 2, 1, 1, 1, 1, 1, 2, 0, 0],
    [0, 0, 2, 2, 2, 2, 2, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // IDLE_3 — exhale, top slightly flat/wide
  [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 2, 2, 2, 2, 2, 2, 0, 0],
    [2, 1, 4, 1, 1, 1, 1, 1, 2, 0],
    [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
    [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [0, 2, 1, 1, 1, 1, 1, 2, 0, 0],
    [0, 2, 2, 1, 1, 1, 2, 2, 0, 0],
    [0, 0, 2, 2, 2, 2, 2, 0, 0, 0],
  ],
];

/** 10x10 slime BOUNCE frames — 4-frame bounce cycle */
const BOUNCE_FRAMES: number[][][] = [
  // BOUNCE_0 — launch, bottom flat/wide
  [
    [0, 0, 2, 2, 2, 2, 2, 0, 0, 0],
    [0, 2, 1, 1, 1, 1, 1, 2, 0, 0],
    [2, 1, 4, 1, 1, 1, 1, 1, 2, 0],
    [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
    [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [0, 2, 1, 1, 1, 1, 1, 2, 0, 0],
    [0, 2, 2, 2, 2, 2, 2, 2, 0, 0],
    [0, 2, 2, 2, 2, 2, 2, 2, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // BOUNCE_1 — airborne peak, vertically stretched
  [
    [0, 0, 0, 2, 2, 2, 2, 0, 0, 0],
    [0, 0, 2, 1, 1, 1, 1, 2, 0, 0],
    [0, 2, 4, 1, 1, 1, 1, 1, 2, 0],
    [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
    [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [0, 2, 1, 1, 1, 1, 1, 2, 0, 0],
    [0, 0, 2, 1, 1, 1, 2, 0, 0, 0],
    [0, 0, 0, 2, 2, 2, 0, 0, 0, 0],
  ],
  // BOUNCE_2 — falling, vertically stretched, eyes merged
  [
    [0, 0, 0, 2, 2, 2, 2, 0, 0, 0],
    [0, 0, 2, 1, 1, 1, 1, 2, 0, 0],
    [0, 2, 4, 1, 1, 1, 1, 1, 2, 0],
    [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [0, 2, 1, 1, 1, 1, 1, 2, 0, 0],
    [0, 0, 2, 1, 1, 1, 2, 0, 0, 0],
    [0, 0, 0, 2, 2, 2, 0, 0, 0, 0],
  ],
  // BOUNCE_3 — landing squish
  [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 2, 2, 2, 2, 2, 2, 0, 0],
    [2, 1, 4, 1, 1, 1, 1, 1, 2, 0],
    [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
    [2, 1, 1, 3, 1, 1, 3, 1, 2, 0],
    [2, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [0, 2, 1, 1, 1, 1, 1, 2, 0, 0],
    [0, 2, 2, 2, 2, 2, 2, 2, 0, 0],
    [0, 2, 2, 2, 2, 2, 2, 2, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
];

const GRID = 10; // template size

/** Configurable animation parameters for the renderer */
export interface AnimationParams {
  /** Multiplier for horizontal/vertical drift speed (default 1.0) */
  driftSpeed: number;
  /** Multiplier for bounce frequency (default 1.0) */
  bounceFreq: number;
  /** Multiplier for idle breathing animation amplitude (default 1.0) */
  breathScale: number;
}

const DEFAULT_ANIM_PARAMS: AnimationParams = {
  driftSpeed: 1.0,
  bounceFreq: 1.0,
  breathScale: 1.0,
};

export class Canvas2DRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState | null = null;
  private elapsedTime = 0;
  private animParams: AnimationParams = { ...DEFAULT_ANIM_PARAMS };
  private facilityMultiplier = 1.0;
  private fieldAccelActive = false;
  private container!: HTMLElement;

  // Walk state for random walk system
  private walkStates = new Map<string, {
    targetX: number;
    targetZ: number;
    waitTimer: number;
    isMoving: boolean;
  }>();
  private lastElapsedTime = 0;

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

    this.container = container;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Set animation parameters. Pass partial object to update only some params. */
  setAnimationParams(params: Partial<AnimationParams>): void {
    this.animParams = { ...this.animParams, ...params };
  }

  /** Get current animation parameters (read-only snapshot). */
  getAnimationParams(): AnimationParams {
    return { ...this.animParams };
  }

  update(state: GameState, elapsedTime: number, facilityMultiplier?: number, fieldAccelActive?: boolean): void {
    // 确保首帧 canvas 尺寸正确
    if (this.canvas.width <= 1 || this.canvas.height <= 1) {
      this.resize();
    }
    this.state = state;
    this.elapsedTime = elapsedTime;
    this.facilityMultiplier = facilityMultiplier ?? 1.0;
    this.fieldAccelActive = fieldAccelActive ?? false;

    // Random walk update
    const dt = elapsedTime - this.lastElapsedTime;
    this.lastElapsedTime = elapsedTime;

    for (const slime of state.slimes) {
      let ws = this.walkStates.get(slime.id);
      if (!ws) {
        ws = {
          targetX: slime.position.x,
          targetZ: slime.position.z,
          waitTimer: 1 + Math.random() * 2,
          isMoving: false,
        };
        this.walkStates.set(slime.id, ws);
      }

      const moveSpeed = 0.3 + slime.stats.speed * 0.02;

      if (ws.isMoving) {
        const dx = ws.targetX - slime.position.x;
        const dz = ws.targetZ - slime.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.1) {
          ws.isMoving = false;
          ws.waitTimer = 1 + Math.random() * 2;
        } else {
          const step = moveSpeed * dt;
          const ratio = Math.min(1, step / dist);
          slime.position.x += dx * ratio;
          slime.position.z += dz * ratio;
          // Clamp position to safe walk bounds
          slime.position.x = Math.max(-2.5, Math.min(2.5, slime.position.x));
          slime.position.z = Math.max(-0.5, Math.min(2.5, slime.position.z));
        }
      } else {
        ws.waitTimer -= dt;
        if (ws.waitTimer <= 0) {
          ws.targetX = (Math.random() * 5) - 2.5;
          ws.targetZ = (Math.random() * 3) - 0.5;
          ws.isMoving = true;
        }
      }
    }

    // Clean up walk states for slimes that no longer exist
    const slimeIds = new Set(state.slimes.map((s) => s.id));
    for (const id of this.walkStates.keys()) {
      if (!slimeIds.has(id)) this.walkStates.delete(id);
    }
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

  // ---------------------------------------------------------------------------
  // Background — pixel art bands for sky, pixel grid for ground, decorations
  // ---------------------------------------------------------------------------

  /** 获取当前场地的背景主题配色 */
  private getTheme(): ArenaTheme {
    const arenaId = this.state?.activeArenaId ?? 'grassland';
    return ARENA_THEMES[arenaId] ?? ARENA_THEMES['grassland']!;
  }

  private drawBackground(): void {
    const { ctx } = this;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const groundTop = Math.floor(h * 0.68);
    const theme = this.getTheme();

    // --- Sky: horizontal color-band stripes (each 4-6px tall) ---
    const skyColors = theme.skyColors;
    const bandH = Math.max(4, Math.floor(groundTop / skyColors.length));
    for (let i = 0; i < skyColors.length; i++) {
      const by = i * bandH;
      const bh = (i === skyColors.length - 1) ? Math.max(0, groundTop - by) : bandH;
      ctx.fillStyle = skyColors[i];
      ctx.fillRect(0, by, w, bh);
    }

    // --- Pixel clouds ---
    this.drawPixelClouds(w, h, groundTop);

    // --- Ground: pixel-block grid pattern ---
    const groundColors = theme.groundColors;
    const blockSize = 4; // pixel block size
    for (let gy = groundTop; gy < h; gy += blockSize) {
      for (let gx = 0; gx < w; gx += blockSize) {
        // deterministic color per block based on position
        const ci = ((gx / blockSize) * 3 + (gy / blockSize) * 7) % groundColors.length | 0;
        ctx.fillStyle = groundColors[ci];
        ctx.fillRect(gx, gy, blockSize, blockSize);
      }
    }

    // --- Ground top edge: 2px strip for contrast ---
    ctx.fillStyle = theme.groundEdge;
    ctx.fillRect(0, groundTop, w, 2);

    // --- Pixel decorations ---
    this.drawPixelDecorations(w, h, groundTop);

    // --- Ground particles ---
    this.drawGroundParticles(w, h, groundTop);
  }

  /** Draw pixel-art block clouds */
  private drawPixelClouds(w: number, _h: number, groundTop: number): void {
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
      const cy = Math.floor(cd.y * groundTop);
      this.drawPixelSprite(cloudTemplate, cx, cy, cd.scale, { 1: this.getTheme().cloudLight, 2: this.getTheme().cloudShadow });
    }
  }

  /** Draw pixel art decorations: flowers, mushrooms, stones */
  private drawPixelDecorations(w: number, h: number, groundTop: number): void {
    const t = this.elapsedTime / 1000;

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

    // Scattered flowers — with wind sway
    const flowerPositions = [0.08, 0.22, 0.45, 0.62, 0.78, 0.91];
    for (let i = 0; i < flowerPositions.length; i++) {
      const fx = Math.floor(flowerPositions[i] * w) - 4;
      const depthFrac = ((i * 79) % 100) / 100;
      const fy = Math.floor(groundTop + depthFrac * (h - groundTop) * 0.6);
      const scale = 2;
      const fc = flowerColors[i % flowerColors.length];
      // Wind sway offset
      const windPhase = i * 0.8;
      const windOffset = Math.floor(Math.sin(t * 1.2 + windPhase) * 1.5);
      this.drawPixelSprite(flowerTemplate, fx + windOffset, fy, scale, { 1: fc, 2: '#8b7d5a' });
    }

    // Mushrooms — with bounce
    const mushroomPositions = [0.15, 0.55, 0.82];
    for (let i = 0; i < mushroomPositions.length; i++) {
      const mx = Math.floor(mushroomPositions[i] * w) - 7;
      const depthFrac = ((i * 113 + 30) % 100) / 100;
      const my = Math.floor(groundTop + depthFrac * (h - groundTop) * 0.55);
      const scale = 2 + (i % 2);
      // Mushroom bounce offset
      const shroomPhase = i * 1.3;
      const shroomBounce = Math.floor(Math.abs(Math.sin(t * 0.8 + shroomPhase)) * 2);
      this.drawPixelSprite(shroomTemplate, mx, my - shroomBounce, scale, {
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
      const sy = Math.floor(groundTop + depthFrac * (h - groundTop) * 0.65);
      this.drawPixelSprite(stoneTemplate, sx, sy, 3, { 1: '#a8b4bc', 2: '#d0dde5' });
    }
  }

  /** Draw animated ground particles */
  private drawGroundParticles(w: number, h: number, groundTop: number): void {
    const t = this.elapsedTime / 1000;
    const PARTICLE_SEEDS = [0.12, 0.28, 0.45, 0.61, 0.77, 0.89, 0.33, 0.56];
    for (let i = 0; i < PARTICLE_SEEDS.length; i++) {
      const seed = PARTICLE_SEEDS[i];
      const lifePhase = (t * 0.4 + seed * 7.3) % 3.0;
      if (lifePhase > 1.0) continue;
      const px = Math.floor(seed * w);
      const py = Math.floor(groundTop + (1 - lifePhase) * (h - groundTop) * 0.4);
      const alpha = lifePhase < 0.1 ? lifePhase * 10
                 : lifePhase > 0.8 ? (1 - lifePhase) * 5
                 : 1.0;
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.6;
      this.ctx.fillStyle = '#fffbe0';
      this.ctx.fillRect(px, py, 2, 2);
      this.ctx.restore();
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
    const mapped = this.mapTo2D(slime.position.x, slime.position.z);
    const t = this.elapsedTime / 1000;
    const phase = this.hashPhase(slime.id);

    const x = mapped.x;
    const z = mapped.z;

    // Use walkState to determine animation mode
    const ws = this.walkStates.get(slime.id);
    const isMoving = ws?.isMoving ?? false;

    // 4-frame bounce/idle logic based on movement
    let template: number[][];
    let bounceOffset = 0;
    if (isMoving) {
      const bounceVal = Math.abs(Math.sin(t * 4.0 * this.animParams.bounceFreq + phase));
      const bounceFrameIndex = Math.min(3, Math.floor(bounceVal * 4));
      template = BOUNCE_FRAMES[bounceFrameIndex];
      bounceOffset = Math.floor(-bounceVal * 16);
    } else {
      // breathScale param scales the breathing cycle speed
      const breathCycle = (Math.sin(t * 1.8 * this.animParams.breathScale + phase) + 1) / 2;
      const idleFrameIndex = Math.floor(breathCycle * 4) % 4;
      template = IDLE_FRAMES[idleFrameIndex];
    }

    // Rarity-based scale: pixel block size
    const rarityScale = this.getRaritySizeScale(slime.rarity);
    const pixelSize = Math.max(2, Math.floor(4 * rarityScale));

    // --- Pre-split animation: last 3 seconds (per-slime) ---
    let preSplitScale = 1;
    let preSplitGlow = false;
    let splitFlicker = false;
    {
      const effectiveSplitTime = calcEffectiveSplitTime(slime, this.facilityMultiplier, this.fieldAccelActive);
      const slimeCountdown = effectiveSplitTime - (slime.splitAccumulatedMs ?? 0);
      if (slimeCountdown <= 3000 && slimeCountdown > 0) {
        const progress = 1 - slimeCountdown / 3000; // 0→1
        // Pulsing scale: grows with a sine wobble
        preSplitScale = 1 + 0.15 * progress + 0.05 * Math.sin(t * 8);
        preSplitGlow = true;
        // Last 1 second: fast flicker
        if (slimeCountdown <= 1000) {
          splitFlicker = true;
        }
      }
    }

    const finalPixelSize = Math.max(2, Math.floor(pixelSize * preSplitScale));

    // Rarity glow — drawn under slime
    const rarityGlow = this.getRarityGlow(slime.rarity);
    if (rarityGlow) {
      const glowW = GRID * finalPixelSize * 1.4;
      const glowH = finalPixelSize * 3;
      this.ctx.save();
      this.ctx.globalAlpha = 0.28;
      this.ctx.fillStyle = rarityGlow;
      this.ctx.fillRect(
        Math.floor(x - glowW / 2),
        Math.floor(z + GRID * finalPixelSize * 1.0),
        Math.floor(glowW),
        Math.floor(glowH),
      );
      this.ctx.restore();
    }

    // Pre-split glow effect
    if (preSplitGlow) {
      const glowW = GRID * finalPixelSize * 1.6;
      const glowH = GRID * finalPixelSize + finalPixelSize * 4;
      this.ctx.save();
      const glowAlpha = 0.15 + 0.15 * Math.sin(t * 6);
      this.ctx.globalAlpha = glowAlpha;
      this.ctx.fillStyle = '#fffbe0';
      this.ctx.fillRect(
        Math.floor(x - glowW / 2),
        Math.floor(z - GRID * finalPixelSize * 0.8 + bounceOffset - finalPixelSize * 2),
        Math.floor(glowW),
        Math.floor(glowH),
      );
      this.ctx.restore();
    }

    const drawX = Math.floor(x - (GRID * finalPixelSize) / 2);
    const drawY = Math.floor(z - GRID * finalPixelSize * 0.8 + bounceOffset);

    // Parse slime color
    const { r: sr, g: sg, b: sb } = this.parseHexColor(slime.color);

    // Derive colors from base color
    const bodyColor = `rgb(${sr},${sg},${sb})`;
    const outlineColor = `rgb(${Math.max(0, sr - 60)},${Math.max(0, sg - 60)},${Math.max(0, sb - 60)})`;
    const highlightColor = `rgb(${Math.min(255, sr + 60)},${Math.min(255, sg + 60)},${Math.min(255, sb + 60)})`;
    const eyeColor = '#1a1a2e';

    // Apply flicker alpha for last 1s of pre-split
    if (splitFlicker) {
      this.ctx.save();
      const flickerAlpha = 0.7 + 0.3 * ((Math.sin(t * 20) + 1) / 2);
      this.ctx.globalAlpha = flickerAlpha;
    }

    this.drawPixelSprite(template, drawX, drawY, finalPixelSize, {
      1: bodyColor,
      2: outlineColor,
      3: eyeColor,
      4: highlightColor,
    });

    if (splitFlicker) {
      this.ctx.restore();
    }

    // Legendary pixel stars
    if (slime.rarity === Rarity.Legendary) {
      this.drawPixelStars(drawX, drawY, finalPixelSize);
    }

    // Split progress bar — drawn below the slime sprite
    {
      const effectiveSplitTime = calcEffectiveSplitTime(slime, this.facilityMultiplier, this.fieldAccelActive);
      const progress = Math.min(1, (slime.splitAccumulatedMs ?? 0) / effectiveSplitTime);
      const barW = GRID * finalPixelSize;
      const barH = 3;
      const barX = Math.floor(x - barW / 2);
      const barY = drawY + GRID * finalPixelSize + 2;

      // Background
      this.ctx.save();
      this.ctx.globalAlpha = 1;
      this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
      this.ctx.fillRect(barX, barY, barW, barH);

      // Fill — single uniform color (cyan-green)
      this.ctx.fillStyle = '#4ade80';
      this.ctx.fillRect(barX, barY, Math.floor(barW * progress), barH);
      this.ctx.restore();
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
        return 'rgba(145, 255, 156, 0.6)';
      case Rarity.Rare:
        return 'rgba(119, 191, 255, 0.6)';
      case Rarity.Epic:
        return 'rgba(200, 137, 255, 0.6)';
      case Rarity.Legendary:
        return 'rgba(255, 212, 93, 0.7)';
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
