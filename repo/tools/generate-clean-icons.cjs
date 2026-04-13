'use strict';
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// ─── CRC32 ───────────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) | 0;
}

// ─── PNG writer ──────────────────────────────────────────────────────────────
function makePNG(pixels) {
  const W = 32, H = 32;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crcInput = Buffer.concat([typeBytes, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeInt32BE(crc32(crcInput), 0);
    return Buffer.concat([len, typeBytes, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw scanlines: filter byte (0) + RGBA row
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // filter: None
    for (let x = 0; x < W; x++) {
      const src = (y * W + x) * 4;
      const dst = y * (1 + W * 4) + 1 + x * 4;
      raw[dst]     = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────
function makeCanvas() {
  return new Uint8Array(32 * 32 * 4); // all zeros = transparent
}

function sp(px, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= 32 || y < 0 || y >= 32) return;
  const i = (y * 32 + x) * 4;
  px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = a;
}

function rect(px, x, y, w, h, c) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      sp(px, x+dx, y+dy, c[0], c[1], c[2], c[3] !== undefined ? c[3] : 255);
}

function circle(px, cx, cy, r, c, fill = true) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (fill ? dist <= r : Math.abs(dist - r) < 0.8)
        sp(px, x, y, c[0], c[1], c[2], c[3] !== undefined ? c[3] : 255);
    }
  }
}

function circleBorder(px, cx, cy, r, c) {
  // Draw ring border ~1px wide
  for (let y = cy - r - 1; y <= cy + r + 1; y++) {
    for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist >= r - 0.5 && dist <= r + 0.7)
        sp(px, x, y, c[0], c[1], c[2], 255);
    }
  }
}

function line(px, x1, y1, x2, y2, c) {
  const dx = Math.abs(x2-x1), dy = Math.abs(y2-y1);
  const sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
  let err = dx - dy, x = x1, y = y1;
  while (true) {
    sp(px, x, y, c[0], c[1], c[2], 255);
    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx)  { err += dx; y += sy; }
  }
}

function thickLine(px, x1, y1, x2, y2, c, thick = 2) {
  const dx = Math.abs(x2-x1), dy = Math.abs(y2-y1);
  const len = Math.sqrt(dx*dx + dy*dy);
  const nx = -dy / len, ny = dx / len;
  for (let t = -thick/2; t <= thick/2; t += 0.5) {
    line(px,
      Math.round(x1 + nx*t), Math.round(y1 + ny*t),
      Math.round(x2 + nx*t), Math.round(y2 + ny*t),
      c);
  }
}

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  TRANS:     [0,0,0,0],
  BLACK:     [0,0,0,255],
  WHITE:     [255,255,255,255],
  // Slime greens
  G_MAIN:    [76,175,80,255],   // #4CAF50
  G_DARK:    [56,142,60,255],   // #388E3C
  G_LIGHT:   [129,199,132,255], // #81C784
  G_SHINE:   [200,230,201,255], // eye shine
  // Gold/coin
  GOLD:      [255,215,0,255],   // #FFD700
  GOLD_DARK: [255,160,0,255],   // #FFA000
  GOLD_LITE: [255,236,179,255], // #FFECB3
  // Blue (timer/save)
  BLUE:      [144,202,249,255], // #90CAF9
  BLUE_MID:  [66,165,245,255],  // #42A5F5
  BLUE_DARK: [21,101,192,255],  // #1565C0
  BLUE_LITE: [227,242,253,255], // #E3F2FD
  // Brown (chest/backpack/sword)
  BROWN:     [141,110,99,255],  // #8D6E63
  BROWN_D:   [93,64,55,255],    // #5D4037
  BROWN_L:   [188,170,164,255], // #BCAAA4
  // Silver (sword)
  SILVER:    [176,190,197,255], // #B0BEC5
  SILVER_D:  [120,144,156,255], // #78909C
  // Grey (archive/facility)
  GREY:      [120,144,156,255], // #78909C
  GREY_D:    [69,90,100,255],   // #455A64
  GREY_L:    [207,216,220,255], // #CFD8DC
  // Pink/red (shop)
  PINK:      [233,30,99,255],   // #E91E63
  PINK_D:    [173,20,87,255],   // #AD1457
  PINK_L:    [252,228,236,255], // #FCE4EC
  // Quest scroll
  PARCH:     [255,236,179,255], // #FFECB3
  PARCH_D:   [249,168,37,255],  // #F9A825
  STICK:     [121,85,72,255],   // #795548
  // Purple (codex/crystal)
  PURP:      [126,87,194,255],  // #7E57C2
  PURP_D:    [69,39,160,255],   // #4527A0
  PURP_L:    [243,229,245,255], // #F3E5F5
  PURP_MID:  [206,147,216,255], // #CE93D8
  PURP_VIB:  [171,71,188,255],  // #AB47BC
  // Arena
  GREEN2:    [139,195,74,255],  // #8BC34A
  GREEN2_D:  [85,139,47,255],   // #558B2F
  SKY:       [135,206,235,255], // #87CEEB
  // Orange
  ORANGE:    [255,152,0,255],   // #FF9800
};

