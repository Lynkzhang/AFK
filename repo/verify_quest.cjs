const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:4173/AFK/');
  await page.waitForTimeout(2000);
  
  // Check current state
  const state1 = await page.evaluate(() => window.__GM?.getState());
  console.log('Initial step:', state1?.onboarding?.currentStep);
  
  // Use GM to jump to step-teach-quest directly
  await page.evaluate(() => window.__GM?.goToOnboardingStep('step-teach-quest'));
  await page.waitForTimeout(500);
  
  // Capture state after jumping to quest step
  const state2 = await page.evaluate(() => window.__GM?.getState());
  console.log('After goToOnboardingStep("step-teach-quest"):');
  console.log('  currentStep:', state2?.onboarding?.currentStep);
  console.log('  unlocks.quest:', state2?.onboarding?.unlocks?.quest);
  
  // Check if quest button is visible
  const questBtnVisible = await page.locator('.ui-actions button', { hasText: '任务' }).isVisible().catch(() => false);
  console.log('Quest button visible:', questBtnVisible);
  
  // Take screenshot of bubble
  const bubbleText = await page.locator('.onboarding-bubble').textContent().catch(() => null);
  console.log('Bubble text:', bubbleText);
  
  await page.screenshot({ path: './qa_screenshots/m41_quest_step.png' });
  console.log('Screenshot saved to qa_screenshots/m41_quest_step.png');
  
  await browser.close();
})();
