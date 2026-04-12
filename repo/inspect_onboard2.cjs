const { chromium } = require('playwright');
async function go() {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.goto('http://localhost:4177/AFK/');
  await p.waitForSelector('.ui-panel', { timeout: 10000 });
  const sc = await p.locator('.slime-card').count();
  const onb = await p.locator('.onboarding-dialog').count();
  const curr = await p.evaluate(() => window.__GM && window.__GM.getState().currency);
  const sl = await p.evaluate(() => window.__GM && window.__GM.getState().slimes.length);
  console.log('slimeCards:', sc, 'onboardDialog:', onb, 'currency:', curr, 'slimes:', sl);
  await b.close();
}
go().catch(console.error);