// ─── Icon designs ─────────────────────────────────────────────────────────────

function drawSlime(px, small = false) {
  const off = small ? 4 : 2;
  const CX = 16, baseY = small ? 22 : 24;
  const rW = small ? 8 : 11, rH = small ? 6 : 9;

  // Body (ellipse fill)
  for (let y = baseY - rH*2; y <= baseY; y++) {
    for (let x = CX - rW - 1; x <= CX + rW + 1; x++) {
      const ry = y - (baseY - rH);
      const rx = x - CX;
      // Top half ellipse
      if (y < baseY - rH) {
        const nx = rx / (rW + 0.5), ny = ry / rH;
        if (nx*nx + ny*ny <= 1) sp(px, x, y, ...C.G_MAIN);
      } else {
        // Bottom rectangle portion
        if (Math.abs(rx) <= rW) sp(px, x, y, ...C.G_MAIN);
      }
    }
  }
  // Body bottom arc
  for (let x = CX - rW; x <= CX + rW; x++) {
    const rx = (x - CX) / rW;
    const arc = Math.round(baseY + 2 * (1 - rx*rx));
    for (let y = baseY; y <= arc; y++) sp(px, x, y, ...C.G_MAIN);
  }

  // Shadow on lower body
  for (let x = CX - rW + 1; x <= CX + rW - 1; x++) {
    sp(px, x, baseY - 1, ...C.G_DARK);
    sp(px, x, baseY, ...C.G_DARK);
  }

  // Highlight
  sp(px, CX - rW + 2, baseY - rH*2 + 2, ...C.G_SHINE);
  sp(px, CX - rW + 3, baseY - rH*2 + 2, ...C.G_SHINE);
  sp(px, CX - rW + 2, baseY - rH*2 + 3, ...C.G_SHINE);

  // Eyes
  const eyeY = baseY - rH - 1;
  const eyeOff = small ? 3 : 4;
  // Left eye white
  rect(px, CX - eyeOff - 1, eyeY - 1, 3, 3, C.WHITE);
  sp(px, CX - eyeOff, eyeY, ...C.BLACK); // pupil
  // Right eye white
  rect(px, CX + eyeOff - 1, eyeY - 1, 3, 3, C.WHITE);
  sp(px, CX + eyeOff, eyeY, ...C.BLACK); // pupil

  // Mouth (smile)
  const mouthY = eyeY + 3;
  sp(px, CX - 2, mouthY, ...C.BLACK);
  sp(px, CX - 1, mouthY + 1, ...C.BLACK);
  sp(px, CX,     mouthY + 1, ...C.BLACK);
  sp(px, CX + 1, mouthY + 1, ...C.BLACK);
  sp(px, CX + 2, mouthY, ...C.BLACK);

  // Outline - trace the body edges with black
  // Top arc outline
  for (let x = CX - rW - 1; x <= CX + rW + 1; x++) {
    const rx = (x - CX) / (rW + 0.5);
    if (rx*rx <= 1) {
      const topY = Math.round((baseY - rH) - rH * Math.sqrt(1 - rx*rx));
      sp(px, x, topY - 1, ...C.BLACK);
    }
  }
  // Side outlines
  for (let y = baseY - rH*2 + 1; y <= baseY + 1; y++) {
    sp(px, CX - rW - 1, y, ...C.BLACK);
    sp(px, CX + rW + 1, y, ...C.BLACK);
  }
  // Bottom outline
  for (let x = CX - rW; x <= CX + rW; x++) {
    const arc = Math.round(baseY + 2 * (1 - Math.pow((x-CX)/rW, 2)));
    sp(px, x, arc + 1, ...C.BLACK);
  }
}

