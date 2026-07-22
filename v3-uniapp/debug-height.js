const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 700, deviceScaleFactor: 1 });
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));

  const info = await page.evaluate(() => {
    const pageDiv = document.querySelector('.page');
    const uniPage = document.querySelector('.uni-page');
    return {
      pageDivH: pageDiv ? pageDiv.offsetHeight : null,
      pageDivMinH: pageDiv ? getComputedStyle(pageDiv).minHeight : null,
      uniPageH: uniPage ? uniPage.offsetHeight : null,
      bodyHeight: document.body.offsetHeight,
      htmlScrollHeight: document.documentElement.scrollHeight,
    };
  });
  console.log(JSON.stringify(info, null, 2));

  const out = 'C:\\Users\\YKing\\AppData\\Local\\Temp\\v3-wb-700.png';
  await page.screenshot({ path: out, fullPage: false });
  console.log('shot:', fs.statSync(out).size, 'bytes');
  await browser.close();
})();
