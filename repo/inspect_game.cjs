const { chromium } = require('playwright');
async function inspect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:4177/AFK/');
  await page.waitForSelector('.ui-panel', { timeout: 10000 });
  
  // M40 QA: full battle flow
  await page.evaluate(() => {
    const gm = window.__GM;
    if (!gm) return;
    gm.skipOnboarding();
    const state = gm.getState();
    for (const s of state.slimes) {
      gm.setStats(s.id, { health: 999, attack: 999, defense: 999, speed: 999 });
    }
    for (const s of [...state.slimes]) {
      gm.archiveSlime(s.id);
    }
  });
  await page.waitForTimeout(300);
  
  await page.locator('.ui-actions button', { hasText: '战斗' }).click();
  await page.waitForTimeout(500);
  await page.locator('.stage-card').first().click();
  await page.waitForTimeout(500);
  
  const slimeCards = page.locator('.team-slime-card');
  const count = await slimeCards.count();
  for (let i = 0; i < Math.min(count, 4); i++) {
    await slimeCards.nth(i).click();
  }
  await page.waitForTimeout(300);
  await page.locator('.confirm-btn', { hasText: '开始战斗' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'qa_screenshots/m40_04_battle_active.png' });
  
  const canvasInfo = await page.evaluate(() => {
    const container = document.querySelector('.battle-canvas-container');
    const canvas = container ? container.querySelector('canvas') : null;
    if (!canvas) return { exists: false };
    const ctx = canvas.getContext('2d');
    const data = ctx ? ctx.getImageData(0, 0, canvas.width, canvas.height).data : null;
    let nonZero = 0;
    if (data) for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 0 || data[i+1] > 0 || data[i+2] > 0) nonZero++;
    }
    return { exists: true, w: canvas.width, h: canvas.height, nonZero };
  });
  console.log('Canvas info:', JSON.stringify(canvasInfo));
  
  const hpBefore = await page.evaluate(() => Array.from(document.querySelectorAll('.hp-bar-inner')).map(b => parseFloat(b.style.width || '100')));
  console.log('HP bars before skip:', JSON.stringify(hpBefore));
  
  const effects = await page.evaluate(() => ({
    floatText: document.querySelectorAll('.float-text, [class*="float"]').length,
    hpBars: document.querySelectorAll('.hp-bar').length,
    hpInner: document.querySelectorAll('.hp-bar-inner').length,
    battleOverlay: document.querySelectorAll('[class*="battle-overlay"], [class*="battle-ui"]').length,
    skipBtn: document.querySelectorAll('.battle-controls button').length,
  }));
  console.log('Battle DOM elements:', JSON.stringify(effects));
  
  await page.locator('.battle-controls button', { hasText: '跳过' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'qa_screenshots/m40_05_after_skip.png' });
  
  const result = await page.evaluate(() => { const r = document.querySelector('.battle-result'); return r ? r.textContent.trim() : null; });
  console.log('Battle result:', result);
  
  const hpAfter = await page.evaluate(() => Array.from(document.querySelectorAll('.hp-bar-inner')).map(b => parseFloat(b.style.width || '100')));
  console.log('HP bars after skip:', JSON.stringify(hpAfter));
  
  await browser.close();
  console.log('=== M40 Full QA Done ===');
}
inspect().catch(console.error);