function drawCoin(px) {
  const CX = 16, CY = 16, R = 12;
  // Fill gold circle
  circle(px, CX, CY, R, C.GOLD);
  // Shadow (right-bottom)
  for (let y = CY; y <= CY + R; y++)
    for (let x = CX; x <= CX + R; x++) {
      const dx = x-CX, dy = y-CY;
      if (dx*dx+dy*dy <= R*R) sp(px, x, y, ...C.GOLD_DARK);
    }
  // Highlight (top-left)
  for (let y = CY - R; y <= CY - R + 4; y++)
    for (let x = CX - R; x <= CX + 1; x++) {
      const dx = x-CX, dy = y-CY;
      if (dx*dx+dy*dy <= R*R) sp(px, x, y, ...C.GOLD_LITE);
    }
  // Black outline
  circleBorder(px, CX, CY, R, C.BLACK);
  // $ symbol (center, white)
  // Vertical bar
  for (let y = CY-4; y <= CY+4; y++) sp(px, CX, y, ...C.WHITE);
  // Top half circle
  rect(px, CX-2, CY-4, 5, 1, C.WHITE);
  rect(px, CX-3, CY-3, 3, 1, C.WHITE);
  rect(px, CX-3, CY-2, 4, 1, C.WHITE);
  rect(px, CX-2, CY-1, 4, 1, C.WHITE);
  // Middle
  rect(px, CX-3, CY, 6, 1, C.WHITE);
  // Bottom half
  rect(px, CX-3, CY+1, 4, 1, C.WHITE);
  rect(px, CX-3, CY+2, 4, 1, C.WHITE);
  rect(px, CX-2, CY+3, 3, 1, C.WHITE);
  rect(px, CX-2, CY+4, 5, 1, C.WHITE);
}

function drawTimer(px) {
  // Hourglass shape
  const CX = 16, T = 5, B = 27, MID = 16;
  // Outline (black frame)
  // Top
  rect(px, CX-7, T, 15, 2, C.BLACK);
  // Bottom
  rect(px, CX-7, B-1, 15, 2, C.BLACK);
  // Left side top half
  for (let y = T+2; y <= MID; y++) {
    const w = Math.round(7 * (MID - y) / (MID - T - 2));
    sp(px, CX - w - 1, y, ...C.BLACK);
  }
  // Right side top half
  for (let y = T+2; y <= MID; y++) {
    const w = Math.round(7 * (MID - y) / (MID - T - 2));
    sp(px, CX + w + 1, y, ...C.BLACK);
  }
  // Left side bottom half
  for (let y = MID; y <= B-2; y++) {
    const w = Math.round(7 * (y - MID) / (B - 2 - MID));
    sp(px, CX - w - 1, y, ...C.BLACK);
  }
  // Right side bottom half
  for (let y = MID; y <= B-2; y++) {
    const w = Math.round(7 * (y - MID) / (B - 2 - MID));
    sp(px, CX + w + 1, y, ...C.BLACK);
  }

  // Fill top half (blue)
  for (let y = T+2; y <= MID; y++) {
    const w = Math.max(0, Math.round(7 * (MID - y) / (MID - T - 2)) - 1);
    for (let x = CX-w; x <= CX+w; x++) sp(px, x, y, ...C.BLUE_MID);
  }
  // Fill bottom half (light blue - sand already fallen)
  for (let y = MID+1; y <= B-2; y++) {
    const w = Math.max(0, Math.round(7 * (y - MID) / (B - 2 - MID)) - 1);
    for (let x = CX-w; x <= CX+w; x++) sp(px, x, y, ...C.BLUE);
  }
  // Sand at bottom
  for (let y = B-4; y <= B-2; y++) {
    const w = Math.max(0, Math.round(7 * (y - MID) / (B - 2 - MID)) - 1);
    for (let x = CX-w; x <= CX+w; x++) sp(px, x, y, ...C.GOLD);
  }
  // Middle pinch fill
  sp(px, CX, MID, ...C.GOLD);
  sp(px, CX, MID-1, ...C.GOLD);
  sp(px, CX, MID+1, ...C.GOLD);
}

function drawChest(px) {
  // Chest body (bottom half)
  rect(px, 4, 18, 24, 12, C.BROWN);
  // Chest lid (top half, arched)
  for (let x = 4; x <= 27; x++) {
    const arcH = Math.round(5 + 2 * Math.sin(Math.PI * (x - 4) / 23));
    for (let y = 18 - arcH; y < 18; y++) sp(px, x, y, ...C.BROWN_D);
  }
  // Horizontal band
  rect(px, 4, 18, 24, 2, C.BROWN_D);
  // Outline
  rect(px, 3, 13, 26, 1, C.BLACK); // top arc approx
  for (let x = 4; x <= 27; x++) {
    const arcH = Math.round(5 + 2 * Math.sin(Math.PI * (x - 4) / 23));
    sp(px, x, 18 - arcH - 1, ...C.BLACK);
  }
  for (let y = 13; y <= 29; y++) {
    sp(px, 3, y, ...C.BLACK);
    sp(px, 28, y, ...C.BLACK);
  }
  rect(px, 4, 29, 24, 1, C.BLACK);
  // Gold lock
  rect(px, 13, 18, 6, 4, C.GOLD);
  rect(px, 14, 16, 4, 3, C.GOLD);
  rect(px, 14, 15, 4, 1, C.BLACK);
  rect(px, 13, 16, 1, 3, C.BLACK);
  rect(px, 17, 16, 1, 3, C.BLACK);
  rect(px, 13, 18, 1, 4, C.BLACK);
  rect(px, 18, 18, 1, 4, C.BLACK);
  rect(px, 14, 21, 4, 1, C.BLACK);
  // Highlight on lid
  rect(px, 6, 14, 4, 2, C.BROWN_L);
}

