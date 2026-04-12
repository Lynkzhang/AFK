const { chromium } = require('playwright');
async function inspect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:4177/AFK/');
  await page.waitForSelector('.ui-panel', { timeout: 10000 });
  await page.evaluate(() => { window.__GM && window.__GM.skipOnboarding(); window.__GM && window.__GM.setCurrency(2000); });
  await page.waitForTimeout(300);
  await page.locator('button', { hasText: '🏔 场地' }).click();
  await page.waitForTimeout(600);
  const body = await page.textContent('body');
  console.log('ARENA BODY (first 600):', body.substring(0, 600));
  const allButtons = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t.length > 0));
  console.log('ALL BUTTONS IN ARENA:', JSON.stringify(allButtons));
  await page.screenshot({ path: 'workspace/qa_tester/screenshots/debug_arena.png' });
  await browser.close();
}
inspect().catch(console.error);
