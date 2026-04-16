import { Rarity } from '../types';
import type { GameState, Slime } from '../types';
import { calcEffectiveSplitTime } from '../systems/SplitFormula';

// ---------------------------------------------------------------------------
// Pixel art Canvas2DRenderer
// Renders a pixel-art style scene with 8x8 pixel-block slimes.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Issue #272: Particle system
// ---------------------------------------------------------------------------

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'burst' | 'glow' | 'ring' | 'click';
}

const MAX_PARTICLES = 120;

// ---------------------------------------------------------------------------
// Issue #271: Day/night sky color stages (8-color bands per phase)
// ---------------------------------------------------------------------------

// Each phase: array of 8 hex colors from top to bottom of sky
const SKY_PHASES: string[][] = [
  // Day (0-150s)
  ['#3a6fa0', '#4a88c0', '#5a9ed8', '#6ab4e8', '#7ac8f0', '#8ad8f5', '#9ae4fa', '#aaeeff'],
  // Dusk (150-300s)
  ['#4a2858', '#7a3860', '#b05840', '#d08050', '#e0a860', '#eba070', '#f0c080', '#f8d8a0'],
  // Night (300-450s)
  ['#050510', '#0a0a20', '#100c28', '#180e30', '#1a1030', '#1e1438', '#201540', '#201848'],
  // Dawn (450-600s)
  ['#1a1030', '#302050', '#603070', '#904060', '#c06050', '#d08060', '#e0a870', '#f0c890'],
];

// Linear interpolate between two hex colors
function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 0xff, ag = (pa >> 8) & 0xff, ab_ = pa & 0xff;
  const br = (pb >> 16) & 0xff, bg = (pb >> 8) & 0xff, bb_ = pb & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab_ + (bb_ - ab_) * t);
  return `#${((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, '0')}`;
}