function drawNewgame(px) {
  // Star shape centered at 16,16
  const CX = 16, CY = 14;
  // 5-point star using polygon fill approximation
  function starPt(i, r) {
    const angle = (i * 72 - 90) * Math.PI / 180;
    return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
  }
  // Draw star by filling scanlines
  const outerR = 12, innerR = 5;
  // Build star polygon points
  const pts = [];
  for (let i = 0; i < 5; i++) {
    pts.push(starPt(i, outerR));
    pts.push(starPt(i + 0.5, innerR));
  }
  // Point-in-polygon fill
  for (let y = CY - outerR - 1; y <= CY + outerR + 1; y++) {
    for (let x = CX - outerR - 1; x <= CX + outerR + 1; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i][0], yi = pts[i][1];
        const xj = pts[j][0], yj = pts[j][1];
        if (((yi > y) !== (yj > y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi)) inside = !inside;
      }
      if (inside) sp(px, x, y, ...C.GOLD);
    }
  }
  // Outline
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i+1) % pts.length];
    line(px, Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2), C.BLACK);
  }
  // Center highlight
  sp(px, CX-1, CY-2, ...C.GOLD_LITE);
  sp(px, CX, CY-2, ...C.GOLD_LITE);
  // "NEW" text hint - just a small + below the star
  rect(px, 14, 27, 5, 1, C.ORANGE);
  rect(px, 16, 25, 1, 5, C.ORANGE);
}

function drawSave(px) {
  // Floppy disk
  // Outer body
  rect(px, 4, 4, 24, 24, C.BLUE_MID);
  // Notched corner (top right)
  rect(px, 22, 4, 6, 6, C.TRANS, true);
  // Actually notch
  for (let y = 4; y < 10; y++)
    for (let x = 22; x < 28; x++)
      if (x >= 28 - (y - 4) - 1) sp(px, x, y, 0, 0, 0, 0);
  // Metal shutter area (bottom 40%)
  rect(px, 8, 18, 16, 8, C.BLUE_DARK);
  rect(px, 11, 19, 10, 6, C.GREY_L);
  // Label area (top part)
  rect(px, 8, 7, 16, 9, C.BLUE_LITE);
  // Lines on label
  rect(px, 9, 9, 14, 1, C.BLUE_MID);
  rect(px, 9, 11, 14, 1, C.BLUE_MID);
  rect(px, 9, 13, 8, 1, C.BLUE_MID);
  // Outline
  rect(px, 4, 4, 24, 1, C.BLACK);
  rect(px, 4, 27, 24, 1, C.BLACK);
  for (let y = 4; y <= 27; y++) sp(px, 4, y, ...C.BLACK);
  for (let y = 4; y <= 27; y++) sp(px, 27, y, ...C.BLACK);
  // Notch outline
  line(px, 22, 4, 27, 9, C.BLACK);
}

function drawSword(px) {
  // Diagonal sword: tip at top-right (26,5), pommel at bottom-left (6,26)
  const tipX = 26, tipY = 5, pomX = 6, pomY = 26;
  const gX1 = 12, gY1 = 20, gX2 = 20, gY2 = 12; // guard position

  // Blade (silver, 2px wide diagonal)
  thickLine(px, gX1, gY1, tipX, tipY, C.SILVER, 2);
  // Blade edge highlight
  line(px, gX1-1, gY1-1, tipX-1, tipY, C.WHITE);
  // Blade shadow
  line(px, gX1+1, gY1, tipX, tipY+1, C.SILVER_D);

  // Handle (brown)
  thickLine(px, pomX, pomY, gX1-1, gY1-1, C.BROWN, 2);

  // Guard (gold cross-piece perpendicular to blade)
  line(px, gX1-3, gY1+3, gX2+3, gY2-3, C.GOLD);
  thickLine(px, gX1-3, gY1+3, gX2+3, gY2-3, C.GOLD, 2);

  // Pommel (small circle)
  rect(px, pomX-1, pomY-1, 3, 3, C.GOLD);

  // Black outline
  thickLine(px, gX1, gY1, tipX, tipY, C.BLACK, 4);
  thickLine(px, gX1, gY1, tipX, tipY, C.SILVER, 2);
  line(px, gX1-1, gY1-1, tipX-1, tipY, C.WHITE);
  thickLine(px, pomX, pomY, gX1-1, gY1-1, C.BLACK, 4);
  thickLine(px, pomX, pomY, gX1-1, gY1-1, C.BROWN, 2);
  thickLine(px, gX1-3, gY1+3, gX2+3, gY2-3, C.BLACK, 4);
  thickLine(px, gX1-3, gY1+3, gX2+3, gY2-3, C.GOLD, 2);
  rect(px, pomX-2, pomY-2, 5, 5, C.BLACK);
  rect(px, pomX-1, pomY-1, 3, 3, C.GOLD);
}

