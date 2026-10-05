import { universityRegistry } from '../universities/registry';
import { CCSUMockGenerator } from '../universities/ccsu/ccsu.mock';
import { CCSU_CONFIG } from '../universities/ccsu/ccsu.config';
import {
  StudentLookupInput,
  ExtractedResult,
  ValidationResult,
  CollectionStep,
  CollectionState,
  BrowserSessionLifecycleStatus,
  BrowserSessionDiagnostics,
  BrowserSessionInfo,
  isCloudflareResponse,
  isMarksheetDom
} from '../universities/base/types';
import {
  normalizeSemesterToNumber,
  toRomanSemester,
  textMatchesSemester,
  detectSemesterInText,
} from '../universities/base/semester-helper';

export { isCloudflareResponse, isMarksheetDom };

export interface StepLogEntry {
  step: CollectionStep;
  rollNumber: string;
  message: string;
  timestamp: Date;
}

export interface RunnerSessionStatus {
  sessionId: string;
  universityCode: string;
  status: CollectionState | 'IDLE' | 'RUNNING' | 'AWAITING_VERIFICATION' | 'PAUSED' | 'COMPLETED' | 'STOPPED';
  collectionState: CollectionState;
  currentStudentIndex: number;
  totalStudents: number;
  currentStudent: StudentLookupInput | null;
  activeRollNumber: string | null;
  lastMessage: string;
  mode: 'interactive' | 'mock';
  requiresCaptcha: boolean;
  history: Array<{
    rollNumber: string;
    status: string;
    message: string;
    timestamp: string;
  }>;
  recentLogs: StepLogEntry[];
  pendingVerificationResult?: {
    extracted: ExtractedResult;
    validation: ValidationResult;
    debugJson: Record<string, any>;
  } | null;
  browserSession?: BrowserSessionInfo;
}

export interface PersistentBrowserInstance {
  browser: any;
  context: any;
  page: any;
  status: BrowserSessionLifecycleStatus;
  diagnostics: BrowserSessionDiagnostics;
  lastError?: string | null;
  launchedAt?: Date;
}

// Global persistent state across Next.js API reloads
const globalForRunner = globalThis as unknown as {
  browserRunnerService?: BrowserRunnerService;
  __ccsu_browser_instances?: Map<string, PersistentBrowserInstance>;
  __ccsu_runner_sessions?: Map<string, RunnerSessionStatus>;
  __ccsu_session_queues?: Map<string, StudentLookupInput[]>;
  __ccsu_last_active_session_id?: string;
};

class BrowserRunnerService {
  public activeSessions: Map<string, RunnerSessionStatus> =
    globalForRunner.__ccsu_runner_sessions ||
    (globalForRunner.__ccsu_runner_sessions = new Map());

  public sessionQueues: Map<string, StudentLookupInput[]> =
    globalForRunner.__ccsu_session_queues ||
    (globalForRunner.__ccsu_session_queues = new Map());

  public activeBrowsers: Map<string, PersistentBrowserInstance> =
    globalForRunner.__ccsu_browser_instances ||
    (globalForRunner.__ccsu_browser_instances = new Map());

  public get lastSessionId(): string | undefined {
    return globalForRunner.__ccsu_last_active_session_id;
  }

  public set lastSessionId(val: string | undefined) {
    globalForRunner.__ccsu_last_active_session_id = val;
  }

  public createSession(
    sessionId: string,
    universityCode: string,
    students: StudentLookupInput[],
    mode: 'interactive' | 'mock' = 'interactive'
  ): RunnerSessionStatus {
    // If there is any existing active browser from a previous session, migrate it to the new sessionId
    const lastSessionId = globalForRunner.__ccsu_last_active_session_id;
    if (lastSessionId && lastSessionId !== sessionId) {
      const prevBrowser = this.activeBrowsers.get(lastSessionId);
      if (prevBrowser && prevBrowser.browser?.isConnected()) {
        this.activeBrowsers.set(sessionId, prevBrowser);
        this.activeBrowsers.delete(lastSessionId);
      }
    }
    globalForRunner.__ccsu_last_active_session_id = sessionId;

    const initialDiagnostics: BrowserSessionDiagnostics = {
      browserLaunched: false,
      headless: false,
      browserPid: null,
      contextActive: false,
      pageActive: false,
      currentUrl: '',
      pageTitle: '',
      numberOfOpenPages: 0,
      windowVisible: false,
      launchError: null,
    };

    const session: RunnerSessionStatus = {
      sessionId,
      universityCode,
      status: 'IDLE',
      collectionState: 'WAITING_FOR_CAPTCHA',
      currentStudentIndex: 0,
      totalStudents: students.length,
      currentStudent: students[0] || null,
      activeRollNumber: students[0]?.rollNumber || null,
      lastMessage: 'Session initialized. Ready to start.',
      mode,
      requiresCaptcha: true,
      history: [],
      recentLogs: [],
      pendingVerificationResult: null,
      browserSession: {
        status: 'BROWSER_NOT_STARTED',
        diagnostics: initialDiagnostics,
      },
    };

    this.activeSessions.set(sessionId, session);
    this.sessionQueues.set(sessionId, students);
    return session;
  }

  public getSession(sessionId: string): RunnerSessionStatus | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Prepares the student in queue:
   * 1. Launches visible Google Chrome browser (headless: false)
   * 2. Navigates to CCSU portal
   * 3. Fills Roll Number & Marksheet Type
   * 4. Pauses for human user to solve CAPTCHA
   */
  public async prepareNextStudent(
    sessionId: string,
    studentsOverride?: StudentLookupInput[]
  ): Promise<RunnerSessionStatus> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const students = studentsOverride || this.sessionQueues.get(sessionId) || [];

    if (session.currentStudentIndex >= students.length) {
      session.status = 'COMPLETED';
      session.lastMessage = 'All students processed successfully!';
      session.currentStudent = null;
      session.activeRollNumber = null;
      session.pendingVerificationResult = null;
      // Close browser upon entire batch completion
      await this.cleanupBrowser(sessionId);
      return session;
    }

    const current = students[session.currentStudentIndex];
    session.currentStudent = current;
    session.activeRollNumber = current.rollNumber;
    session.status = 'WAITING_FOR_CAPTCHA';
    session.lastMessage = `Roll Number ${current.rollNumber} prepared. Please solve the CAPTCHA in the open Chrome window and submit search.`;
    session.pendingVerificationResult = null;

    this.logStep(session, 'SEARCH_STARTED', current.rollNumber, `Opened search portal for student ${current.rollNumber}`);

