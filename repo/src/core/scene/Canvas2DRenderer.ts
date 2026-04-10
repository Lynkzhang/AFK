import { Rarity } from '../types';
import type { GameState, Slime } from '../types';

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
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context is not supported');
    this.ctx = ctx;

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
  }

  private drawBackground(): void {
    const { ctx } = this;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    sky.addColorStop(0, '#bfe7ff');
    sky.addColorStop(1, '#f8fdff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const grassTop = h * 0.68;
    const ground = ctx.createLinearGradient(0, grassTop, 0, h);
    ground.addColorStop(0, '#8dde74');
    ground.addColorStop(1, '#57b653');
    ctx.fillStyle = ground;
    ctx.fillRect(0, grassTop, w, h - grassTop);

    for (let i = 0; i < 14; i++) {
      const x = ((i * 137) % 1000) / 1000 * w;
      const y = grassTop + ((i * 79) % 250) / 250 * (h - grassTop - 12);
      ctx.strokeStyle = '#3ea548';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y + 10);
      ctx.quadraticCurveTo(x - 2, y + 4, x - 1, y);
      ctx.moveTo(x, y + 10);
      ctx.quadraticCurveTo(x + 2, y + 4, x + 1, y + 1);
      ctx.stroke();
    }

    for (let i = 0; i < 6; i++) {
      const x = ((i * 173 + 41) % 1000) / 1000 * w;
      const y = grassTop + ((i * 61 + 23) % 220) / 220 * (h - grassTop - 14);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.arc(x - 4, y + 2, 3, 0, Math.PI * 2);
      ctx.arc(x + 4, y + 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd95b';
      ctx.beginPath();
      ctx.arc(x, y + 1.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSlime(slime: Slime): void {
    const { x, z } = this.mapTo2D(slime.position.x, slime.position.z);
    const t = this.elapsedTime / 1000;
    const phase = this.hashPhase(slime.id);
    const bounce = Math.sin(t * 3.2 + phase);
    const breath = Math.sin(t * 1.8 + phase * 0.7) * 0.04;
    const stretch = bounce * 0.08;
    const scaleX = 1 - stretch + breath;
    const scaleY = 1 + stretch + breath;
    const y = z - 6 - bounce * 8;

    const baseSize = 46 + (slime.position.y ?? 0) * 4;

    const rarityGlow = this.getRarityGlow(slime.rarity);
    if (rarityGlow) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.75;
      this.ctx.shadowBlur = 22;
      this.ctx.shadowColor = rarityGlow;
      this.ctx.fillStyle = rarityGlow;
      this.ctx.beginPath();
      this.ctx.ellipse(x, y + baseSize * 0.55, baseSize * 0.45, baseSize * 0.25, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scaleX, scaleY);

    this.ctx.fillStyle = slime.color;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -baseSize * 0.95);
    this.ctx.bezierCurveTo(baseSize * 0.62, -baseSize * 0.72, baseSize * 0.72, baseSize * 0.25, baseSize * 0.45, baseSize * 0.8);
    this.ctx.bezierCurveTo(baseSize * 0.28, baseSize * 1.0, -baseSize * 0.28, baseSize * 1.0, -baseSize * 0.45, baseSize * 0.8);
    this.ctx.bezierCurveTo(-baseSize * 0.72, baseSize * 0.25, -baseSize * 0.62, -baseSize * 0.72, 0, -baseSize * 0.95);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255,255,255,0.28)';
    this.ctx.beginPath();
    this.ctx.ellipse(-baseSize * 0.18, -baseSize * 0.34, baseSize * 0.14, baseSize * 0.22, -0.4, 0, Math.PI * 2);
    this.ctx.fill();

    const eyeY = -baseSize * 0.08;
    this.drawEye(-baseSize * 0.16, eyeY, baseSize * 0.09);
    this.drawEye(baseSize * 0.16, eyeY, baseSize * 0.09);

    this.ctx.strokeStyle = '#4f2a25';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.arc(0, baseSize * 0.14, baseSize * 0.18, 0.2, Math.PI - 0.2);
    this.ctx.stroke();

    if (slime.rarity === Rarity.Legendary) {
      this.drawLegendaryStars(baseSize);
    }

    this.ctx.restore();
  }

  private drawEye(x: number, y: number, r: number): void {
    this.ctx.fillStyle = '#131313';
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.35, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawLegendaryStars(size: number): void {
    const points: Array<[number, number]> = [
      [-size * 0.55, -size * 0.58],
      [size * 0.5, -size * 0.62],
      [0, -size * 1.08],
    ];
    this.ctx.fillStyle = '#ffd867';
    for (const [x, y] of points) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - 4);
      this.ctx.lineTo(x + 1.5, y - 1.5);
      this.ctx.lineTo(x + 4, y);
      this.ctx.lineTo(x + 1.5, y + 1.5);
      this.ctx.lineTo(x, y + 4);
      this.ctx.lineTo(x - 1.5, y + 1.5);
      this.ctx.lineTo(x - 4, y);
      this.ctx.lineTo(x - 1.5, y - 1.5);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

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

  private hashPhase(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return (hash % 628) / 100;
  }
}