function drawBattle(px) {
  // Two crossed swords
  // Sword 1: top-left to bottom-right (\)
  thickLine(px, 6, 6, 26, 26, C.BLACK, 4);
  thickLine(px, 6, 6, 26, 26, C.SILVER, 2);
  line(px, 7, 6, 27, 26, C.WHITE);

  // Sword 2: top-right to bottom-left (/)
  thickLine(px, 26, 6, 6, 26, C.BLACK, 4);
  thickLine(px, 26, 6, 6, 26, C.SILVER, 2);
  line(px, 25, 6, 5, 26, C.WHITE);

  // Guards at crossing
  rect(px, 13, 14, 6, 4, C.BLACK);
  rect(px, 14, 15, 4, 2, C.GOLD);

  // Pommels
  rect(px, 5, 25, 3, 3, C.BLACK);
  rect(px, 6, 26, 2, 2, C.GOLD);
  rect(px, 24, 25, 3, 3, C.BLACK);
  rect(px, 25, 26, 2, 2, C.GOLD);
}

function drawBackpack(px) {
  // Main bag body
  rect(px, 7, 10, 18, 18, C.BROWN);
  // Top flap
  for (let x = 7; x <= 24; x++) {
    const arc = Math.round(10 - 3 * Math.sin(Math.PI * (x-7)/17));
    for (let y = arc; y <= 10; y++) sp(px, x, y, ...C.BROWN_D);
  }
  // Strap (vertical loop at top)
  rect(px, 13, 5, 6, 6, C.BROWN_D);
  rect(px, 14, 6, 4, 4, C.TRANS, true);
  for (let y = 6; y <= 9; y++) {
    sp(px, 14, y, 0,0,0,0);
    sp(px, 15, y, 0,0,0,0);
    sp(px, 16, y, 0,0,0,0);
    sp(px, 17, y, 0,0,0,0);
  }
  // Pocket
  rect(px, 10, 19, 12, 8, C.BROWN_D);
  rect(px, 11, 20, 10, 6, C.BROWN);
  // Gold buckle
  rect(px, 14, 19, 4, 2, C.GOLD);
  // Outline
  for (let y = 10; y <= 27; y++) { sp(px, 7, y, ...C.BLACK); sp(px, 24, y, ...C.BLACK); }
  rect(px, 7, 27, 18, 1, C.BLACK);
  rect(px, 7, 10, 18, 1, C.BLACK);
  // Flap outline
  for (let x = 7; x <= 24; x++) {
    const arc = Math.round(10 - 3 * Math.sin(Math.PI * (x-7)/17));
    sp(px, x, arc-1, ...C.BLACK);
  }
}

function drawArchive(px) {
  // Filing cabinet (2 drawers)
  rect(px, 5, 5, 22, 22, C.GREY);
  // Drawer 1
  rect(px, 6, 6, 20, 9, C.GREY_D);
  rect(px, 7, 7, 18, 7, C.GREY);
  rect(px, 7, 7, 18, 1, C.GREY_L);
  // Drawer 2
  rect(px, 6, 16, 20, 10, C.GREY_D);
  rect(px, 7, 17, 18, 8, C.GREY);
  rect(px, 7, 17, 18, 1, C.GREY_L);
  // Handles
  rect(px, 13, 10, 6, 2, C.GOLD);
  rect(px, 13, 20, 6, 2, C.GOLD);
  // Labels (white strips)
  rect(px, 9, 8, 9, 5, C.WHITE);
  rect(px, 9, 18, 9, 5, C.WHITE);
  // Text lines on labels
  rect(px, 10, 9, 7, 1, C.GREY_D);
  rect(px, 10, 11, 5, 1, C.GREY_D);
  rect(px, 10, 19, 7, 1, C.GREY_D);
  rect(px, 10, 21, 5, 1, C.GREY_D);
  // Outline
  rect(px, 5, 5, 22, 1, C.BLACK);
  rect(px, 5, 26, 22, 1, C.BLACK);
  for (let y = 5; y <= 26; y++) { sp(px, 5, y, ...C.BLACK); sp(px, 26, y, ...C.BLACK); }
  // Divider
  rect(px, 5, 15, 22, 1, C.BLACK);
}

