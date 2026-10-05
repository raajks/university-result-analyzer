import { chromium } from 'playwright';

async function test() {
  console.log('Testing launch with channel: "chrome"...');
  try {
    const browser = await chromium.launch({
      channel: 'chrome',
      headless: true, // test headless first
    });
    console.log('✅ Successfully launched Google Chrome via Playwright!');
    const page = await browser.newPage();
    await page.goto('https://example.com');
    console.log('Page title:', await page.title());
    await browser.close();
    console.log('Browser closed cleanly.');
  } catch (err) {
    console.error('Failed to launch with channel: "chrome":', err);

    console.log('Trying with channel: "msedge"...');
    try {
      const browserEdge = await chromium.launch({
        channel: 'msedge',
        headless: true,
      });
      console.log('✅ Successfully launched Microsoft Edge via Playwright!');
      await browserEdge.close();
    } catch (edgeErr) {
      console.error('Failed with msedge:', edgeErr);
    }
  }
}

test();