    // If Playwright interactive mode is active, launch or attach visible browser
    if (session.mode === 'interactive') {
      try {
        await this.launchOrAttachBrowser(sessionId, current);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Playwright launch error in prepareNextStudent:', msg);
        session.lastMessage = `CCSU browser window could not be opened. ${msg}`;
      }
    }

    this.logStep(session, 'CAPTCHA_REQUIRED', current.rollNumber, `Human CAPTCHA required for roll number ${current.rollNumber}.`);

    return session;
  }

  /**
   * Completes search, detects result link, captures new tab, parses live marksheet DOM,
   * extracts student info + 8 subjects + summary, and generates debug info.
   * NEVER returns mock data in interactive / REAL CCSU mode.
   */
  public async submitCaptchaAndExtract(
    sessionId: string,
    currentStudent: StudentLookupInput,
    rawHtmlOverride?: string
  ): Promise<{
    extracted: ExtractedResult;
    validation: ValidationResult;
    stepLogs: StepLogEntry[];
    debugJson: Record<string, any>;
  }> {
    const session = this.activeSessions.get(sessionId);
    const adapter = universityRegistry.getAdapter(session?.universityCode || 'CCSU');
    const stepLogs: StepLogEntry[] = [];

    const recordStep = (step: CollectionStep, message: string) => {
      const entry: StepLogEntry = {
        step,
        rollNumber: currentStudent.rollNumber,
        message,
        timestamp: new Date(),
      };
      stepLogs.push(entry);
      if (session) {
        this.logStep(session, step, currentStudent.rollNumber, message);
      }
    };

    if (session) {
      session.status = 'CAPTCHA_SUBMITTED';
      session.collectionState = 'CAPTCHA_SUBMITTED';
    }
    recordStep('CAPTCHA_SUBMITTED', `Search submitted for student ${currentStudent.rollNumber}. Checking browser tabs...`);

    let rawHtml = rawHtmlOverride || '';
    if (rawHtml && isCloudflareResponse(rawHtml)) {
      if (session) {
        session.status = 'CLOUDFLARE_CHALLENGE_ACTIVE';
        session.collectionState = 'CLOUDFLARE_CHALLENGE_ACTIVE';
        session.lastMessage = 'Cloudflare verification required. Please complete the "Verify you are human" check in the CCSU browser window.';
      }
      recordStep('CLOUDFLARE_CHALLENGE_ACTIVE', 'Cloudflare security challenge active in provided HTML.');
      const err = new Error(
        `CLOUDFLARE_CHALLENGE_ACTIVE: Cloudflare security challenge ("Just a moment...") is active. Please complete the 'Verify you are human' check in the CCSU browser window.`
      );
      (err as any).code = 'CLOUDFLARE_CHALLENGE_ACTIVE';
      (err as any).state = 'CLOUDFLARE_CHALLENGE_ACTIVE';
      throw err;
    }

    const debugLogData: Record<string, any> = {
      searchPageUrl: '',
      resultLinkText: '',
      resultLinkHref: '',
      newTabUrl: '',
      detectedTableCount: 0,
      selectedMarksheetTable: '',
      extractedRowCount: 0,
    };

    // Playwright multi-tab handling for REAL CCSU mode
    if (!rawHtml && session?.mode === 'interactive') {
      let browserInstance = this.getBrowserInstance(sessionId);

      // If browser not yet created, attempt to attach or launch
      if (!browserInstance || !browserInstance.browser?.isConnected() || !browserInstance.page || browserInstance.page.isClosed()) {
        try {
          await this.launchOrAttachBrowser(sessionId, currentStudent);
          browserInstance = this.getBrowserInstance(sessionId);
        } catch (_) {}
      }

      if (!browserInstance || !browserInstance.browser?.isConnected() || !browserInstance.page || browserInstance.page.isClosed()) {
        const err = new Error('CCSU browser window is not open or was closed. Please click "Open CCSU Browser" to launch a visible browser window.');
        (err as any).code = 'BROWSER_NOT_READY';
        (err as any).state = 'BROWSER_ERROR';
        throw err;
      }

      const { context, page } = browserInstance;

      // 1. Wait for page to settle after search submit
      debugLogData.searchPageUrl = page.url();
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(800);

      // 2. CHECK EXISTING PAGES FIRST: Does any page already contain genuine marksheet or Cloudflare?
      let allOpenPages = context.pages();
      let marksheetPage: any = null;
      let detectedCloudflarePage: any = null;
      const targetSemNum = normalizeSemesterToNumber(currentStudent.semester);

      for (const p of allOpenPages) {
        try {
          const content = await p.content().catch(() => '');
          if (isCloudflareResponse(content)) {
            detectedCloudflarePage = p;
          } else if (isMarksheetDom(content)) {
            const pUrl = p.url();
            // Check if matches the current student's roll number
            const rollMatches = pUrl.includes(currentStudent.rollNumber) || content.includes(currentStudent.rollNumber);
            if (rollMatches) {
              // Only accept existing tab if it matches requested semester or no specific semester requested
              if (targetSemNum !== null) {
                const combinedTabInfo = `${pUrl} ${content.substring(0, 3000)}`;
                const matchesTarget = textMatchesSemester(combinedTabInfo, targetSemNum);
                const detectedTabSem = detectSemesterInText(combinedTabInfo);
                if (matchesTarget) {
                  marksheetPage = p;
                  rawHtml = content;
                  debugLogData.newTabUrl = p.url();
                  break;
                } else if (detectedTabSem !== null && detectedTabSem !== targetSemNum) {
                  console.log(`[submitCaptchaAndExtract] Closing stale marksheet tab of wrong semester (${detectedTabSem} vs requested ${targetSemNum}):`, pUrl);
                  await p.close().catch(() => {});
                  continue;
                }
              } else {
                marksheetPage = p;
                rawHtml = content;
                debugLogData.newTabUrl = p.url();
                break;
              }
            } else {
              console.log('[submitCaptchaAndExtract] Closing stale marksheet tab of previous student:', pUrl);
              await p.close().catch(() => {});
            }
          }
        } catch (_) {}
      }

      // If genuine marksheet already loaded, skip link clicking
      if (marksheetPage && rawHtml) {
        console.log('[submitCaptchaAndExtract] Genuine marksheet DOM already active on page:', marksheetPage.url());
      } else if (detectedCloudflarePage && !marksheetPage) {
        // Cloudflare is active
        if (session) {
          session.status = 'CLOUDFLARE_CHALLENGE_ACTIVE';
          session.collectionState = 'CLOUDFLARE_CHALLENGE_ACTIVE';
          session.lastMessage = 'Cloudflare verification required. Please complete the "Verify you are human" check in the CCSU browser window.';
        }
        recordStep('CLOUDFLARE_CHALLENGE_ACTIVE', 'Cloudflare security challenge ("Just a moment...") active in browser window. Verification required.');
        const err = new Error(
          `CLOUDFLARE_CHALLENGE_ACTIVE: Cloudflare security challenge ("Just a moment...") is active. Please complete the 'Verify you are human' check in the CCSU browser window.`
        );
        (err as any).code = 'CLOUDFLARE_CHALLENGE_ACTIVE';
        (err as any).state = 'CLOUDFLARE_CHALLENGE_ACTIVE';
        throw err;
      } else {
        // 3. NO MARKSHEET YET: We are on the Search Results page!
        // Inspect search-results DOM across all open pages and log candidate anchors
        allOpenPages = context.pages();
        const searchDebugTrail: any = {
          currentUrl: page.url(),
          pageTitle: await page.title().catch(() => ''),
          numberOfPages: allOpenPages.length,
          pages: [],
        };

        console.log('==================================================');
        console.log('SEARCH RESULT DEBUG');
        console.log('==================================================');
        console.log(`Current URL: ${searchDebugTrail.currentUrl}`);
        console.log(`Page Title: ${searchDebugTrail.pageTitle}`);
        console.log(`Number of pages: ${searchDebugTrail.numberOfPages}\n`);

        interface CandidateLinkInfo {
          pageIndex: number;
          page: any;
          element: any;
          textContent: string;
          innerText: string;
          href: string;
          target: string;
          visible: boolean;
          score: number;
        }

        const candidateLinks: CandidateLinkInfo[] = [];

        for (let i = 0; i < allOpenPages.length; i++) {
          const p = allOpenPages[i];
          const pUrl = p.url();
          const pTitle = await p.title().catch(() => '');

          console.log(`PAGE ${i + 1}`);
          console.log(`URL: ${pUrl}`);
          console.log(`TITLE: ${pTitle}`);
          console.log('Candidate result links:');

          const pageCandidateData: any = {
            pageNumber: i + 1,
            url: pUrl,
            title: pTitle,
            candidates: [],
          };

          // Query all anchor elements on this page
          const anchors = await p.$$('a, [role="link"]');
          let pageCandIdx = 0;

          for (const a of anchors) {
            try {
              const textContent = (await a.textContent().catch(() => ''))?.trim() || '';
              const innerText = (await a.innerText().catch(() => ''))?.trim() || '';
              const href = (await a.getAttribute('href').catch(() => '')) || '';
              const target = (await a.getAttribute('target').catch(() => '')) || '';
              const isVisible = await a.isVisible().catch(() => false);

              // Query parent table row text for complete row context (e.g. course, semester column)
              const rowText = (await a.evaluate((el: any) => {
                const tr = el.closest('tr');
                return tr ? tr.innerText : '';
              }).catch(() => '')) || '';

              const combinedText = `${textContent} ${innerText} ${href} ${rowText}`;

              // Pattern checks as explicitly required
              const matchesCoursePattern =
                /COURSE-/i.test(combinedText) ||
                /SEM-/i.test(combinedText) ||
                /B\.?C\.?A\.?/i.test(combinedText) ||
                /BCA/i.test(combinedText) ||
                /NEP/i.test(combinedText) ||
                /EXAMINATION/i.test(combinedText) ||
                /marksheet/i.test(href) ||
                /result/i.test(href);

              // Ignore non-result anchors (e.g. captcha refresh image, empty anchors)
              const isCaptchaOrNav =
                /captcha/i.test(href) ||
                /captcha/i.test(combinedText) ||
                href === '#' ||
                (href.startsWith('javascript:void') && !matchesCoursePattern);

              if (matchesCoursePattern && !isCaptchaOrNav && (textContent.length > 0 || href.length > 1)) {
                pageCandIdx++;
                console.log(`  ${pageCandIdx}. text: ${textContent || innerText}`);
                console.log(`     href: ${href}`);
                console.log(`     target: ${target}`);
                console.log(`     visible: ${isVisible}`);

                // Calculate matching score for current student
                let score = 1;
                const courseClean = (currentStudent.course || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                const textClean = combinedText.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

                if (courseClean && textClean.includes(courseClean)) score += 10;
                if (/COURSE-/i.test(combinedText)) score += 5;
                if (/SEM-/i.test(combinedText)) score += 5;
                if (/NEP/i.test(combinedText)) score += 3;
                if (/EXAMINATION/i.test(combinedText)) score += 2;
                if (isVisible) score += 2;

                // CRITICAL: Semester Matching
                if (targetSemNum !== null) {
                  const matchesTarget = textMatchesSemester(combinedText, targetSemNum);
                  const detectedSem = detectSemesterInText(combinedText);
                  if (matchesTarget) {
                    score += 150; // Heavy priority boost for exact requested semester!
                  } else if (detectedSem !== null && detectedSem !== targetSemNum) {
                    score -= 150; // Strong penalty for belonging to a different semester (e.g. Sem 1 instead of Sem 2)
                  }
                }

                const candInfo: CandidateLinkInfo = {
                  pageIndex: i,
                  page: p,
                  element: a,
                  textContent,
                  innerText,
                  href,
                  target,
                  visible: isVisible,
                  score,
                };
                candidateLinks.push(candInfo);

                pageCandidateData.candidates.push({
                  index: pageCandIdx,
                  text: textContent || innerText,
                  href,
                  target,
                  visible: isVisible,
                  score,
                });
              }
            } catch (_) {}
          }

          if (pageCandIdx === 0) {
            console.log('  (No candidate course/result links found on this page)');
          }
          console.log('');
          searchDebugTrail.pages.push(pageCandidateData);
        }

        debugLogData.searchResultDebug = searchDebugTrail;

        // Check if any candidate link was detected
        if (candidateLinks.length === 0) {
          // Check if Cloudflare appeared on search page
          for (const p of context.pages()) {
            const content = await p.content().catch(() => '');
            if (isCloudflareResponse(content)) {
              if (session) {
                session.status = 'CLOUDFLARE_CHALLENGE_ACTIVE';
                session.collectionState = 'CLOUDFLARE_CHALLENGE_ACTIVE';
                session.lastMessage = 'Cloudflare verification required. Please complete the "Verify you are human" check in the CCSU browser window.';
              }
              recordStep('CLOUDFLARE_CHALLENGE_ACTIVE', 'Cloudflare security challenge active on search page.');
              const err = new Error(
                `CLOUDFLARE_CHALLENGE_ACTIVE: Cloudflare security challenge ("Just a moment...") is active. Please complete the 'Verify you are human' check in the CCSU browser window.`
              );
              (err as any).code = 'CLOUDFLARE_CHALLENGE_ACTIVE';
              (err as any).state = 'CLOUDFLARE_CHALLENGE_ACTIVE';
              throw err;
            }
          }

          // Return specific state CCSU_RESULT_LINK_NOT_FOUND (Do NOT report REAL_CCSU_EXTRACTION_FAILED)
          const notFoundMsg = `CCSU_RESULT_LINK_NOT_FOUND: No course/result link was found on the CCSU search results page for student ${currentStudent.rollNumber}. Please ensure CAPTCHA was entered correctly and Search was clicked in the CCSU browser window.`;
          if (session) {
            session.status = 'CCSU_RESULT_LINK_NOT_FOUND';
            session.collectionState = 'CCSU_RESULT_LINK_NOT_FOUND';
            session.lastMessage = notFoundMsg;
          }
          recordStep('CCSU_RESULT_LINK_NOT_FOUND', notFoundMsg);
          const err = new Error(notFoundMsg);
          (err as any).code = 'CCSU_RESULT_LINK_NOT_FOUND';
          (err as any).state = 'CCSU_RESULT_LINK_NOT_FOUND';
          (err as any).debug = searchDebugTrail;
          throw err;
        }

        // Sort candidate links by score descending (highest match first)
        candidateLinks.sort((a, b) => b.score - a.score);
        const selectedCandidate = candidateLinks[0];

        // Guard: If all candidate links explicitly belonged to other semesters
        if (targetSemNum !== null && selectedCandidate.score < 0) {
          const detectedOther = detectSemesterInText(selectedCandidate.textContent || selectedCandidate.innerText || selectedCandidate.href);
          const semMissingMsg = `SEMESTER_${targetSemNum}_NOT_FOUND: Found result for Semester ${detectedOther || 'other'}, but result for Semester ${targetSemNum} (${toRomanSemester(targetSemNum)}) has not been declared or is not available on CCSU portal for roll ${currentStudent.rollNumber}.`;
          if (session) {
            session.status = 'CCSU_RESULT_LINK_NOT_FOUND';
            session.collectionState = 'CCSU_RESULT_LINK_NOT_FOUND';
            session.lastMessage = semMissingMsg;
          }
          recordStep('CCSU_RESULT_LINK_NOT_FOUND', semMissingMsg);
          const err = new Error(semMissingMsg);
          (err as any).code = 'SEMESTER_NOT_FOUND';
          (err as any).state = 'CCSU_RESULT_LINK_NOT_FOUND';
          (err as any).debug = searchDebugTrail;
          throw err;
        }

        debugLogData.resultLinkText = selectedCandidate.textContent || selectedCandidate.innerText;
        debugLogData.resultLinkHref = selectedCandidate.href;
        debugLogData.resultLinkTarget = selectedCandidate.target;

        console.log('==================================================');
        console.log('RESULT LINK CLICK DEBUG');
        console.log('==================================================');
        console.log('Selected link:');
        console.log(`Text: ${selectedCandidate.textContent || selectedCandidate.innerText}`);
        console.log(`Href: ${selectedCandidate.href}`);
        console.log(`Target: ${selectedCandidate.target || '_self'}\n`);

        recordStep('RESULT_LINK_FOUND', `Selected result link: "${selectedCandidate.textContent || selectedCandidate.innerText}" (href: ${selectedCandidate.href}). Clicking link...`);

        // 4. CLICK RESULT LINK & HANDLE BOTH NEW-TAB AND SAME-TAB
        const originPage = selectedCandidate.page;
        const initialPageCount = context.pages().length;
        let openedPage: any = null;

        try {
          const newPagePromise = context.waitForEvent('page', { timeout: 12000 }).catch(() => null);

          // Click the selected result link
          try {
            await selectedCandidate.element.click({ timeout: 5000 });
          } catch (_) {
            // Fallback via locator
            const linkText = selectedCandidate.textContent || selectedCandidate.innerText;
            if (linkText) {
              await originPage.locator(`a:has-text("${linkText}")`).first().click({ timeout: 5000 });
            } else {
              throw _;
            }
          }

          const newTab = await newPagePromise;
          if (newTab) {
            openedPage = newTab;
            recordStep('RESULT_TAB_OPENED', `New marksheet tab opened: ${newTab.url()}`);
            await openedPage.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
            await openedPage.waitForTimeout(1000);
          } else {
            // Check if context has new pages
            await originPage.waitForTimeout(1200);
            const currentPages = context.pages();
            if (currentPages.length > initialPageCount) {
              openedPage = currentPages[currentPages.length - 1];
              recordStep('RESULT_TAB_OPENED', `New page detected in context: ${openedPage.url()}`);
              await openedPage.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
            } else {
              // Same tab navigation
              openedPage = originPage;
              recordStep('RESULT_TAB_OPENED', `Navigating in same tab: ${originPage.url()}`);
              await originPage.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
            }
          }
        } catch (clickErr: any) {
          const navErrMsg = `CCSU_RESULT_LINK_NAVIGATION_FAILED: Failed while clicking result link "${selectedCandidate.textContent || selectedCandidate.innerText}": ${clickErr.message}`;
          if (session) {
            session.status = 'CCSU_RESULT_LINK_NAVIGATION_FAILED';
            session.collectionState = 'CCSU_RESULT_LINK_NAVIGATION_FAILED';
            session.lastMessage = navErrMsg;
          }
          recordStep('CCSU_RESULT_LINK_NAVIGATION_FAILED', navErrMsg);
          const err = new Error(navErrMsg);
          (err as any).code = 'CCSU_RESULT_LINK_NAVIGATION_FAILED';
          (err as any).state = 'CCSU_RESULT_LINK_NAVIGATION_FAILED';
          throw err;
        }

        // 5. INSPECT PAGES AFTER CLICK & VERIFY MARKSHEET READY EVIDENCE
        const pagesAfterClick = context.pages();
        console.log('Pages after click:');
        const clickAuditList = [];

        for (let j = 0; j < pagesAfterClick.length; j++) {
          const p = pagesAfterClick[j];
          await p.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
          const pUrl = p.url();
          const pTitle = await p.title().catch(() => '');
          const pContent = await p.content().catch(() => '');

          const isCloudflare = isCloudflareResponse(pContent);
          const isMarksheet = isMarksheetDom(pContent);

          console.log(`${j + 1}. URL: ${pUrl}`);
          console.log(`   Title: ${pTitle}`);
          console.log(`   Marksheet detected: ${isMarksheet ? 'YES' : 'NO'}`);

          clickAuditList.push({
            index: j + 1,
            url: pUrl,
            title: pTitle,
            marksheetDetected: isMarksheet,
            cloudflareDetected: isCloudflare,
          });

          if (isCloudflare) {
            detectedCloudflarePage = p;
          } else if (isMarksheet) {
            // Verify semester matches if multiple pages exist
            if (targetSemNum !== null) {
              const combinedInfo = `${pUrl} ${pContent.substring(0, 3000)}`;
              const matchesTarget = textMatchesSemester(combinedInfo, targetSemNum);
              if (matchesTarget || !marksheetPage) {
                marksheetPage = p;
                rawHtml = pContent;
                debugLogData.newTabUrl = pUrl;
              }
            } else if (!marksheetPage) {
              marksheetPage = p;
              rawHtml = pContent;
              debugLogData.newTabUrl = pUrl;
            }
          }
        }
        console.log('');
        debugLogData.pagesAfterClick = clickAuditList;

        if (detectedCloudflarePage && !marksheetPage) {
          if (session) {
            session.status = 'CLOUDFLARE_CHALLENGE_ACTIVE';
            session.collectionState = 'CLOUDFLARE_CHALLENGE_ACTIVE';
            session.lastMessage = 'Cloudflare verification required. Please complete the "Verify you are human" check in the CCSU browser window.';
          }
          recordStep('CLOUDFLARE_CHALLENGE_ACTIVE', 'Cloudflare security challenge active after clicking result link.');
          const err = new Error(
            `CLOUDFLARE_CHALLENGE_ACTIVE: Cloudflare security challenge ("Just a moment...") is active in the marksheet window. Please complete the 'Verify you are human' check in the CCSU browser window.`
          );
          (err as any).code = 'CLOUDFLARE_CHALLENGE_ACTIVE';
          (err as any).state = 'CLOUDFLARE_CHALLENGE_ACTIVE';
          throw err;
        }

        if (!rawHtml || !marksheetPage) {
          const marksheetNotFoundMsg = `REAL_CCSU_MARKSHEET_NOT_FOUND: Result link was clicked, but genuine marksheet evidence ("STATEMENT OF MARKS" or "NEP EXAMINATION" with marks table) was not detected on any opened page. Current page title: "${await (openedPage || page).title().catch(() => '')}".`;
          if (session) {
            session.status = 'REAL_CCSU_MARKSHEET_NOT_FOUND';
            session.collectionState = 'REAL_CCSU_MARKSHEET_NOT_FOUND';
            session.lastMessage = marksheetNotFoundMsg;
          }
          recordStep('REAL_CCSU_MARKSHEET_NOT_FOUND', marksheetNotFoundMsg);
          const err = new Error(marksheetNotFoundMsg);
          (err as any).code = 'REAL_CCSU_MARKSHEET_NOT_FOUND';
          (err as any).state = 'REAL_CCSU_MARKSHEET_NOT_FOUND';
          (err as any).debug = debugLogData;
          throw err;
        }
      }
    }

    // Ensure rawHtml is never Cloudflare content
    if (rawHtml && isCloudflareResponse(rawHtml)) {
      rawHtml = '';
    }

    // STRICT MODE ENFORCEMENT: REAL CCSU MODE MUST NEVER RETURN MOCK DATA
    const isInteractive = session?.mode === 'interactive';
    if (!rawHtml) {
      if (isInteractive) {
        const notFoundMsg = `REAL_CCSU_MARKSHEET_NOT_FOUND: Could not capture marksheet DOM for student ${currentStudent.rollNumber} from CCSU portal.`;
        if (session) {
          session.status = 'REAL_CCSU_MARKSHEET_NOT_FOUND';
          session.collectionState = 'REAL_CCSU_MARKSHEET_NOT_FOUND';
          session.lastMessage = notFoundMsg;
        }
        recordStep('REAL_CCSU_MARKSHEET_NOT_FOUND', notFoundMsg);
        const err = new Error(notFoundMsg);
        (err as any).code = 'REAL_CCSU_MARKSHEET_NOT_FOUND';
        (err as any).state = 'REAL_CCSU_MARKSHEET_NOT_FOUND';
        throw err;
      } else {
        // Only in explicit mock mode:
        const lastDigit = parseInt(currentStudent.rollNumber.slice(-1)) || 0;
        const scenario = lastDigit === 3 ? 'BACK' : lastDigit === 9 ? 'FAIL' : 'PASS';
        rawHtml = CCSUMockGenerator.generateMockResultHtml(currentStudent, scenario);
      }
    }

    // State 4: MARKSHEET_READY
    if (session) {
      session.status = 'MARKSHEET_READY';
      session.collectionState = 'MARKSHEET_READY';
    }
    recordStep('MARKSHEET_READY', `Marksheet DOM detected. Starting extraction for ${currentStudent.rollNumber}...`);

    // State 5: EXTRACTING_MARKSHEET
    if (session) {
      session.status = 'EXTRACTING_MARKSHEET';
      session.collectionState = 'EXTRACTING_MARKSHEET';
    }
    recordStep('EXTRACTING_MARKSHEET', `Extracting student details, roll number, and subjects...`);

    // Parse structured result from live DOM
    let extracted: ExtractedResult;
    try {
      extracted = await adapter.extractResult(rawHtml, currentStudent);
      extracted.source = isInteractive ? 'CCSU_REAL' : 'MOCK';
    } catch (err: any) {
      const state = err.state || err.code || 'REAL_CCSU_EXTRACTION_FAILED';
      if (session) {
        session.status = state as any;
        session.collectionState = state as any;
        session.lastMessage = err.message;
      }
      recordStep(state as any, err.message);
      throw err;
    }

    // State 6: ROLL_VERIFIED
    if (session) {
      session.status = 'ROLL_VERIFIED';
      session.collectionState = 'ROLL_VERIFIED';
    }
    recordStep('ROLL_VERIFIED', `Roll number ${extracted.rollNumber} verified. Extracted ${extracted.subjects.length} subjects.`);

    // Run 10-point data validation
    const validation = await adapter.validateResult(extracted, currentStudent);
    if (!validation.isValid) {
      const errSummaries = validation.errors.map(e => `[${e.ruleId}] ${e.message}`).join('; ');
      recordStep('VALIDATION_FAILED', `Validation issues: ${errSummaries}`);
    } else {
      recordStep('VALIDATION_PASSED', `Validation passed. Status: ${validation.status}. Identity: VERIFIED.`);
    }

    const parserDebug: Record<string, any> = extracted.debugInfo || {};
    const debugJson = {
      source: extracted.source,
      collectionState: 'ROLL_VERIFIED',
      url: debugLogData.newTabUrl || debugLogData.searchPageUrl || CCSU_CONFIG.portalUrl,
      rollNumber: extracted.rollNumber,
      requestedRollNumber: currentStudent.rollNumber,
      candidateRollElements: parserDebug.candidateRollElements || debugLogData.candidateRollElements || [],
      selectedElement: parserDebug.selectedElement || 'UNKNOWN',
      selectedElementText: parserDebug.selectedElementText || '',
      extractedRollNumber: extracted.rollNumber,
      rollExtractionMethod: parserDebug.rollExtractionMethod || 'UNKNOWN',
      rollExtractionCandidates: parserDebug.rollExtractionCandidates || [],
      studentName: extracted.studentName,
      subjects: extracted.subjects,
      summary: {
        totalCredits: extracted.totalCredits,
        totalGradeValue: extracted.totalGradeValue,
        sgpa: extracted.sgpa,
        cgpa: extracted.cgpa,
        result: extracted.resultStatus,
        sourceResult: extracted.sourceResult,
      },
      audit: {
        searchPageUrl: debugLogData.searchPageUrl,
        resultLinkText: debugLogData.resultLinkText,
        resultLinkHref: debugLogData.resultLinkHref,
        newTabUrl: debugLogData.newTabUrl,
        detectedTableCount: debugLogData.detectedTableCount,
        extractedRowCount: debugLogData.extractedRowCount,
      },
    };

    extracted.debugInfo = debugJson;

    if (session) {
      session.status = 'ROLL_VERIFIED';
      session.collectionState = 'ROLL_VERIFIED';
      session.lastMessage = `Extracted marksheet for ${extracted.studentName} (${extracted.subjects.length} subjects, SGPA: ${extracted.sgpa ?? 'N/A'}). Please verify and confirm save.`;
      session.pendingVerificationResult = {
        extracted,
        validation,
        debugJson,
      };
    }

    return { extracted, validation, stepLogs, debugJson };
  }

  /**
   * Advances queue index after a result is confirmed or discarded
   */
  public advanceStudent(
    sessionId: string,
    historyEntry: { rollNumber: string; status: string; message: string }
  ): RunnerSessionStatus {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.history.push({
      ...historyEntry,
      timestamp: new Date().toLocaleTimeString(),
    });

    session.currentStudentIndex++;
    session.pendingVerificationResult = null;
    session.status = 'RUNNING';
    session.lastMessage = historyEntry.message;

    return session;
  }

  public skipStudent(sessionId: string, rollNumber: string): RunnerSessionStatus {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.history.push({
      rollNumber,
      status: 'SKIPPED',
      message: 'Skipped by operator.',
      timestamp: new Date().toLocaleTimeString(),
    });

    session.currentStudentIndex++;
    session.pendingVerificationResult = null;
    session.status = 'RUNNING';
    session.lastMessage = `Skipped roll number ${rollNumber}.`;
    return session;
  }

  public stopSession(sessionId: string): RunnerSessionStatus {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'STOPPED';
      session.lastMessage = 'Session stopped by operator.';
      session.pendingVerificationResult = null;
      this.cleanupBrowser(sessionId);
    }
    return session!;
  }

  /**
   * Helper to populate form fields (Roll Number & Marksheet Type)
   */
  public async fillSearchFormFields(page: any, student: StudentLookupInput): Promise<boolean> {
    let filledAny = false;
    try {
      console.log('[fillSearchFormFields] Attempting to fill form for student:', student.rollNumber, student.marksheetType);
      const rollSelectors = ['#roll', 'input[name="roll"]', ...CCSU_CONFIG.selectors.rollNumberInput];
      const selectSelectors = ['#buttonClicked', 'select[name="buttonClicked"]', ...CCSU_CONFIG.selectors.marksheetTypeSelect];
      const captchaSelectors = ['#CaptchaInputText', 'input[name="CaptchaInputText"]', ...CCSU_CONFIG.selectors.captchaInput];

      // 1. Fill Roll Number
      for (const selector of rollSelectors) {
        const el = await page.$(selector).catch(() => null);
        if (el) {
          console.log('[fillSearchFormFields] Found roll selector:', selector);
          await page.fill(selector, '').catch(() => {});
          await page.fill(selector, student.rollNumber).catch(() => {});
          filledAny = true;
          break;
        }
      }

      // 2. Select Marksheet Type
      for (const selector of selectSelectors) {
        const el = await page.$(selector).catch(() => null);
        if (el) {
          console.log('[fillSearchFormFields] Found marksheet type selector:', selector);
          try {
            const targetType = student.marksheetType || 'NEP';
            const strippedType = targetType.replace(/[^A-Za-z0-9]/g, '');
            // Try matching by exact value, stripped value (e.g. NONNEP vs NON-NEP), or by label
            const success = await page.selectOption(selector, { value: targetType }).catch(() => null);
            if (!success) {
              await page.selectOption(selector, { value: strippedType }).catch(async () => {
                await page.selectOption(selector, { label: targetType }).catch(async () => {
                  await page.selectOption(selector, { index: 1 }).catch(() => {});
                });
              });
            }
            filledAny = true;
          } catch (_) {}
          break;
        }
      }

      // 3. Focus CAPTCHA input for user convenience
      for (const selector of captchaSelectors) {
        const el = await page.$(selector).catch(() => null);
        if (el) {
          await el.focus().catch(() => {});
          break;
        }
      }
    } catch (e: any) {
      console.error('[fillSearchFormFields] Error:', e.message);
    }
    return filledAny;
  }

  /**
   * Launches or reuses a persistent, visible Chromium/Chrome browser window on Windows desktop.
   * Strictly verifies headless: false and keeps browser open across API requests.
   */
  public async launchOrAttachBrowser(
    sessionId: string,
    student?: StudentLookupInput | null,
    forceReopen: boolean = false
  ): Promise<BrowserSessionDiagnostics> {
    const session = this.activeSessions.get(sessionId);

    // 1. Check if browser instance is already alive for this session or any active session
    let browserInstance = this.activeBrowsers.get(sessionId);
    if (!browserInstance) {
      for (const [, inst] of this.activeBrowsers.entries()) {
        if (inst.browser?.isConnected() && inst.page && !inst.page.isClosed()) {
          browserInstance = inst;
          this.activeBrowsers.set(sessionId, inst);
          break;
        }
      }
    }

    if (
      !forceReopen &&
      browserInstance &&
      browserInstance.browser &&
      browserInstance.browser.isConnected() &&
      browserInstance.page &&
      !browserInstance.page.isClosed()
    ) {
      const { context } = browserInstance;

      // Close any stale marksheet pages belonging to previous students
      const allPages = context.pages();
      for (const p of allPages) {
        const pUrl = p.url();
        if (pUrl.includes('PrintMarksheet') || pUrl.includes('Marksheet')) {
          if (!student || !pUrl.includes(student.rollNumber)) {
            console.log('[launchOrAttachBrowser] Closing previous student marksheet tab:', pUrl);
            await p.close().catch(() => {});
          }
        }
      }

      // Find or open the search portal page
      let activePage = context.pages().find((p: any) => !p.isClosed() && (p.url().includes('SearchRoll') || p.url().includes('ccsuniversityweb')));
      if (!activePage || activePage.isClosed()) {
        activePage = context.pages().find((p: any) => !p.isClosed()) || (await context.newPage());
      }
      browserInstance.page = activePage;

      // Bring window to front
      await activePage.bringToFront().catch(() => {});

      // Verify URL
      const currentUrl = activePage.url();
      if (!currentUrl || currentUrl === 'about:blank' || currentUrl.includes('PrintMarksheet')) {
        try {
          await activePage.goto(CCSU_CONFIG.portalUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });
        } catch (_) {}
        await activePage.bringToFront().catch(() => {});
      }

      // If student provided, fill fields if visible
      if (student) {
        await this.fillSearchFormFields(activePage, student);
      }

      const diagnostics: BrowserSessionDiagnostics = {
        browserLaunched: true,
        headless: false,
        browserPid: browserInstance.diagnostics?.browserPid || null,
        contextActive: true,
        pageActive: !activePage.isClosed(),
        currentUrl: activePage.url(),
        pageTitle: await activePage.title().catch(() => ''),
        numberOfOpenPages: context.pages().length,
        browserType: browserInstance.diagnostics?.browserType || 'Google Chrome',
        windowVisible: true,
        launchError: null,
      };

      browserInstance.status = 'BROWSER_PAGE_READY';
      browserInstance.diagnostics = diagnostics;

      if (session) {
        session.browserSession = {
          status: 'BROWSER_PAGE_READY',
          diagnostics,
        };
        session.lastMessage = 'CCSU browser is open. Complete CAPTCHA/Cloudflare verification in that window.';
      }

      return diagnostics;
    }

    // 2. Launch a new visible browser instance
    if (session) {
      session.browserSession = {
        status: 'BROWSER_STARTING',
        diagnostics: {
          browserLaunched: false,
          headless: false,
          browserPid: null,
          contextActive: false,
          pageActive: false,
          currentUrl: '',
          pageTitle: '',
          numberOfOpenPages: 0,
          windowVisible: false,
          launchError: null,
        },
      };
      session.lastMessage = 'Opening CCSU browser...';
    }

    // Clean up any stale disconnected instance
    await this.cleanupBrowser(sessionId);

    const { chromium } = await import('playwright');
    let browser: any = null;
    let chosenBrowserType = 'Google Chrome';

    // Strictly visible desktop window configuration
    const launchArgs = [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-position=50,50',
      '--window-size=1280,900',
    ];

    const launchOptions = {
      headless: false, // MANDATORY: strictly visible window
      args: launchArgs,
      slowMo: 50,
    };

    try {
      // Priority 1: Launch with system Google Chrome
      try {
        browser = await chromium.launch({ ...launchOptions, channel: 'chrome' });
        chosenBrowserType = 'Google Chrome';
      } catch (chromeErr: any) {
        console.warn('System Google Chrome launch failed, trying Edge:', chromeErr.message);
        // Priority 2: Launch with Microsoft Edge
        try {
          browser = await chromium.launch({ ...launchOptions, channel: 'msedge' });
          chosenBrowserType = 'Microsoft Edge';
        } catch (edgeErr: any) {
          console.warn('System Edge launch failed, trying bundled Chromium:', edgeErr.message);
          // Priority 3: Fallback to bundled Playwright Chromium
          browser = await chromium.launch(launchOptions);
          chosenBrowserType = 'Playwright Chromium';
        }
      }

      if (!browser || !browser.isConnected()) {
        throw new Error('Chromium launch returned disconnected or null browser');
      }

      // Query browser PID via CDP session
      let browserPid: number | null = null;
      try {
        const cdp = await browser.newBrowserCDPSession();
        const info = await cdp.send('SystemInfo.getProcessInfo');
        const browserProc = info.processInfo?.find((p: any) => p.type === 'browser');
        if (browserProc?.id) {
          browserPid = browserProc.id;
        }
      } catch (_) {}

      // Create browser context without fixed viewport so window is fully maximized
      const context = await browser.newContext({ viewport: null });
      const page = await context.newPage();
      await page.bringToFront().catch(() => {});

      // Navigate to CCSU
      try {
        await page.goto(CCSU_CONFIG.portalUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 35000,
        });
      } catch (navErr: any) {
        console.warn('CCSU navigation warning:', navErr.message);
      }
      await page.bringToFront().catch(() => {});

      // Fill Roll Number & Marksheet Type if form fields are visible
      if (student) {
        await this.fillSearchFormFields(page, student);
      }

      const diagnostics: BrowserSessionDiagnostics = {
        browserLaunched: true,
        headless: false,
        browserPid,
        contextActive: true,
        pageActive: !page.isClosed(),
        currentUrl: page.url(),
        pageTitle: await page.title().catch(() => ''),
        numberOfOpenPages: context.pages().length,
        browserType: chosenBrowserType,
        windowVisible: true,
        launchError: null,
      };

      const persistentInstance: PersistentBrowserInstance = {
        browser,
        context,
        page,
        status: 'BROWSER_PAGE_READY',
        diagnostics,
        launchedAt: new Date(),
      };

      this.activeBrowsers.set(sessionId, persistentInstance);

      // Setup lifecycle event handlers
      browser.on('disconnected', () => {
        const inst = this.activeBrowsers.get(sessionId);
        if (inst) {
          inst.status = 'BROWSER_CLOSED';
          inst.diagnostics.browserLaunched = false;
          inst.diagnostics.contextActive = false;
          inst.diagnostics.pageActive = false;
          inst.diagnostics.windowVisible = false;
        }
        const s = this.activeSessions.get(sessionId);
        if (s) {
          s.browserSession = {
            status: 'BROWSER_CLOSED',
            diagnostics: {
              browserLaunched: false,
              headless: false,
              browserPid: null,
              contextActive: false,
              pageActive: false,
              currentUrl: '',
              pageTitle: '',
              numberOfOpenPages: 0,
              windowVisible: false,
              launchError: 'Browser window was closed.',
            },
            lastError: 'Browser window was closed.',
          };
        }
      });

      page.on('close', () => {
        const inst = this.activeBrowsers.get(sessionId);
        if (inst) {
          inst.diagnostics.pageActive = false;
          if (inst.context?.pages().length === 0) {
            inst.status = 'BROWSER_CLOSED';
          }
        }
      });

      if (session) {
        session.browserSession = {
          status: 'BROWSER_PAGE_READY',
          diagnostics,
        };
        session.lastMessage = 'CCSU browser is open. Complete CAPTCHA/Cloudflare verification in that window.';
      }

      return diagnostics;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Playwright launch error in launchOrAttachBrowser:', msg);

      const errorDiagnostics: BrowserSessionDiagnostics = {
        browserLaunched: false,
        headless: false,
        browserPid: null,
        contextActive: false,
        pageActive: false,
        currentUrl: '',
        pageTitle: '',
        numberOfOpenPages: 0,
        windowVisible: false,
        launchError: msg,
      };

      this.activeBrowsers.set(sessionId, {
        browser: null,
        context: null,
        page: null,
        status: 'BROWSER_ERROR',
        diagnostics: errorDiagnostics,
        lastError: msg,
      });

      if (session) {
        session.browserSession = {
          status: 'BROWSER_ERROR',
          diagnostics: errorDiagnostics,
          lastError: msg,
        };
        session.lastMessage = `CCSU browser window could not be opened. ${msg}`;
      }

      throw err;
    }
  }

  /**
   * Retrieves active, connected PersistentBrowserInstance
   */
  public getBrowserInstance(sessionId?: string): PersistentBrowserInstance | null {
    if (sessionId) {
      const inst = this.activeBrowsers.get(sessionId);
      if (inst && inst.browser?.isConnected() && inst.page && !inst.page.isClosed()) {
        return inst;
      }
    }
    for (const [key, candidate] of this.activeBrowsers.entries()) {
      if (candidate.browser?.isConnected() && candidate.page && !candidate.page.isClosed()) {
        if (sessionId && key !== sessionId) {
          this.activeBrowsers.set(sessionId, candidate);
        }
        return candidate;
      }
    }
    return null;
  }

  /**
   * Queries real-time browser session status and diagnostics
   */
  public async getBrowserDiagnostics(sessionId: string): Promise<BrowserSessionInfo> {
    let inst = this.getBrowserInstance(sessionId);
    const session = this.activeSessions.get(sessionId);

    // If not found for this sessionId, check if any persistent browser is stored
    if (!inst) {
      for (const [, candidate] of this.activeBrowsers.entries()) {
        if (candidate.browser?.isConnected() && candidate.page && !candidate.page.isClosed()) {
          inst = candidate;
          this.activeBrowsers.set(sessionId, inst);
          break;
        }
      }
    }

    if (!inst || !inst.browser || !inst.browser.isConnected()) {
      const fallback: BrowserSessionInfo = {
        status: inst?.status === 'BROWSER_STARTING' ? 'BROWSER_STARTING' : inst?.status === 'BROWSER_ERROR' ? 'BROWSER_ERROR' : 'BROWSER_NOT_STARTED',
        diagnostics: inst?.diagnostics || {
          browserLaunched: false,
          headless: false,
          browserPid: null,
          contextActive: false,
          pageActive: false,
          currentUrl: '',
          pageTitle: '',
          numberOfOpenPages: 0,
          windowVisible: false,
          launchError: inst?.lastError || null,
        },
        lastError: inst?.lastError || null,
      };
      if (session) {
        session.browserSession = fallback;
      }
      return fallback;
    }

    const pages = inst.context?.pages() || [];
    const activePage = inst.page && !inst.page.isClosed() ? inst.page : pages[pages.length - 1];
    const pageActive = Boolean(activePage && !activePage.isClosed());
    const currentUrl = pageActive ? activePage.url() : '';
    const pageTitle = pageActive ? await activePage.title().catch(() => '') : '';

    const diagnostics: BrowserSessionDiagnostics = {
      browserLaunched: true,
      headless: false,
      browserPid: inst.diagnostics?.browserPid || null,
      contextActive: true,
      pageActive,
      currentUrl,
      pageTitle,
      numberOfOpenPages: pages.length,
      browserType: inst.diagnostics?.browserType || 'Google Chrome',
      windowVisible: true,
      launchError: null,
    };

    const status: BrowserSessionLifecycleStatus = pageActive ? 'BROWSER_PAGE_READY' : 'BROWSER_READY';
    inst.status = status;
    inst.diagnostics = diagnostics;

    const info: BrowserSessionInfo = { status, diagnostics };
    if (session) {
      session.browserSession = info;
    }

    return info;
  }

  /**
   * Focuses or launches browser window
   */
  public async openOrFocusBrowser(sessionId: string): Promise<BrowserSessionDiagnostics> {
    const session = this.activeSessions.get(sessionId);
    const student = session?.currentStudent || (session ? this.sessionQueues.get(sessionId)?.[0] : null);
    return await this.launchOrAttachBrowser(sessionId, student, false);
  }

  private logStep(session: RunnerSessionStatus, step: CollectionStep, rollNumber: string, message: string) {
    const entry: StepLogEntry = {
      step,
      rollNumber,
      message,
      timestamp: new Date(),
    };
    session.recentLogs.unshift(entry);
    if (session.recentLogs.length > 50) {
      session.recentLogs.pop();
    }
  }

  public async cleanupBrowser(sessionId: string) {
    const instance = this.activeBrowsers.get(sessionId);
    if (instance?.browser) {
      try {
        await instance.browser.close();
      } catch (_) {}
    }
    this.activeBrowsers.delete(sessionId);
  }
}

export const browserRunnerService = new BrowserRunnerService();
globalForRunner.browserRunnerService = browserRunnerService;