function drawFacility(px) {
  // Factory building
  // Ground
  rect(px, 3, 25, 26, 2, C.GREY_D);
  // Main building
  rect(px, 6, 14, 16, 12, C.GREY);
  // Chimney
  rect(px, 8, 8, 4, 8, C.GREY_D);
  rect(px, 20, 10, 3, 6, C.GREY_D);
  // Smoke
  for (let i = 0; i < 3; i++) {
    circle(px, 10, 6-i*2, 1, C.GREY_L);
    circle(px, 21, 8-i*2, 1, C.GREY_L);
  }
  // Door
  rect(px, 13, 19, 4, 7, C.GREY_D);
  rect(px, 14, 20, 2, 5, C.BLACK);
  // Windows
  rect(px, 8, 16, 4, 4, C.GOLD);
  rect(px, 9, 17, 2, 2, C.GOLD_LITE);
  rect(px, 16, 16, 4, 4, C.GOLD);
  rect(px, 17, 17, 2, 2, C.GOLD_LITE);
  // Roof edge
  rect(px, 5, 13, 18, 2, C.GREY_D);
  // Outlines
  rect(px, 6, 14, 16, 1, C.BLACK);
  rect(px, 6, 25, 16, 1, C.BLACK);
  for (let y = 14; y <= 25; y++) { sp(px, 6, y, ...C.BLACK); sp(px, 21, y, ...C.BLACK); }
}

function drawShop(px) {
  // Awning / shop tent top
  for (let x = 3; x <= 28; x++) {
    const stripeColor = Math.floor((x-3)/3) % 2 === 0 ? C.PINK : C.PINK_D;
    for (let y = 7; y <= 12; y++) {
      const bottom = 12 - Math.round(2 * Math.abs((x-15.5)/12.5));
      if (y <= bottom) sp(px, x, y, ...stripeColor);
    }
  }
  // Awning border
  rect(px, 3, 7, 26, 1, C.BLACK);
  // Shop front
  rect(px, 5, 12, 22, 15, C.BROWN_L);
  // Display window
  rect(px, 8, 14, 16, 9, C.BLUE_LITE);
  rect(px, 9, 15, 14, 7, C.WHITE);
  // Items in window (gold coins suggestion)
  sp(px, 12, 17, ...C.GOLD); sp(px, 13, 17, ...C.GOLD);
  sp(px, 16, 16, ...C.GOLD); sp(px, 17, 16, ...C.GOLD);
  sp(px, 14, 19, ...C.GOLD); sp(px, 19, 18, ...C.GOLD);
  // Door
  rect(px, 13, 20, 5, 7, C.BROWN);
  // Gold sign
  rect(px, 10, 9, 12, 3, C.GOLD);
  rect(px, 11, 9, 10, 1, C.BLACK);
  rect(px, 11, 11, 10, 1, C.BLACK);
  // Outline
  rect(px, 5, 12, 22, 1, C.BLACK);
  rect(px, 5, 26, 22, 1, C.BLACK);
  for (let y = 12; y <= 26; y++) { sp(px, 5, y, ...C.BLACK); sp(px, 26, y, ...C.BLACK); }
}

function drawQuest(px) {
  // Scroll / parchment
  // Rollers (brown cylinders top and bottom)
  rect(px, 6, 5, 20, 4, C.STICK);
  rect(px, 6, 5, 20, 1, C.BROWN_L);
  rect(px, 6, 23, 20, 4, C.STICK);
  rect(px, 6, 23, 20, 1, C.BROWN_L);
  // Parchment body
  rect(px, 7, 8, 18, 16, C.PARCH);
  rect(px, 7, 8, 18, 1, C.PARCH_D);
  // Text lines
  for (let i = 0; i < 4; i++) {
    rect(px, 9, 10 + i*3, 14, 1, C.STICK);
  }
  rect(px, 9, 22, 8, 1, C.STICK);
  // Decorative mark at top
  rect(px, 13, 10, 6, 1, C.PARCH_D);
  rect(px, 14, 9, 4, 1, C.PARCH_D);
  // Outline
  rect(px, 6, 5, 20, 1, C.BLACK);
  rect(px, 6, 8, 1, 16, C.BLACK);
  rect(px, 24, 8, 1, 16, C.BLACK);
  rect(px, 6, 23, 20, 1, C.BLACK);
  rect(px, 6, 26, 20, 1, C.BLACK);
  rect(px, 6, 5, 1, 4, C.BLACK);
  rect(px, 25, 5, 1, 4, C.BLACK);
  rect(px, 6, 23, 1, 4, C.BLACK);
  rect(px, 25, 23, 1, 4, C.BLACK);
}

