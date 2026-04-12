// ===== BattleEffects.ts =====
// Visual effects system: damage floats, particles, screen flash.

interface DamageFloat {
  x: number;
  y: number;
  text: string;
  color: string;
  startTime: number;
  duration: number;
  fontSize: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface ScreenFlash {
  color: string;
  startTime: number;
  duration: number;
}

export class BattleEffects {
  private floats: DamageFloat[] = [];
  private particles: Particle[] = [];
  private flash: ScreenFlash | null = null;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  addDamageFloat(x: number, y: number, value: number, isCrit: boolean): void {
    this.floats.push({
      x,
      y,
      text: isCrit ? `${value}!` : `${value}`,
      color: isCrit ? '#ff4444' : '#ffffff',
      startTime: performance.now() / 1000,
      duration: 0.8,
      fontSize: isCrit ? 20 : 14,
    });
  }

  addHealFloat(x: number, y: number, value: number): void {
    this.floats.push({
      x,
      y,
      text: `+${value}`,
      color: '#44ff88',
      startTime: performance.now() / 1000,
      duration: 0.8,
      fontSize: 14,
    });
  }

  addMissFloat(x: number, y: number): void {
    this.floats.push({
      x,
      y,
      text: 'MISS',
      color: '#aaaaaa',
      startTime: performance.now() / 1000,
      duration: 0.6,
      fontSize: 13,
    });
  }

  addDotFloat(x: number, y: number, value: number): void {
    this.floats.push({
      x,
      y,
      text: `${value}`,
      color: '#cc44ff',
      startTime: performance.now() / 1000,
      duration: 0.6,
      fontSize: 13,
    });
  }

  addCritBurst(x: number, y: number): void {
    const colors = ['#ffd700', '#ffaa00', '#ff8800', '#ffffff'];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = 60 + Math.random() * 40;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[i % colors.length]!,
        life: 0.5,
        maxLife: 0.5,
        size: 3 + Math.random() * 2,
      });
    }
  }

  addHealParticles(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: (Math.random() - 0.5) * 20,
        vy: -40 - Math.random() * 30,
        color: '#44ff88',
        life: 0.6,
        maxLife: 0.6,
        size: 3,
      });
    }
  }

  triggerRageFlash(): void {
    this.flash = {
      color: 'rgba(220, 50, 50, 0.5)',
      startTime: performance.now() / 1000,
      duration: 0.5,
    };
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const now = time; // time in seconds from arena start

    // Draw screen flash
    if (this.flash) {
      const elapsed = now - this.flash.startTime;
      if (elapsed < this.flash.duration) {
        const alpha = 0.5 * (1 - elapsed / this.flash.duration);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#dc3232';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.restore();
      } else {
        this.flash = null;
      }
    }

    // Update and draw particles
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Move particles (approx 60fps)
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.vy += 60 * 0.016; // gravity
      p.life -= 0.016;
    }

    // Draw damage floats
    this.floats = this.floats.filter((f) => now - f.startTime < f.duration);
    for (const f of this.floats) {
      const elapsed = now - f.startTime;
      const progress = elapsed / f.duration;
      const alpha = 1 - progress;
      const offsetY = progress * -40;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${f.fontSize}px monospace`;
      ctx.fillStyle = f.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(f.text, f.x, f.y + offsetY);
      ctx.fillText(f.text, f.x, f.y + offsetY);
      ctx.restore();
    }
  }

  clear(): void {
    this.floats = [];
    this.particles = [];
    this.flash = null;
  }
}
