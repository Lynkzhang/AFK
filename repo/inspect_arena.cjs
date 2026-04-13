const { chromium } = require('playwright');
async function inspect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:4177/AFK/');
  await page.waitForSelector('.ui-panel', { timeout: 10000 });
  
  // M40 QA: Battle Canvas Visual Check
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
  await page.screenshot({ path: 'qa_screenshots/m40_01_main.png' });
  
  // Go to battle
  await page.locator('.ui-actions button', { hasText: '战斗' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'qa_screenshots/m40_02_stage_select.png' });
  
  await page.locator('.stage-card').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'qa_screenshots/m40_03_team_select.png' });
  
  const slimeCards = page.locator('.team-slime-card');
  const count = await slimeCards.count();
  console.log('Team slime cards:', count);
  for (let i = 0; i < Math.min(count, 4); i++) {
    await slimeCards.nth(i).click();
  }
  await page.waitForTimeout(300);
  
  await page.locator('.confirm-btn', { hasText: '开始战斗' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'qa_screenshots/m40_04_battle_active.png' });
  
  // Check canvas
  const canvas = page.locator('.battle-canvas-container canvas');
  const canvasVisible = await canvas.isVisible().catch(() => false);
  console.log('Canvas visible:', canvasVisible);
  
  if (canvasVisible) {
    const size = await canvas.evaluate((el) => ({ w: el.width, h: el.height }));
    console.log('Canvas size:', JSON.stringify(size));
    
    const hasPixels = await canvas.evaluate((el) => {
      const ctx = el.getContext('2d');
      if (!ctx) return false;
      const data = ctx.getImageData(0, 0, el.width, el.height).data;
      let nonZero = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 0 || data[i+1] > 0 || data[i+2] > 0) nonZero++;
      }
      return nonZero;
    });
    console.log('Canvas non-zero pixels:', hasPixels);
  }
  
  // Check skip button
  const skipBtn = page.locator('.battle-controls button', { hasText: '跳过' });
  const skipVisible = await skipBtn.isVisible().catch(() => false);
  console.log('Skip button visible:', skipVisible);
  
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Battle body includes canvas-container:', bodyText.includes('battle-canvas') || document.querySelector('.battle-canvas-container') !== null);
  
  // Check HP bars
  const hpBars = await page.locator('.hp-bar-inner').count();
  console.log('HP bar count:', hpBars);
  
  // Click skip
  if (skipVisible) {
    await skipBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'qa_screenshots/m40_05_after_skip.png' });
    
    const result = page.locator('.battle-result');
    const resultVisible = await result.isVisible().catch(() => false);
    console.log('Battle result visible:', resultVisible);
    if (resultVisible) {
      console.log('Battle result text:', await result.textContent());
    }
  }
  
  console.log('=== M40 QA Check Complete ===');
  await browser.close();
}
inspect().catch(console.error);