function drawCodex(px) {
  // Open book
  // Spine (center)
  rect(px, 15, 5, 2, 22, C.PURP_D);
  // Left page
  rect(px, 5, 7, 10, 18, C.PURP);
  // Right page
  rect(px, 17, 7, 10, 18, C.PURP);
  // Page surfaces (lighter)
  rect(px, 6, 8, 8, 16, C.PARCH);
  rect(px, 18, 8, 8, 16, C.PARCH);
  // Text lines on pages
  for (let i = 0; i < 4; i++) {
    rect(px, 7, 10 + i*3, 6, 1, C.PURP_D);
    rect(px, 19, 10 + i*3, 6, 1, C.PURP_D);
  }
  // Cover decorations
  rect(px, 5, 7, 1, 18, C.PURP_D);
  rect(px, 26, 7, 1, 18, C.PURP_D);
  // Outline
  for (let y = 7; y <= 24; y++) {
    sp(px, 4, y, ...C.BLACK);
    sp(px, 27, y, ...C.BLACK);
  }
  rect(px, 4, 7, 24, 1, C.BLACK);
  rect(px, 4, 24, 24, 1, C.BLACK);
  // Book top/bottom curves
  rect(px, 5, 6, 22, 1, C.PURP_D);
  rect(px, 5, 25, 22, 1, C.PURP_D);
}

function drawArena(px) {
  // Arena stadium seen from front — with transparent background
  // Outer arch (coliseum shape)
  const CX = 16, TOP = 4, BOT = 28, W = 13;
  // Draw arch outline
  // Top arc of the arena
  for (let x = CX - W; x <= CX + W; x++) {
    const dx = (x - CX) / W;
    const arcTop = Math.round(TOP + 4 * dx * dx); // parabolic arch
    for (let y = arcTop; y <= BOT; y++) {
      if (y <= TOP + 3 || Math.abs(x - (CX - W)) <= 2 || Math.abs(x - (CX + W)) <= 2) {
        sp(px, x, y, ...C.BROWN);
      }
    }
  }
  // Stone wall left pillar
  rect(px, CX-W, TOP+3, 4, BOT - TOP - 3, C.BROWN);
  // Stone wall right pillar
  rect(px, CX+W-3, TOP+3, 4, BOT - TOP - 3, C.BROWN);
  // Top arch row
  for (let x = CX - W; x <= CX + W; x++) {
    const dx = (x - CX) / W;
    const arcTop = Math.round(TOP + 4 * dx * dx);
    for (let y = arcTop; y <= arcTop + 3; y++) sp(px, x, y, ...C.BROWN);
  }
  // Arena floor (grass inside)
  rect(px, CX-W+4, TOP+3, W*2-7, BOT - TOP - 3, C.GREEN2);
  // Sandy pit in center
  rect(px, CX-6, 16, 12, 12, C.PARCH);
  // Crossed swords in center
  thickLine(px, CX-4, 24, CX+4, 18, C.BLACK, 3);
  thickLine(px, CX+4, 24, CX-4, 18, C.BLACK, 3);
  thickLine(px, CX-4, 24, CX+4, 18, C.SILVER, 1);
  thickLine(px, CX+4, 24, CX-4, 18, C.SILVER, 1);
  // Windows/arches on wall
  rect(px, CX-W+1, TOP+5, 2, 5, C.BLACK);
  rect(px, CX+W-2, TOP+5, 2, 5, C.BLACK);
  // Ground shadow
  rect(px, CX-W, BOT-1, W*2+1, 2, C.BROWN_D);
  // Outline
  for (let x = CX - W; x <= CX + W; x++) {
    const dx = (x - CX) / W;
    const arcTop = Math.round(TOP + 4 * dx * dx);
    sp(px, x, arcTop - 1, ...C.BLACK);
  }
  for (let y = TOP+2; y <= BOT; y++) {
    sp(px, CX-W-1, y, ...C.BLACK);
    sp(px, CX+W+1, y, ...C.BLACK);
  }
  rect(px, CX-W-1, BOT, W*2+3, 1, C.BLACK);
}

