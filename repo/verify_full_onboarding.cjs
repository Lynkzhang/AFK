const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:4173/AFK/');
  await page.waitForTimeout(2000);
  
  console.log('=== Full Onboarding Tutorial Verification (Using GM to advance battle steps) ===');
  
  // Start from a clean new game state
  await page.evaluate(() => window.__GM?.skipOnboarding());
  await page.waitForTimeout(200);
  
  page.on('dialog', d => d.accept());
  
  // Click new game to restart tutorial
  await page.locator('.ui-actions button', { hasText: '新游戏' }).click();
  await page.waitForTimeout(500);
  
  // Complete welcome, split, cull, sell, archive using GM
  let state = await page.evaluate(() => window.__GM?.getState());
  console.log('Step 1 - Welcome:', state?.onboarding?.currentStep);
  await page.locator('.onboarding-btn').click();
  await page.waitForTimeout(300);
  
  // Wait-split
  await page.evaluate(() => window.__GM?.triggerSplit());
  await page.waitForTimeout(500);
  
  // First split confirm
  state = await page.evaluate(() => window.__GM?.getState());
  console.log('Step 3 - First split:', state?.onboarding?.currentStep);
  await page.locator('.onboarding-btn').click();
  await page.waitForTimeout(300);
  
  // Cull step
  state = await page.evaluate(() => window.__GM?.getState());
  console.log('Step 4 - Teach cull:', state?.onboarding?.currentStep);
  await page.evaluate(() => window.__GM?.openBackpack());
  await page.waitForTimeout(300);
  await page.locator('.backpack-card').first().click();
  await page.waitForTimeout(100);
  await page.evaluate(() => { document.querySelector('.backpack-detail-cull-btn')?.click(); });
  await page.evaluate(() => window.__GM?.closeBackpack());
  await page.waitForTimeout(500);
  
  // Sell step
  state = await page.evaluate(() => window.__GM?.getState());
  console.log('Step 5 - Teach sell:', state?.onboarding?.currentStep);
  if (state?.slimes?.length < 2) { await page.evaluate(() => window.__GM?.triggerSplit()); await page.waitForTimeout(300); }
  await page.evaluate(() => window.__GM?.openBackpack());
  await page.waitForTimeout(300);
  await page.locator('.backpack-card').first().click();
  await page.waitForTimeout(100);
  await page.evaluate(() => { document.querySelector('.backpack-detail-sell-btn')?.click(); });
  await page.evaluate(() => window.__GM?.closeBackpack());
  await page.waitForTimeout(500);
  
  state = await page.evaluate(() => window.__GM?.getState());
  if (state?.onboarding?.currentStep === 'step-wait-recover-2') {
    await page.evaluate(() => window.__GM?.triggerSplit());
    await page.waitForTimeout(300);
  }
  
  // Archive step
  state = await page.evaluate(() => window.__GM?.getState());
  console.log('Step 6 - Teach archive:', state?.onboarding?.currentStep);
  await page.evaluate(() => window.__GM?.openBackpack());
  await page.waitForTimeout(300);
  await page.locator('.backpack-card').first().click();
  await page.waitForTimeout(100);
  await page.evaluate(() => { document.querySelector('.backpack-detail-archive-btn')?.click(); });
  await page.evaluate(() => window.__GM?.closeBackpack());
  await page.waitForTimeout(500);
  
  // Battle step - use GM to fire 'battle-complete' event directly
  state = await page.evaluate(() => window.__GM?.getState());
  console.log('Step 7 - Teach battle:', state?.onboarding?.currentStep);
  // Fire battle-complete event via GM if available, otherwise use autoBattle
  await page.evaluate(() => {
    // Use autoBattle to trigger battle-complete
    window.__GM?.autoBattle('1-1');
  });
  await page.waitForTimeout(1000);
  
  state = await page.evaluate(() => window.__GM?.getState());
  console.log('After battle - step:', state?.onboarding?.currentStep);
  
  // First victory dialog
  if (state?.onboarding?.currentStep === 'step-first-victory') {
    const btn = await page.locator('.onboarding-btn').isVisible().catch(() => false);
    if (btn) { await page.locator('.onboarding-btn').click(); await page.waitForTimeout(300); }
  }
  
  // Facility step
  state = await page.evaluate(() => window.__GM?.getState());
  console.log('Step 8 - Teach facility:', state?.onboarding?.currentStep);
  if (state?.onboarding?.currentStep === 'step-teach-facility') {
    await page.evaluate(() => window.__GM?.upgradeAuto());
    await page.waitForTimeout(500);
    state = await page.evaluate(() => window.__GM?.getState());
    console.log('After facility upgrade - step:', state?.onboarding?.currentStep);
  }
  
  // Shop step  
  state = await page.evaluate(() => window.__GM?.getState());
  console.log('Step - Teach shop:', state?.onboarding?.currentStep);
  if (state?.onboarding?.currentStep === 'step-teach-shop') {
    const shopBtn = await page.locator('.onboarding-btn').isVisible().catch(() => false);
    if (shopBtn) { await page.locator('.onboarding-btn').click(); await page.waitForTimeout(300); }
  }
  
  // KEY STEP: Teach quest
  state = await page.evaluate(() => window.__GM?.getState());
  console.log('\n=== KEY STEP: step-teach-quest ===');
  console.log('currentStep:', state?.onboarding?.currentStep);
  console.log('unlocks.quest:', state?.onboarding?.unlocks?.quest);
  
  const questBtnVis = await page.locator('.ui-actions button', { hasText: '任务' }).isVisible().catch(() => false);
  console.log('Quest button visible in UI:', questBtnVis);
  
  await page.screenshot({ path: './qa_screenshots/m41_full_quest_step.png' });
  
  // USE GM TO JUMP DIRECTLY if flow didn't reach quest step
  if (state?.onboarding?.currentStep !== 'step-teach-quest') {
    console.log('\n--- Using goToOnboardingStep to jump to quest step ---');
    await page.evaluate(() => window.__GM?.goToOnboardingStep('step-teach-quest'));
    await page.waitForTimeout(500);
    state = await page.evaluate(() => window.__GM?.getState());
    console.log('After jump - currentStep:', state?.onboarding?.currentStep);
    console.log('After jump - unlocks.quest:', state?.onboarding?.unlocks?.quest);
    const questBtnVis2 = await page.locator('.ui-actions button', { hasText: '任务' }).isVisible().catch(() => false);
    console.log('After jump - Quest button visible:', questBtnVis2);
    await page.screenshot({ path: './qa_screenshots/m41_full_quest_jumped.png' });
  }
  
  await browser.close();
  console.log('\nDone. Screenshots saved to qa_screenshots/');
})();
