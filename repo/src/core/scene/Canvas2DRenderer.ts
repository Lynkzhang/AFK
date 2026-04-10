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
    this.drawClouds();
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

    // Sky gradient — warm pastel
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    sky.addColorStop(0, '#bfe7ff');
    sky.addColorStop(1, '#f8fdff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Ground
    const grassTop = h * 0.68;
    const ground = ctx.createLinearGradient(0, grassTop, 0, h);
    ground.addColorStop(0, '#8dde74');
    ground.addColorStop(1, '#57b653');
    ctx.fillStyle = ground;
    ctx.fillRect(0, grassTop, w, h - grassTop);

    // Grass blades (existing)
    for (let i = 0; i < 14; i++) {
      const gx = ((i * 137) % 1000) / 1000 * w;
      const gy = grassTop + ((i * 79) % 250) / 250 * (h - grassTop - 12);
      ctx.strokeStyle = '#3ea548';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, gy + 10);
      ctx.quadraticCurveTo(gx - 2, gy + 4, gx - 1, gy);
      ctx.moveTo(gx, gy + 10);
      ctx.quadraticCurveTo(gx + 2, gy + 4, gx + 1, gy + 1);
      ctx.stroke();
    }

    // Existing daisies (white petals + yellow center)
    for (let i = 0; i < 6; i++) {
      const fx = ((i * 173 + 41) % 1000) / 1000 * w;
      const fy = grassTop + ((i * 61 + 23) % 220) / 220 * (h - grassTop - 14);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fx, fy, 3, 0, Math.PI * 2);
      ctx.arc(fx - 4, fy + 2, 3, 0, Math.PI * 2);
      ctx.arc(fx + 4, fy + 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd95b';
      ctx.beginPath();
      ctx.arc(fx, fy + 1.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- NEW DECORATIONS ---

    // Colorful flowers (red, pink, yellow, purple)
    const flowerColors = ['#ff6b7a', '#ff9ecb', '#ffe066', '#c49bff', '#ff8f5b', '#7be69a'];
    for (let i = 0; i < 10; i++) {
      const fx = ((i * 211 + 67) % 1000) / 1000 * w;
      const fy = grassTop + ((i * 97 + 43) % 200) / 200 * (h - grassTop - 18) + 6;
      const color = flowerColors[i % flowerColors.length];
      // Stem
      ctx.strokeStyle = '#4aad52';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fx, fy + 6);
      ctx.lineTo(fx, fy + 14);
      ctx.stroke();
      // Petals
      ctx.fillStyle = color;
      const petalR = 2.8;
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(angle) * 3.2, fy + Math.sin(angle) * 3.2, petalR, 0, Math.PI * 2);
        ctx.fill();
      }
      // Center
      ctx.fillStyle = '#ffeaa0';
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cute mushrooms (3 varied sizes with round caps)
    const mushrooms = [
      { x: 0.15, yOff: 0.4, size: 1.0 },
      { x: 0.55, yOff: 0.6, size: 0.7 },
      { x: 0.82, yOff: 0.25, size: 1.2 },
      { x: 0.38, yOff: 0.8, size: 0.6 },
    ];
    for (const m of mushrooms) {
      const mx = m.x * w;
      const my = grassTop + m.yOff * (h - grassTop - 16) + 4;
      const ms = m.size;
      // Stem
      ctx.fillStyle = '#f5eed5';
      ctx.beginPath();
      ctx.moveTo(mx - 3 * ms, my);
      ctx.lineTo(mx - 2.5 * ms, my + 10 * ms);
      ctx.lineTo(mx + 2.5 * ms, my + 10 * ms);
      ctx.lineTo(mx + 3 * ms, my);
      ctx.closePath();
      ctx.fill();
      // Cap
      ctx.fillStyle = '#e85d6f';
      ctx.beginPath();
      ctx.ellipse(mx, my - 1 * ms, 8 * ms, 6 * ms, 0, Math.PI, 0);
      ctx.fill();
      // Spots
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(mx - 3 * ms, my - 4 * ms, 1.5 * ms, 0, Math.PI * 2);
      ctx.arc(mx + 2 * ms, my - 3 * ms, 1.2 * ms, 0, Math.PI * 2);
      ctx.fill();
    }

    // Smooth round stones (gray, 3)
    const stones = [
      { x: 0.25, yOff: 0.7, rx: 8, ry: 5 },
      { x: 0.68, yOff: 0.5, rx: 6, ry: 3.5 },
      { x: 0.9, yOff: 0.85, rx: 10, ry: 5.5 },
    ];
    for (const s of stones) {
      const sx = s.x * w;
      const sy = grassTop + s.yOff * (h - grassTop - 12) + 4;
      ctx.fillStyle = '#b8bfc4';
      ctx.beginPath();
      ctx.ellipse(sx, sy, s.rx, s.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(sx - s.rx * 0.2, sy - s.ry * 0.3, s.rx * 0.45, s.ry * 0.35, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Butterflies (2, with simple wing-flap using elapsedTime)
    this.drawButterflies(w, h, grassTop);
  }

  /** Draw animated butterflies */
  private drawButterflies(w: number, _h: number, grassTop: number): void {
    const { ctx } = this;
    const t = this.elapsedTime / 1000;

    const butterflies = [
      { baseX: 0.3, baseY: 0.55, color1: '#ffb3d9', color2: '#ff7eb3', speed: 1.4, phase: 0 },
      { baseX: 0.72, baseY: 0.62, color1: '#b3d4ff', color2: '#7eb3ff', speed: 1.1, phase: 2.1 },
    ];

    for (const b of butterflies) {
      const bx = b.baseX * w + Math.sin(t * 0.8 + b.phase) * 18;
      const by = grassTop * 0.85 + b.baseY * (grassTop * 0.15) + Math.sin(t * 1.2 + b.phase) * 6;
      const wingFlap = Math.sin(t * b.speed * 4 + b.phase) * 0.6;

      ctx.save();
      ctx.translate(bx, by);

      // Left wing
      ctx.fillStyle = b.color1;
      ctx.beginPath();
      ctx.ellipse(-4, -1, 5, 3.5 * Math.abs(Math.cos(wingFlap)), -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Right wing
      ctx.fillStyle = b.color2;
      ctx.beginPath();
      ctx.ellipse(4, -1, 5, 3.5 * Math.abs(Math.cos(wingFlap)), 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = '#554433';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.2, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  /** Draw drifting clouds across the sky */
  private drawClouds(): void {
    const { ctx } = this;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const t = this.elapsedTime / 1000;

    const clouds: Array<{ baseX: number; y: number; size: number; speed: number }> = [
      { baseX: 0.12, y: 0.08, size: 38, speed: 8 },
      { baseX: 0.42, y: 0.14, size: 50, speed: 5 },
      { baseX: 0.72, y: 0.06, size: 42, speed: 7 },
      { baseX: 0.90, y: 0.18, size: 34, speed: 10 },
      { baseX: 0.28, y: 0.22, size: 30, speed: 6 },
    ];

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (const cloud of clouds) {
      const cx = ((cloud.baseX * w + t * cloud.speed) % (w + cloud.size * 4)) - cloud.size * 2;
      const cy = cloud.y * h;
      const s = cloud.size;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
      ctx.arc(cx - s * 0.38, cy + s * 0.12, s * 0.32, 0, Math.PI * 2);
      ctx.arc(cx + s * 0.4, cy + s * 0.1, s * 0.35, 0, Math.PI * 2);
      ctx.arc(cx + s * 0.12, cy - s * 0.18, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Returns a size multiplier based on rarity (Legendary is larger, Common smaller) */
  private getRaritySizeScale(rarity: Rarity): number {
    switch (rarity) {
      case Rarity.Legendary:
        return 1.25;
      case Rarity.Epic:
        return 1.12;
      case Rarity.Rare:
        return 1.05;
      case Rarity.Uncommon:
        return 1.0;
      case Rarity.Common:
      default:
        return 0.92;
    }
  }

  /**
   * Draw a mushroom/fungi-shaped slime (Fung-ji / 方吉 style):
   * - Large round mushroom cap head (~70% of total height)
   * - Small stubby body below the cap
   * - Big cute eyes with large pupils + highlights
   * - Simple ω or smile expression
   */
  private drawSlime(slime: Slime): void {
    const { x, z } = this.mapTo2D(slime.position.x, slime.position.z);
    const t = this.elapsedTime / 1000;
    const phase = this.hashPhase(slime.id);
    const bounce = Math.sin(t * 3.2 + phase);
    const breath = Math.sin(t * 1.8 + phase * 0.7) * 0.04;
    const stretch = bounce * 0.08;
    const scaleX = 1 - stretch + breath;
    const scaleY = 1 + stretch + breath;

    // Idle sway: gentle left-right wobble
    const sway = Math.sin(t * 1.2 + phase * 1.3) * 3.5;

    const yPos = z - 6 - bounce * 8;

    // Rarity-based size difference
    const rarityScale = this.getRaritySizeScale(slime.rarity);
    const baseSize = (46 + (slime.position.y ?? 0) * 4) * rarityScale;

    // Rarity glow
    const rarityGlow = this.getRarityGlow(slime.rarity);
    if (rarityGlow) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.75;
      this.ctx.shadowBlur = 22;
      this.ctx.shadowColor = rarityGlow;
      this.ctx.fillStyle = rarityGlow;
      this.ctx.beginPath();
      this.ctx.ellipse(x + sway, yPos + baseSize * 0.55, baseSize * 0.5, baseSize * 0.2, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.translate(x + sway, yPos);
    this.ctx.scale(scaleX, scaleY);

    const capR = baseSize * 0.52; // Mushroom cap radius
    const capCY = -baseSize * 0.18; // Cap center Y
    const bodyW = baseSize * 0.28; // Body half-width
    const bodyH = baseSize * 0.32; // Body height
    const bodyTop = capCY + capR * 0.45; // Where body starts (under cap)

    // --- Small stubby body (below cap) ---
    this.ctx.fillStyle = this.lightenColor(slime.color, 0.25);
    this.ctx.beginPath();
    this.ctx.moveTo(-bodyW, bodyTop);
    this.ctx.quadraticCurveTo(-bodyW * 1.05, bodyTop + bodyH, -bodyW * 0.4, bodyTop + bodyH);
    this.ctx.lineTo(bodyW * 0.4, bodyTop + bodyH);
    this.ctx.quadraticCurveTo(bodyW * 1.05, bodyTop + bodyH, bodyW, bodyTop);
    this.ctx.closePath();
    this.ctx.fill();

    // --- Large round mushroom cap head ---
    this.ctx.fillStyle = slime.color;
    this.ctx.beginPath();
    this.ctx.arc(0, capCY, capR, 0, Math.PI * 2);
    this.ctx.fill();

    // Cap bottom rim (slightly darker arc)
    this.ctx.strokeStyle = this.darkenColor(slime.color, 0.15);
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(0, capCY, capR, 0.15, Math.PI - 0.15);
    this.ctx.stroke();

    // Highlight on cap
    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this.ctx.beginPath();
    this.ctx.ellipse(-capR * 0.28, capCY - capR * 0.35, capR * 0.28, capR * 0.38, -0.35, 0, Math.PI * 2);
    this.ctx.fill();

    // Small decorative spots on cap
    this.ctx.fillStyle = 'rgba(255,255,255,0.22)';
    this.ctx.beginPath();
    this.ctx.arc(capR * 0.3, capCY - capR * 0.15, capR * 0.1, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(-capR * 0.05, capCY - capR * 0.55, capR * 0.08, 0, Math.PI * 2);
    this.ctx.fill();

    // --- Big cute eyes (larger, with big pupils + highlights) ---
    const eyeY = capCY + capR * 0.1;
    const eyeSpacing = capR * 0.36;
    const eyeR = capR * 0.22; // Bigger eyes for cute factor
    this.drawMushroomEye(-eyeSpacing, eyeY, eyeR);
    this.drawMushroomEye(eyeSpacing, eyeY, eyeR);

    // --- Simple ω mouth (cute fungi expression) ---
    this.ctx.strokeStyle = '#4f2a25';
    this.ctx.lineWidth = 1.8;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    const mouthY = capCY + capR * 0.4;
    const mouthW = capR * 0.22;
    // ω shape: two small arcs side by side
    this.ctx.beginPath();
    this.ctx.arc(-mouthW * 0.5, mouthY, mouthW * 0.45, Math.PI * 0.1, Math.PI * 0.9);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(mouthW * 0.5, mouthY, mouthW * 0.45, Math.PI * 0.1, Math.PI * 0.9);
    this.ctx.stroke();

    // Optional blush spots
    this.ctx.fillStyle = 'rgba(255, 140, 160, 0.25)';
    this.ctx.beginPath();
    this.ctx.ellipse(-eyeSpacing - capR * 0.05, eyeY + eyeR * 1.2, capR * 0.12, capR * 0.07, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(eyeSpacing + capR * 0.05, eyeY + eyeR * 1.2, capR * 0.12, capR * 0.07, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Legendary stars
    if (slime.rarity === Rarity.Legendary) {
      this.drawLegendaryStars(baseSize);
    }

    this.ctx.restore();
  }

  /** Draw a big cute eye with large pupil and two highlight spots */
  private drawMushroomEye(ex: number, ey: number, r: number): void {
    // White of eye
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.ellipse(ex, ey, r, r * 1.05, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Large pupil
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.beginPath();
    this.ctx.arc(ex, ey + r * 0.05, r * 0.7, 0, Math.PI * 2);
    this.ctx.fill();

    // Main highlight (top-left)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(ex - r * 0.25, ey - r * 0.2, r * 0.3, 0, Math.PI * 2);
    this.ctx.fill();

    // Small secondary highlight
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(ex + r * 0.2, ey + r * 0.25, r * 0.14, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawLegendaryStars(size: number): void {
    const points: Array<[number, number]> = [
      [-size * 0.55, -size * 0.58],
      [size * 0.5, -size * 0.62],
      [0, -size * 1.08],
    ];
    this.ctx.fillStyle = '#ffd867';
    for (const [sx, sy] of points) {
      this.ctx.beginPath();
      this.ctx.moveTo(sx, sy - 4);
      this.ctx.lineTo(sx + 1.5, sy - 1.5);
      this.ctx.lineTo(sx + 4, sy);
      this.ctx.lineTo(sx + 1.5, sy + 1.5);
      this.ctx.lineTo(sx, sy + 4);
      this.ctx.lineTo(sx - 1.5, sy + 1.5);
      this.ctx.lineTo(sx - 4, sy);
      this.ctx.lineTo(sx - 1.5, sy - 1.5);
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

  /** Lighten a hex/CSS color by mixing toward white */
  private lightenColor(color: string, amount: number): string {
    return this.adjustColor(color, amount);
  }

  /** Darken a hex/CSS color by mixing toward black */
  private darkenColor(color: string, amount: number): string {
    return this.adjustColor(color, -amount);
  }

  private adjustColor(color: string, amount: number): string {
    // Parse hex color
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
    if (amount > 0) {
      r = Math.min(255, Math.round(r + (255 - r) * amount));
      g = Math.min(255, Math.round(g + (255 - g) * amount));
      b = Math.min(255, Math.round(b + (255 - b) * amount));
    } else {
      const d = -amount;
      r = Math.max(0, Math.round(r * (1 - d)));
      g = Math.max(0, Math.round(g * (1 - d)));
      b = Math.max(0, Math.round(b * (1 - d)));
    }
    return `rgb(${r},${g},${b})`;
  }
}
