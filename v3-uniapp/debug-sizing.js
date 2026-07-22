const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 880, deviceScaleFactor: 1 });
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const sizing = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const uniPage = document.querySelector('.uni-page') || document.querySelector('#app');
    const myPage = document.querySelector('.page');
    const bizGrid = document.querySelector('.biz-grid');
    const bizCards = document.querySelectorAll('.biz');
    return {
      window: { inner: window.innerWidth, scroll: html.scrollWidth },
      body: { w: body.offsetWidth, scroll: body.scrollWidth },
      uniPage: uniPage ? { w: uniPage.offsetWidth, scroll: uniPage.scrollWidth } : null,
      myPage: myPage ? { w: myPage.offsetWidth } : null,
      bizGrid: bizGrid ? { w: bizGrid.offsetWidth } : null,
      bizCards: Array.from(bizCards).slice(0, 4).map(c => ({ w: c.offsetWidth, text: c.textContent.replace(/\s+/g,' ').slice(0, 30) })),
    };
  });
  console.log(JSON.stringify(sizing, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
