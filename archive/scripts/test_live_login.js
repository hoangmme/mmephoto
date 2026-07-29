import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(); // Fresh incognito context
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  console.log('Navigating to https://photo.llphotobooth.vn/...');
  await page.goto('https://photo.llphotobooth.vn/', { waitUntil: 'networkidle' });

  console.log('Checking login overlay visibility...');
  const isOverlayVisible = await page.$eval('#loginOverlay', el => getComputedStyle(el).display !== 'none');
  console.log('Overlay visible initially:', isOverlayVisible);

  console.log('Filling login form...');
  await page.fill('#loginBranch', 'hangkhay');
  await page.fill('#loginPassword', '123456');

  console.log('Clicking btnLoginSubmit...');
  await page.click('#btnLoginSubmit');

  await page.waitForTimeout(2000);

  const isOverlayVisibleAfter = await page.$eval('#loginOverlay', el => getComputedStyle(el).display !== 'none');
  console.log('Overlay visible after login click:', isOverlayVisibleAfter);

  const roomTabsText = await page.evaluate(() => document.getElementById('roomTabs')?.innerText);
  console.log('Room Tabs inner text:', roomTabsText);

  const headerBranchName = await page.evaluate(() => document.getElementById('headerBranchName')?.innerText);
  console.log('Header Branch Name:', headerBranchName);

  await browser.close();
})();