export class Canvas2DRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState | null = null;
  private elapsedTime = 0;
  private animParams: AnimationParams = { ...DEFAULT_ANIM_PARAMS };
  private facilityMultiplier = 1.0;
  private fieldAccelActive = false;

  // Walk state for random walk system
  private walkStates = new Map<string, {
    targetX: number;
    targetZ: number;
    waitTimer: number;
    isMoving: boolean;
  }>();
  private lastElapsedTime = 0;

  // Issue #272: particle pool
  private particles: Particle[] = [];

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

    // Issue #272: canvas click feedback
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cx = (e.clientX - rect.left) * dpr;
      const cy = (e.clientY - rect.top) * dpr;
      const count = 3 + Math.floor(Math.random() * 3); // 3-5
      for (let i = 0; i < count; i++) {
        if (this.particles.length >= MAX_PARTICLES) break;
        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 50;
        this.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 20,
          life: 0.6,
          maxLife: 0.6,
          size: 2 + Math.random() * 3,
          color: `hsl(${Math.floor(Math.random() * 60 + 30)}, 100%, 70%)`,
          type: 'click',
        });
      }
    });
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

    // Issue #272: update and draw particles
    this.updateParticles();
    this.drawParticles();
  }

  // ---------------------------------------------------------------------------
  // Issue #272: Particle system methods
  // ---------------------------------------------------------------------------

  /** Update all particles: advance life, physics, remove dead ones */
  private updateParticles(): void {
    const dt = 1 / 60; // approximate frame dt
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.type !== 'glow') {
        p.life -= dt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        // Physics
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 80 * dt; // gravity
      }
      // ring expands outward
      if (p.type === 'ring') {
        p.size += 80 * dt;
      }
    }
  }

  /** Draw all particles */
  private drawParticles(): void {
    const { ctx } = this;
    for (const p of this.particles) {
      const alpha = p.type === 'glow'
        ? 0.5 + 0.3 * Math.sin(this.elapsedTime / 300 + p.x)
        : Math.max(0, p.life / p.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(
          Math.floor(p.x - p.size / 2),
          Math.floor(p.y - p.size / 2),
          Math.ceil(p.size),
          Math.ceil(p.size),
        );
      }
      ctx.restore();
    }
  }

  /**
   * Issue #272: Spawn split particles at canvas coordinates.
   * Called from main.ts when a split event happens.
   */
  public spawnSplitParticles(canvasX: number, canvasY: number, rarity: Rarity): void {
    // Count by rarity
    const countMap: Record<Rarity, number> = {
      [Rarity.Common]: 8,
      [Rarity.Uncommon]: 12,
      [Rarity.Rare]: 16,
      [Rarity.Epic]: 22,
      [Rarity.Legendary]: 28,
    };
    const count = countMap[rarity] ?? 8;

    const rarityColors: Record<Rarity, string[]> = {
      [Rarity.Common]: ['#aaeeff', '#ccffaa', '#ffffff'],
      [Rarity.Uncommon]: ['#91ff9c', '#ccffcc', '#aaffbb'],
      [Rarity.Rare]: ['#77bfff', '#aaddff', '#88eeff'],
      [Rarity.Epic]: ['#c889ff', '#e0aaff', '#d070ff'],
      [Rarity.Legendary]: ['#ffd45d', '#ffe880', '#fff0a0', '#ffb830'],
    };
    const colors = rarityColors[rarity] ?? rarityColors[Rarity.Common];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 60 + Math.random() * 120;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x: canvasX,
        y: canvasY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        size: 2 + Math.random() * 4,
        color,
        type: 'burst',
      });
    }

    // Legendary: add ring shockwave
    if (rarity === Rarity.Legendary) {
      if (this.particles.length < MAX_PARTICLES) {
        this.particles.push({
          x: canvasX,
          y: canvasY,
          vx: 0,
          vy: 0,
          life: 0.5,
          maxLife: 0.5,
          size: 10,
          color: '#ffd45d',
          type: 'ring',
        });
      }
    }
  }

  /**
   * Convert world coordinates to canvas pixel coordinates.
   * Used by main.ts to pass correct coordinates to spawnSplitParticles.
   */
  public worldToCanvas(worldX: number, worldZ: number): { x: number; y: number } {
    const mapped = this.mapTo2D(worldX, worldZ);
    const dpr = window.devicePixelRatio || 1;
    return { x: mapped.x * dpr, y: mapped.z * dpr };
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
  // Issue #271: Background — pixel art bands for sky, pixel grid for ground,
  //   mountain silhouette, layered ground, grass, extended particles
  // ---------------------------------------------------------------------------

  private drawBackground(): void {
    const { ctx } = this;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const groundTop = Math.floor(h * 0.68);

    // --- #271: Day/night sky with 600s cycle, 4 phases, lerp ---
    this.drawDayNightSky(w, groundTop);

    // --- Pixel clouds (6 clouds, 3 templates) ---
    this.drawPixelClouds(w, h, groundTop);

    // --- #271: Mountain silhouette ---
    this.drawMountainSilhouette(w, groundTop);

    // --- #271: Ground three layers ---
    this.drawLayeredGround(w, h, groundTop);

    // --- Ground top edge: 2px strip for contrast ---
    ctx.fillStyle = '#b8a882';
    ctx.fillRect(0, groundTop, w, 2);

    // --- #271: Grass tufts with wind sway ---
    this.drawGrassTufts(w, h, groundTop);

    // --- Pixel decorations ---
    this.drawPixelDecorations(w, h, groundTop);

    // --- #271: Extended ground particles (20 seeds, 3 types) ---
    this.drawGroundParticles(w, h, groundTop);
  }

  /** #271: Draw day/night lerped sky */
  private drawDayNightSky(w: number, groundTop: number): void {
    const CYCLE = 600; // 600 second cycle
    const elapsed = (isFinite(this.elapsedTime) && this.elapsedTime >= 0) ? this.elapsedTime : 0;
    const t = elapsed % CYCLE; // elapsedTime already in seconds
    const phaseDuration = CYCLE / 4; // 150s per phase

    const phaseIndex = Math.max(0, Math.min(3, Math.floor(t / phaseDuration)));
    const nextPhaseIndex = (phaseIndex + 1) % 4;
    const lerpT = Math.max(0, Math.min(1, (t % phaseDuration) / phaseDuration));

    const currentColors = SKY_PHASES[phaseIndex];
    const nextColors = SKY_PHASES[nextPhaseIndex];
    if (!currentColors || !nextColors) return; // safety guard

    const numBands = 8;
    const bandH = Math.max(4, Math.floor(groundTop / numBands));

    for (let i = 0; i < numBands; i++) {
      const col = lerpColor(currentColors[i], nextColors[i], lerpT);
      const by = i * bandH;
      const bh = (i === numBands - 1) ? Math.max(0, groundTop - by) : bandH;
      this.ctx.fillStyle = col;
      this.ctx.fillRect(0, by, w, bh);
    }
  }

  /** #271: Mountain silhouette above ground */
  private drawMountainSilhouette(w: number, groundTop: number): void {
    const { ctx } = this;
    const mountains = [
      { cx: 0.12, h: 0.22 },
      { cx: 0.30, h: 0.28 },
      { cx: 0.50, h: 0.20 },
      { cx: 0.68, h: 0.26 },
      { cx: 0.85, h: 0.18 },
    ];
    ctx.save();
    for (const m of mountains) {
      const mx = m.cx * w;
      const mh = m.h * groundTop;
      const mw = mh * 1.4;
      ctx.fillStyle = '#2a3050';
      ctx.beginPath();
      ctx.moveTo(mx - mw / 2, groundTop);
      ctx.lineTo(mx, groundTop - mh);
      ctx.lineTo(mx + mw / 2, groundTop);
      ctx.closePath();
      ctx.fill();

      // Snow cap
      const snowH = mh * 0.25;
      const snowW = mw * 0.2;
      ctx.fillStyle = '#d8e8f0';
      ctx.beginPath();
      ctx.moveTo(mx - snowW, groundTop - mh + snowH);
      ctx.lineTo(mx, groundTop - mh);
      ctx.lineTo(mx + snowW, groundTop - mh + snowH);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** #271: Three-layer ground */
  private drawLayeredGround(w: number, h: number, groundTop: number): void {
    const { ctx } = this;
    const totalH = h - groundTop;

    // Layer 1: top strip (short, darker)
    const l1H = Math.floor(totalH * 0.15);
    const groundColors1 = ['#a09060', '#b0a070', '#c0b080'];
    const blockSize = 4;
    for (let gy = groundTop; gy < groundTop + l1H; gy += blockSize) {
      for (let gx = 0; gx < w; gx += blockSize) {
        const ci = ((gx / blockSize) * 3 + (gy / blockSize) * 7) % groundColors1.length | 0;
        ctx.fillStyle = groundColors1[ci];
        ctx.fillRect(gx, gy, blockSize, blockSize);
      }
    }

    // Layer 2: middle strip (main ground)
    const l2H = Math.floor(totalH * 0.45);
    const groundColors2 = ['#d4c8a0', '#c9bc96', '#e0d5b5', '#bfb48a'];
    for (let gy = groundTop + l1H; gy < groundTop + l1H + l2H; gy += blockSize) {
      for (let gx = 0; gx < w; gx += blockSize) {
        const ci = ((gx / blockSize) * 3 + (gy / blockSize) * 7) % groundColors2.length | 0;
        ctx.fillStyle = groundColors2[ci];
        ctx.fillRect(gx, gy, blockSize, blockSize);
      }
    }

    // Layer 3: bottom strip (deeper, darker brown)
    const groundColors3 = ['#8b7040', '#7a6035', '#9a8050'];
    for (let gy = groundTop + l1H + l2H; gy < h; gy += blockSize) {
      for (let gx = 0; gx < w; gx += blockSize) {
        const ci = ((gx / blockSize) * 3 + (gy / blockSize) * 7) % groundColors3.length | 0;
        ctx.fillStyle = groundColors3[ci];
        ctx.fillRect(gx, gy, blockSize, blockSize);
      }
    }
  }

  /** #271: Grass tufts with wind sway */
  private drawGrassTufts(w: number, _h: number, groundTop: number): void {
    const t = this.elapsedTime; // seconds
    const grassPositions = [0.05, 0.16, 0.27, 0.38, 0.50, 0.61, 0.72, 0.83, 0.92, 0.96, 0.33, 0.66];
    const grassCount = Math.min(12, grassPositions.length);
    for (let i = 0; i < grassCount; i++) {
      const gx = Math.floor(grassPositions[i] * w);
      const gy = groundTop;
      const windOffset = Math.sin(t * 1.5 + i * 0.9) * 2;
      const scale = 2;
      // Draw 3-pixel tall grass blades
      this.ctx.save();
      this.ctx.fillStyle = '#4a8a30';
      // Left blade
      this.ctx.fillRect(gx - 2 + Math.floor(windOffset * 0.5), gy - 4 * scale, scale, scale * 2);
      // Center blade (tallest)
      this.ctx.fillRect(gx + Math.floor(windOffset), gy - 5 * scale, scale, scale * 3);
      // Right blade
      this.ctx.fillRect(gx + 2 + Math.floor(windOffset * 0.7), gy - 4 * scale, scale, scale * 2);
      this.ctx.fillStyle = '#62aa40';
      // Tips
      this.ctx.fillRect(gx - 2 + Math.floor(windOffset * 0.5), gy - 5 * scale, scale, scale);
      this.ctx.fillRect(gx + Math.floor(windOffset), gy - 6 * scale, scale, scale);
      this.ctx.fillRect(gx + 2 + Math.floor(windOffset * 0.7), gy - 5 * scale, scale, scale);
      this.ctx.restore();
    }
  }

  /** Draw pixel-art block clouds — 6 clouds, 3 templates */
  private drawPixelClouds(w: number, _h: number, groundTop: number): void {
    const t = this.elapsedTime;

    // Template 1: original fluffy cloud
    const cloudTemplate: number[][] = [
      [0, 0, 1, 1, 1, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 0, 0],
      [1, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [0, 2, 2, 2, 2, 2, 2, 0],
    ];

    // Template 2: large wide cloud
    const cloudTemplate2: number[][] = [
      [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [0, 2, 2, 2, 2, 2, 2, 2, 2, 0],
    ];

    // Template 3: flat thin cloud
    const cloudTemplate3: number[][] = [
      [0, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ];

    // Get sky phase for cloud color tint
    const CYCLE = 600;
    const tSky = this.elapsedTime % CYCLE;
    const phaseDuration = CYCLE / 4;
    const phaseIndex = Math.max(0, Math.min(3, Math.floor(tSky / phaseDuration)));
    const lerpT = Math.max(0, Math.min(1, (tSky % phaseDuration) / phaseDuration));

    // Cloud colors by phase
    const cloudColorPairs: Array<[string, string]> = [
      ['#e8f4ff', '#c8dff0'], // day
      ['#ffd090', '#e8a860'], // dusk
      ['#203050', '#182840'], // night
      ['#d080a0', '#c06080'], // dawn
    ];
    const cc1 = cloudColorPairs[phaseIndex];
    const cc2 = cloudColorPairs[(phaseIndex + 1) % 4];
    const cloudLight = lerpColor(cc1[0], cc2[0], lerpT);
    const cloudShadow = lerpColor(cc1[1], cc2[1], lerpT);

    const cloudDefs = [
      { baseX: 0.1, y: 0.05, scale: 5, speed: 6, template: cloudTemplate },
      { baseX: 0.4, y: 0.12, scale: 7, speed: 4, template: cloudTemplate },
      { baseX: 0.7, y: 0.07, scale: 5, speed: 8, template: cloudTemplate },
      { baseX: 0.88, y: 0.16, scale: 4, speed: 5, template: cloudTemplate },
      // New: large cloud
      { baseX: 0.25, y: 0.08, scale: 6, speed: 3, template: cloudTemplate2 },
      // New: flat cloud
      { baseX: 0.6, y: 0.18, scale: 5, speed: 7, template: cloudTemplate3 },
    ];

    for (const cd of cloudDefs) {
      const cloudW = cd.template[0].length * cd.scale;
      const cx = Math.floor(((cd.baseX * w + t * cd.speed) % (w + cloudW * 2)) - cloudW);
      const cy = Math.floor(cd.y * groundTop);
      this.drawPixelSprite(cd.template, cx, cy, cd.scale, { 1: cloudLight, 2: cloudShadow });
    }
  }

  /** Draw pixel art decorations: flowers, mushrooms, stones */
  private drawPixelDecorations(w: number, h: number, groundTop: number): void {
    const t = this.elapsedTime; // seconds

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

  /** #271: Draw animated ground particles (20 seeds, 3 types) */
  private drawGroundParticles(w: number, h: number, groundTop: number): void {
    const t = this.elapsedTime; // seconds
    // 20 seeds with type: 0=light dot, 1=dust, 2=firefly
    const PARTICLE_SEEDS = [
      { s: 0.12, type: 0 }, { s: 0.28, type: 1 }, { s: 0.45, type: 0 },
      { s: 0.61, type: 2 }, { s: 0.77, type: 0 }, { s: 0.89, type: 1 },
      { s: 0.33, type: 2 }, { s: 0.56, type: 0 }, { s: 0.07, type: 1 },
      { s: 0.18, type: 2 }, { s: 0.40, type: 0 }, { s: 0.52, type: 1 },
      { s: 0.64, type: 2 }, { s: 0.73, type: 0 }, { s: 0.82, type: 1 },
      { s: 0.93, type: 2 }, { s: 0.03, type: 0 }, { s: 0.25, type: 1 },
      { s: 0.48, type: 2 }, { s: 0.70, type: 0 },
    ];
    const typeColors = ['#fffbe0', '#d4c898', '#aaffcc'];
    const typeSizes = [2, 3, 2];
    for (let i = 0; i < PARTICLE_SEEDS.length; i++) {
      const { s: seed, type } = PARTICLE_SEEDS[i];
      const lifePhase = (t * 0.4 + seed * 7.3) % 3.0;
      if (lifePhase > 1.0) continue;
      const px = Math.floor(seed * w);
      const py = Math.floor(groundTop + (1 - lifePhase) * (h - groundTop) * 0.4);
      const alpha = lifePhase < 0.1 ? lifePhase * 10
                 : lifePhase > 0.8 ? (1 - lifePhase) * 5
                 : 1.0;
      // Fireflies have extra flicker
      const flickerMult = type === 2 ? (0.5 + 0.5 * Math.sin(t * 4 + seed * 12)) : 1.0;
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.6 * flickerMult;
      this.ctx.fillStyle = typeColors[type];
      const sz = typeSizes[type];
      this.ctx.fillRect(px, py, sz, sz);
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
    const t = this.elapsedTime; // seconds
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

    // Issue #272: Rare+ ambient glow particles (static, sine-based)
    if (slime.rarity === Rarity.Rare
      || slime.rarity === Rarity.Epic
      || slime.rarity === Rarity.Legendary) {
      this.drawSlimeGlowParticles(slime, x, z, finalPixelSize);
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

  /** Issue #272: Draw 2-4 ambient glow dots around Rare+ slimes */
  private drawSlimeGlowParticles(slime: Slime, cx: number, cy: number, ps: number): void {
    const t = this.elapsedTime; // seconds
    const phase = this.hashPhase(slime.id);
    const glowColor = this.getRarityGlow(slime.rarity) ?? '#ffffff';
    // 2 for Rare, 3 for Epic, 4 for Legendary
    const dotCount = slime.rarity === Rarity.Rare ? 2
      : slime.rarity === Rarity.Epic ? 3 : 4;
    const radius = GRID * ps * 0.8;
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2 + t * 0.8 + phase;
      const r = radius + Math.sin(t * 1.5 + i + phase) * ps * 2;
      const gx = cx + Math.cos(angle) * r;
      const gy = cy + Math.sin(angle) * r * 0.4 - GRID * ps * 0.4;
      this.ctx.save();
      this.ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 2 + i);
      this.ctx.fillStyle = glowColor;
      this.ctx.fillRect(Math.floor(gx - 1), Math.floor(gy - 1), 3, 3);
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
