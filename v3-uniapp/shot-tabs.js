const puppeteer = require('puppeteer-core');
const fs = require('fs');

const urlFor = (tab) => {
  if (tab === 'workbench') return 'http://localhost:8080/';
  return `http://localhost:8080/#/pages/${tab}/index`;
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });

  const tabs = ['workbench', 'info', 'orders', 'ai', 'me'];
  for (const t of tabs) {
    const page = await browser.newPage();
    await page.setViewport({ width: 420, height: 880, deviceScaleFactor: 1 });
    await page.goto(urlFor(t), { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2500));
    const out = `C:\\Users\\YKing\\AppData\\Local\\Temp\\v3-${t}.png`;
    await page.screenshot({ path: out, fullPage: false });
    console.log(`${t}: ${fs.statSync(out).size} bytes`);
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