function drawCrystal(px) {
  // Diamond/crystal shape
  const CX = 16;
  // Crystal facets - large diamond
  // Top point: (16,4), sides: (6,16),(26,16), bottom: (16,27)
  const pts = [[CX,4],[26,13],[22,27],[10,27],[6,13]];

  // Fill with polygon scan
  for (let y = 4; y <= 27; y++) {
    let xMin = 32, xMax = -1;
    for (let i = 0, j = pts.length-1; i < pts.length; j=i++) {
      const [xi,yi] = pts[i], [xj,yj] = pts[j];
      if ((yi <= y && yj > y) || (yj <= y && yi > y)) {
        const x = xi + (y - yi) * (xj - xi) / (yj - yi);
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
      }
    }
    if (xMax >= xMin) {
      for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
        // Gradient shading
        const ty = (y - 4) / 23;
        const tx = (x - xMin) / Math.max(1, xMax - xMin);
        if (tx < 0.3) sp(px, x, y, ...C.PURP_L);
        else if (tx > 0.7) sp(px, x, y, ...C.PURP_D);
        else sp(px, x, y, ...C.PURP_MID);
      }
    }
  }

  // Facet lines (inner divisions)
  line(px, CX, 4, CX-3, 16, C.PURP_D);
  line(px, CX, 4, CX+3, 16, C.PURP);
  line(px, CX-3, 16, CX, 27, C.PURP_VIB);
  line(px, CX+3, 16, CX, 27, C.PURP_D);
  line(px, 6, 13, CX-3, 16, C.PURP);
  line(px, 26, 13, CX+3, 16, C.PURP_VIB);

  // Outline
  for (let i = 0; i < pts.length; i++) {
    const [x1,y1] = pts[i];
    const [x2,y2] = pts[(i+1) % pts.length];
    line(px, x1, y1, x2, y2, C.BLACK);
  }

  // Highlight
  sp(px, CX-1, 6, ...C.WHITE);
  sp(px, CX, 6, ...C.WHITE);
  sp(px, CX-1, 7, ...C.PURP_L);
}

// ─── Generate all icons ──────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'public', 'assets');

const icons = [
  {
    name: 'logo-slime',
    draw: (px) => drawSlime(px, false),
  },
  {
    name: 'icon-slime',
    draw: (px) => drawSlime(px, true),
  },
  {
    name: 'icon-coin',
    draw: drawCoin,
  },
  {
    name: 'icon-timer',
    draw: drawTimer,
  },
  {
    name: 'icon-chest',
    draw: drawChest,
  },
  {
    name: 'icon-newgame',
    draw: drawNewgame,
  },
  {
    name: 'icon-save',
    draw: drawSave,
  },
  {
    name: 'icon-sword',
    draw: drawSword,
  },
  {
    name: 'icon-battle',
    draw: drawBattle,
  },
  {
    name: 'icon-backpack',
    draw: drawBackpack,
  },
  {
    name: 'icon-archive',
    draw: drawArchive,
  },
  {
    name: 'icon-facility',
    draw: drawFacility,
  },
  {
    name: 'icon-shop',
    draw: drawShop,
  },
  {
    name: 'icon-quest',
    draw: drawQuest,
  },
  {
    name: 'icon-codex',
    draw: drawCodex,
  },
  {
    name: 'icon-arena',
    draw: drawArena,
  },
  {
    name: 'icon-crystal',
    draw: drawCrystal,
  },
];

console.log('Generating clean pixel art icons...');
for (const icon of icons) {
  const px = makeCanvas();
  icon.draw(px);
  const png = makePNG(px);
  const outPath = path.join(outDir, `${icon.name}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`  Wrote ${icon.name}.png (${png.length} bytes)`);
}

// ─── Verification ─────────────────────────────────────────────────────────────
console.log('\nVerification:');

function parsePNG(data) {
  let pos = 8;
  let idat = Buffer.alloc(0);
  let width = 0, height = 0;
  while (pos < data.length) {
    const length = data.readUInt32BE(pos);
    const type = data.slice(pos+4, pos+8).toString('ascii');
    const chunkData = data.slice(pos+8, pos+8+length);
    if (type === 'IHDR') {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
    }
    if (type === 'IDAT') idat = Buffer.concat([idat, chunkData]);
    pos += 4 + 4 + length + 4;
  }
  const raw = zlib.inflateSync(idat);
  return { width, height, raw };
}

let allOk = true;
for (const icon of icons) {
  const data = fs.readFileSync(path.join(outDir, `${icon.name}.png`));
  const { width, height, raw } = parsePNG(data);
  const stride = 1 + width * 4;
  let transparentCount = 0;
  const uniqueColors = new Set();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const off = y * stride + 1 + x * 4;
      const a = raw[off + 3];
      if (a === 0) transparentCount++;
      else uniqueColors.add(`${raw[off]},${raw[off+1]},${raw[off+2]}`);
    }
  }
  const transOk = transparentCount >= 100;
  const colorOk = uniqueColors.size <= 30;
  const status = (transOk && colorOk) ? 'OK' : 'WARN';
  if (!transOk || !colorOk) allOk = false;
  console.log(`  ${status} ${icon.name}.png: ${transparentCount} transparent pixels, ${uniqueColors.size} unique colors`);
  if (!transOk) console.warn(`       WARNING: too few transparent pixels (${transparentCount} < 100)`);
  if (!colorOk) console.warn(`       WARNING: too many colors (${uniqueColors.size} > 30)`);
}

console.log(allOk ? '\nAll icons pass verification!' : '\nSome icons failed verification - please review warnings above.');
