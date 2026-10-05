import { NextRequest, NextResponse } from 'next/server';
import { browserRunnerService } from '@/services/browser-runner.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const targetSessionId = sessionId || browserRunnerService.lastSessionId;

    if (!targetSessionId) {
      return NextResponse.json({ success: false, error: 'Missing sessionId query param and no active session.' }, { status: 400 });
    }

    const browserInfo = await browserRunnerService.getBrowserDiagnostics(targetSessionId);

    return NextResponse.json({
      success: true,
      sessionId: targetSessionId,
      browserSession: browserInfo,
      status: browserInfo.status,
      diagnostics: browserInfo.diagnostics,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, action = 'OPEN' } = body;
    const targetSessionId = sessionId || browserRunnerService.lastSessionId;

    if (!targetSessionId) {
      return NextResponse.json({ success: false, error: 'Missing sessionId and no active session.' }, { status: 400 });
    }

    if (action === 'CLOSE') {
      await browserRunnerService.cleanupBrowser(targetSessionId);
      const updatedInfo = await browserRunnerService.getBrowserDiagnostics(targetSessionId);
      return NextResponse.json({
        success: true,
        action: 'CLOSE',
        browserSession: updatedInfo,
      });
    }

    const inst = browserRunnerService.getBrowserInstance(targetSessionId);

    if (action === 'NAVIGATE_DIRECT') {
      const { url } = body;
      if (inst?.page && !inst.page.isClosed() && url) {
        await inst.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
        await inst.page.waitForTimeout(1000);
        return NextResponse.json({
          success: true,
          action: 'NAVIGATE_DIRECT',
          url: inst.page.url(),
          title: await inst.page.title().catch(() => ''),
        });
      }
      return NextResponse.json({ success: false, error: 'Cannot navigate: page not ready or missing url' }, { status: 400 });
    }

    if (action === 'SCREENSHOT') {
      if (inst?.page && !inst.page.isClosed()) {
        const screenshotPath = 'C:\\Users\\Abhishek Sharma\\.gemini\\antigravity-ide\\brain\\60aac9c7-1e5e-41be-85b4-c945f581c653\\browser_screenshot.png';
        await inst.page.screenshot({ path: screenshotPath }).catch(() => {});
        return NextResponse.json({
          success: true,
          action: 'SCREENSHOT',
          screenshotPath,
          url: inst.page.url(),
          title: await inst.page.title().catch(() => ''),
        });
      }
      return NextResponse.json({ success: false, error: 'No active page for screenshot.' }, { status: 400 });
    }

    if (action === 'GET_CAPTCHA_IMAGE') {
      if (inst?.page && !inst.page.isClosed()) {
        try {
          const captchaEl = await inst.page.$('#CaptchaImage, img[src*="captcha" i], img[src*="Captcha" i]');
          if (captchaEl) {
            const buffer = await captchaEl.screenshot({ type: 'png' });
            return NextResponse.json({
              success: true,
              action: 'GET_CAPTCHA_IMAGE',
              imageBase64: `data:image/png;base64,${buffer.toString('base64')}`,
            });
          }
        } catch (err: any) {
          console.error('[GET_CAPTCHA_IMAGE ERROR]', err.message);
        }
      }
      return NextResponse.json({ success: false, error: 'Captcha image element not found' });
    }

    if (action === 'INSPECT_INPUTS') {
      if (inst?.page && !inst.page.isClosed()) {
        const inputs = await inst.page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('input, select, button'));
          return els.map(e => ({
            tag: e.tagName,
            type: (e as HTMLInputElement).type,
            name: (e as HTMLInputElement).name,
            id: e.id,
            placeholder: (e as HTMLInputElement).placeholder,
            value: (e as HTMLInputElement).value,
            options: e.tagName === 'SELECT' ? Array.from((e as HTMLSelectElement).options).map(o => ({ value: o.value, text: o.text })) : undefined
          }));
        });
        return NextResponse.json({ success: true, inputs });
      }
      return NextResponse.json({ success: false, error: 'No active page' });
    }

    if (action === 'INSPECT_PAGE') {
      if (inst?.context) {
        const pagesInfo = [];
        for (const p of inst.context.pages()) {
          const info = await p.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a')).map(a => ({
              text: (a.textContent || '').trim(),
              innerText: (a.innerText || '').trim(),
              href: a.href || a.getAttribute('href') || '',
              target: a.target || a.getAttribute('target') || '',
              visible: a.offsetParent !== null && window.getComputedStyle(a).display !== 'none',
              classes: a.className,
              id: a.id,
            }));
            const forms = Array.from(document.querySelectorAll('form')).map(f => ({
              action: f.action,
              method: f.method,
              id: f.id,
              name: f.name,
            }));
            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]')).map(b => ({
              tag: b.tagName,
              type: (b as HTMLInputElement).type,
              value: (b as HTMLInputElement).value,
              text: (b.textContent || '').trim(),
              id: b.id,
              name: (b as HTMLInputElement).name,
            }));
            return { anchors, forms, buttons };
          }).catch((e: any) => ({ error: e.message, anchors: [], forms: [], buttons: [] }));

          pagesInfo.push({
            url: p.url(),
            title: await p.title().catch(() => ''),
            ...info,
          });
        }
        return NextResponse.json({ success: true, pages: pagesInfo });
      }
      return NextResponse.json({ success: false, error: 'No active browser context' });
    }

    if (action === 'ENTER_CAPTCHA_AND_SEARCH') {
      const { captchaText } = body;
      if (inst?.page && !inst.page.isClosed() && captchaText) {
        const session = browserRunnerService.getSession(targetSessionId);
        const student = session?.currentStudent || (session ? browserRunnerService.sessionQueues.get(targetSessionId)?.[0] : null);
        if (student) {
          await browserRunnerService.fillSearchFormFields(inst.page, student);
        }
        await inst.page.fill('#CaptchaInputText', captchaText).catch(() => {});
        await inst.page.dispatchEvent('#CaptchaInputText', 'input').catch(() => {});
        await inst.page.click('button:has-text("Search"), input[value="Search"], #form1 button').catch(() => {});
        await inst.page.waitForTimeout(2000);
        return NextResponse.json({
          success: true,
          action: 'ENTER_CAPTCHA_AND_SEARCH',
          captchaText,
          currentUrl: inst.page.url(),
          title: await inst.page.title().catch(() => ''),
        });
      }
      return NextResponse.json({ success: false, error: 'Cannot submit search: missing page or captchaText' }, { status: 400 });
    }

    if (action === 'DUMP_PAGE_CONTENT') {
      const pageIndex = body.pageIndex ?? 1;
      const targetPage = inst?.context?.pages()[pageIndex];
      if (targetPage) {
        const content = await targetPage.content().catch(() => '');
        const visibleText = await targetPage.evaluate(() => document.body.innerText).catch(() => '');
        return NextResponse.json({
          success: true,
          url: targetPage.url(),
          title: await targetPage.title().catch(() => ''),
          contentLength: content.length,
          visibleText: visibleText.slice(0, 2000),
          snippet: content.slice(0, 3000),
        });
      }
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 400 });
    }

    if (action === 'FILL_FORM') {
      const session = browserRunnerService.getSession(targetSessionId);
      const student = session?.currentStudent || (session ? browserRunnerService.sessionQueues.get(targetSessionId)?.[0] : null);
      if (inst?.page && !inst.page.isClosed() && student) {
        const hasRoll = Boolean(await inst.page.$('#roll').catch(() => null));
        const hasButtonClicked = Boolean(await inst.page.$('#buttonClicked').catch(() => null));
        const filled = await browserRunnerService.fillSearchFormFields(inst.page, student);
        const rollVal = await inst.page.$eval('#roll', (e: any) => e.value).catch(() => 'err');
        const selectVal = await inst.page.$eval('#buttonClicked', (e: any) => e.value).catch(() => 'err');
        return NextResponse.json({
          success: true,
          filled,
          student,
          pageUrl: inst.page.url(),
          hasRoll,
          hasButtonClicked,
          rollVal,
          selectVal
        });
      }
      return NextResponse.json({ success: false, error: 'Cannot fill form: no active page or student' }, { status: 400 });
    }

    if (action === 'OPEN' || action === 'RETRY' || action === 'FOCUS') {
      const forceReopen = action === 'RETRY';
      const session = browserRunnerService.getSession(targetSessionId);
      const student = session?.currentStudent || (session ? browserRunnerService.sessionQueues.get(targetSessionId)?.[0] : null);

      const diagnostics = await browserRunnerService.launchOrAttachBrowser(targetSessionId, student, forceReopen);
      const updatedInfo = await browserRunnerService.getBrowserDiagnostics(targetSessionId);

      return NextResponse.json({
        success: true,
        action,
        browserSession: updatedInfo,
        diagnostics,
      });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: 'BROWSER_ERROR',
    }, { status: 500 });
  }
}
