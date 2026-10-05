'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import {
  PlayCircle,
  SkipForward,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Check,
  XCircle,
  Code2,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  Globe,
  FileSpreadsheet,
  Download,
  ExternalLink,
  RotateCw
} from 'lucide-react';

export default function CollectionPage() {
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [runnerStatus, setRunnerStatus] = useState<any>(null);

  const [availableCohorts, setAvailableCohorts] = useState<any[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState<number>(0);

  // Setup Form State - Defaulting to REAL CCSU mode
  const [universityCode, setUniversityCode] = useState('CCSU');
  const [course, setCourse] = useState('ALL');
  const [semester, setSemester] = useState('ALL');
  const [marksheetType, setMarksheetType] = useState('NEP');
  const [academicYear, setAcademicYear] = useState('2023-2024');
  const [runnerMode, setRunnerMode] = useState<'interactive' | 'mock'>('interactive');
  const [singleRollNumber, setSingleRollNumber] = useState('250302002002');

  // Pre-Save Verification Modal State
  const [pendingVerification, setPendingVerification] = useState<any>(null);
  const [showDebugJson, setShowDebugJson] = useState(false);
  const [pastedHtml, setPastedHtml] = useState('');
  const [showPastedHtml, setShowPastedHtml] = useState(false);
  const [actionError, setActionError] = useState<{ title: string; message: string; code?: string; state?: string } | null>(null);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [lastSavedInfo, setLastSavedInfo] = useState<{ fileName: string; filePath: string } | null>(null);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [fetchingCaptchaImage, setFetchingCaptchaImage] = useState(false);

  // Fetch live CAPTCHA image element screenshot from browser
  const fetchCaptchaImage = async () => {
    setFetchingCaptchaImage(true);
    try {
      const res = await fetch('/api/collection/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GET_CAPTCHA_IMAGE',
        }),
      });
      const json = await res.json();
      if (json.success && json.imageBase64) {
        setCaptchaImage(json.imageBase64);
      }
    } catch (_) {}
    finally {
      setFetchingCaptchaImage(false);
    }
  };

  // Load existing session on mount
  const fetchSession = async () => {
    try {
      const res = await fetch('/api/collection/session');
      const json = await res.json();
      if (json.success) {
        if (json.session) setActiveSession(json.session);
        if (json.runnerStatus) {
          setRunnerStatus(json.runnerStatus);
          if (json.runnerStatus.pendingVerificationResult && !pendingVerification) {
            setPendingVerification(json.runnerStatus.pendingVerificationResult);
          }
        }
        if (json.availableCohorts) setAvailableCohorts(json.availableCohorts);
        if (json.totalStudentsCount !== undefined) setTotalStudentsCount(json.totalStudentsCount);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchCaptchaImage();
    const interval = setInterval(fetchSession, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (runnerStatus?.status === 'WAITING_FOR_CAPTCHA') {
      const timer = setTimeout(fetchCaptchaImage, 1200);
      return () => clearTimeout(timer);
    }
  }, [runnerStatus?.status, runnerStatus?.currentStudent?.rollNumber]);

  // Browser Control Action Handler
  const handleBrowserAction = async (action: 'OPEN' | 'RETRY' | 'FOCUS' | 'CLOSE') => {
    if (!activeSession) return;
    setBrowserLoading(true);
    try {
      const res = await fetch('/api/collection/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession.id, action }),
      });
      const json = await res.json();
      if (json.success) {
        fetchSession();
      } else {
        alert(json.error || 'Failed to control browser window');
      }
    } catch (e: any) {
      alert(e.message || 'Browser control network error');
    } finally {
      setBrowserLoading(false);
    }
  };

  // Start Collection Session
  const handleStartCollection = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/collection/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universityCode,
          course,
          semester,
          marksheetType,
          academicYear,
          mode: runnerMode,
          rollNumber: singleRollNumber ? singleRollNumber.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActiveSession(json.session);
        setRunnerStatus(json.runnerStatus);
        setPendingVerification(null);
        setCaptchaInput('');
        setTimeout(fetchCaptchaImage, 1200);
      } else {
        alert(json.error || 'Failed to start session');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit CAPTCHA & trigger extraction
  const handleAction = async (action: 'SUBMIT_CAPTCHA' | 'SKIP' | 'STOP', htmlOverride?: string) => {
    if (!activeSession) return;
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/collection/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          action,
          rawHtmlOverride: htmlOverride || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionError(null);
        if (action === 'SUBMIT_CAPTCHA') {
          // Display verification panel before saving
          setPendingVerification({
            extracted: json.extracted,
            validation: json.validation,
            debugJson: json.debugJson,
          });
        }
        if (json.runnerStatus) setRunnerStatus(json.runnerStatus);
        fetchSession();
      } else {
        setTimeout(fetchCaptchaImage, 1000);
        const isCloudflare =
          json.state === 'CLOUDFLARE_CHALLENGE_ACTIVE' ||
          json.code === 'CLOUDFLARE_CHALLENGE_ACTIVE' ||
          (json.error && json.error.includes('CLOUDFLARE'));
        setActionError({
          title: isCloudflare
            ? 'Cloudflare verification required'
            : json.state === 'ROLL_MISMATCH'
            ? 'Roll Number Mismatch'
            : json.state === 'REAL_CCSU_ROLL_NUMBER_NOT_FOUND'
            ? 'Roll Number Not Found in Marksheet'
            : json.state === 'CCSU_RESULT_LINK_NOT_FOUND'
            ? 'CCSU Result Link Not Found'
            : json.state === 'CCSU_RESULT_LINK_NAVIGATION_FAILED'
            ? 'Result Link Navigation Failed'
            : json.state === 'REAL_CCSU_MARKSHEET_NOT_FOUND'
            ? 'CCSU Marksheet Content Not Detected'
            : 'Marksheet Extraction Failed',
          message: isCloudflare
            ? 'Please complete the "Verify you are human" check in the CCSU browser window.'
            : json.error || 'Action failed',
          code: json.code,
          state: json.state,
        });
      }
    } catch (e: any) {
      setActionError({
        title: 'Connection Error',
        message: e.message || 'Failed to connect to collection server',
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit CAPTCHA from UI input, search in browser, and extract marksheet
  const handleEnterCaptchaAndExtract = async () => {
    if (!activeSession) return;
    setLoading(true);
    setActionError(null);
    try {
      if (captchaInput.trim()) {
        const browserRes = await fetch('/api/collection/browser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeSession.id,
            action: 'ENTER_CAPTCHA_AND_SEARCH',
            captchaText: captchaInput.trim(),
          }),
        });
        const browserJson = await browserRes.json();
        if (!browserJson.success) {
          throw new Error(browserJson.error || 'Failed to submit CAPTCHA in browser');
        }
        await new Promise(r => setTimeout(r, 1500));
      }
      await handleAction('SUBMIT_CAPTCHA', pastedHtml || undefined);
      setCaptchaInput('');
    } catch (e: any) {
      setTimeout(fetchCaptchaImage, 1000);
      setActionError({
        title: 'CAPTCHA Submit Error',
        message: e.message || 'Failed to submit CAPTCHA',
      });
    } finally {
      setLoading(false);
    }
  };

  // Confirm & Save verified result to database
  const handleConfirmSave = async () => {
    if (!activeSession || !pendingVerification) return;
    setLoading(true);
    try {
      const res = await fetch('/api/collection/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          action: 'CONFIRM_SAVE',
          overrideResult: pendingVerification.extracted,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPendingVerification(null);
        if (json.savedExcelName) {
          setLastSavedInfo({ fileName: json.savedExcelName, filePath: json.savedExcelPath });
        }
        if (json.runnerStatus) setRunnerStatus(json.runnerStatus);
        fetchSession();
      } else {
        alert(json.error || 'Failed to confirm and save result');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Discard extracted result without saving
  const handleDiscard = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      const res = await fetch('/api/collection/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          action: 'DISCARD',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPendingVerification(null);
        if (json.runnerStatus) setRunnerStatus(json.runnerStatus);
        fetchSession();
      } else {
        alert(json.error || 'Failed to discard result');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const browserSession = runnerStatus?.browserSession;
  const browserStatus: string = browserSession?.status || 'BROWSER_NOT_STARTED';
  const browserDiagnostics = browserSession?.diagnostics;
  const isBrowserPageReady = browserStatus === 'BROWSER_PAGE_READY' && Boolean(browserDiagnostics?.pageActive);
  const isBrowserStarting = browserStatus === 'BROWSER_STARTING';
  const isBrowserFailed =
    browserStatus === 'BROWSER_ERROR' ||
    Boolean(browserDiagnostics?.launchError) ||
    actionError?.code === 'BROWSER_NOT_READY' ||
    actionError?.code === 'BROWSER_ERROR' ||
    actionError?.code === 'BROWSER_CLOSED';

  const isCloudflareActive =
    (runnerStatus?.status === 'CLOUDFLARE_CHALLENGE_ACTIVE' ||
    runnerStatus?.collectionState === 'CLOUDFLARE_CHALLENGE_ACTIVE' ||
    actionError?.code === 'CLOUDFLARE_CHALLENGE_ACTIVE' ||
    actionError?.state === 'CLOUDFLARE_CHALLENGE_ACTIVE') &&
    !isBrowserFailed;

  const isWaitingCaptcha =
    runnerStatus?.status === 'WAITING_FOR_CAPTCHA' ||
    runnerStatus?.status === 'CAPTCHA_SUBMITTED' ||
    runnerStatus?.status === 'CLOUDFLARE_CHALLENGE_ACTIVE' ||
    runnerStatus?.status === 'MARKSHEET_READY' ||
    runnerStatus?.status === 'EXTRACTING_MARKSHEET' ||
    isCloudflareActive ||
    isBrowserFailed;
  const total = activeSession?.totalStudents || 0;
  const completed = activeSession?.completedCount || 0;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isRealMode = runnerMode === 'interactive' || runnerStatus?.mode === 'interactive';

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Result Collection & Verification Console"
        subtitle="Live Chaudhary Charan Singh University (CCSU) automation with manual CAPTCHA entry & pre-save validation."
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
        {/* SDCMT College Sheet Auto-Save Notification */}
        {lastSavedInfo && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                  SDCMT College Format Spreadsheet Auto-Updated & Saved!
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-bold">
                    Disk Synced
                  </span>
                </h4>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-mono mt-0.5">
                  {lastSavedInfo.fileName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={`/api/exports/college-format?course=${activeSession?.course || 'BCA'}&semester=${activeSession?.semester || 'I'}`}
                download
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Download College Excel
              </a>
              <a
                href="/results"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Tabulation Table
              </a>
              <button
                onClick={() => setLastSavedInfo(null)}
                className="p-1 rounded-lg text-emerald-600 hover:text-emerald-800 dark:text-emerald-400"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Compliance Notice Banner */}
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950 dark:text-indigo-200">
            <span className="font-bold">CCSU Automation & CAPTCHA Protocol:</span>
            <p className="mt-0.5 text-indigo-800 dark:text-indigo-300">
              The application navigates to CCSU, enters Roll Number, and selects Marksheet Type. The browser pauses for you to manually solve the CAPTCHA and submit search. The system then captures the new-tab marksheet, parses the live DOM, and presents a verification panel before saving.
            </p>
          </div>
        </div>

        {/* MODE SELECTION CARDS: [ MOCK ] vs [ REAL CCSU ] */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setRunnerMode('interactive')}
            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
              runnerMode === 'interactive'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    REAL CCSU Mode
                    {runnerMode === 'interactive' && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-600 text-white">
                        ACTIVE
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500">Live official CCSU website + manual CAPTCHA + actual marksheet parser</p>
                </div>
              </div>
              <input
                type="radio"
                checked={runnerMode === 'interactive'}
                onChange={() => setRunnerMode('interactive')}
                className="w-4 h-4 text-emerald-600"
              />
            </div>
            <div className="mt-3 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
              ✓ Never returns mock data • Extracts actual 8 subjects from new-tab marksheet • Saves genuine university marks
            </div>
          </div>

          <div
            onClick={() => setRunnerMode('mock')}
            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
              runnerMode === 'mock'
                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-md ring-2 ring-amber-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    MOCK Mode
                    {runnerMode === 'mock' && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-600 text-white">
                        TEST SIMULATOR
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500">Offline test simulator for unit testing without internet connection</p>
                </div>
              </div>
              <input
                type="radio"
                checked={runnerMode === 'mock'}
                onChange={() => setRunnerMode('mock')}
                className="w-4 h-4 text-amber-600"
              />
            </div>
            <div className="mt-3 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
              ⚠ Uses simulated data • Strictly labelled as MOCK • Do not use for real marksheet analysis
            </div>
          </div>
        </div>

        {/* Configuration Setup Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Session Target & Test Parameters
              </h3>
              <p className="text-[11px] text-slate-500">
                Current Collection Mode: <strong className={isRealMode ? 'text-emerald-600' : 'text-amber-600'}>{isRealMode ? 'REAL CCSU' : 'MOCK'}</strong>
              </p>
            </div>

            {/* Quick Cohort Selectors */}
            {availableCohorts.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px]">Quick Select:</span>
                <button
                  type="button"
                  onClick={() => { setCourse('ALL'); setSemester('ALL'); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    course === 'ALL' && semester === 'ALL'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  All Students ({totalStudentsCount})
                </button>
                {availableCohorts.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setCourse(c.course); setSemester(c.semester); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      course === c.course && semester === c.semester
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {c.course} {c.semester} ({c.count})
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">University</label>
              <select
                value={universityCode}
                onChange={e => setUniversityCode(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold text-indigo-600"
              >
                <option value="CCSU">CCSU Meerut</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Course</label>
              <select
                value={course}
                onChange={e => setCourse(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              >
                <option value="ALL">All Courses</option>
                <option value="B.C.A.">B.C.A.</option>
                <option value="B.Sc.">B.Sc.</option>
                <option value="B.Com">B.Com</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Semester</label>
              <select
                value={semester}
                onChange={e => setSemester(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium"
              >
                <option value="ALL">All Semesters</option>
                <option value="I">Semester I (1st Sem)</option>
                <option value="II">Semester II (2nd Sem)</option>
                <option value="III">Semester III (3rd Sem)</option>
                <option value="IV">Semester IV (4th Sem)</option>
                <option value="V">Semester V (5th Sem)</option>
                <option value="VI">Semester VI (6th Sem)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Marksheet Type</label>
              <select
                value={marksheetType}
                onChange={e => setMarksheetType(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold text-emerald-600 dark:text-emerald-400"
              >
                <option value="NEP">NEP (National Education Policy)</option>
                <option value="NON-NEP">Non-NEP Semester</option>
                <option value="BACK">Back Paper</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1" title="Test 1 student roll number before whole batch">
                Target Student Roll No
              </label>
              <input
                type="text"
                placeholder="e.g. 250302002002"
                value={singleRollNumber}
                onChange={e => setSingleRollNumber(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleStartCollection}
                disabled={loading}
                className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <PlayCircle className="w-4 h-4" />
                {activeSession ? 'Initialize / Restart' : 'Start Collection'}
              </button>
            </div>
          </div>
        </div>

        {/* PRE-SAVE REAL DATA VERIFICATION PANEL */}
        {pendingVerification && pendingVerification.extracted && (
          <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCheck className="w-4 h-4" />
                  SOURCE: {pendingVerification.extracted.source || 'CCSU REAL'}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  STATUS: VERIFIED
                </span>
              </div>

              <div className="text-xs text-slate-500">
                Please review extracted marksheet details below before confirming save to database.
              </div>
            </div>

            {/* Student & Summary Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Roll Number</span>
                <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                  {pendingVerification.extracted.rollNumber}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[10px]">Student Name</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {pendingVerification.extracted.studentName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Subjects Discovered</span>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                  {pendingVerification.extracted.subjects.length} Subjects
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">SGPA / CGPA</span>
                <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                  {pendingVerification.extracted.sgpa ?? '—'} / {pendingVerification.extracted.cgpa ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Result Classification</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                    pendingVerification.extracted.resultStatus === 'PASSED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {pendingVerification.extracted.resultStatus}
                </span>
              </div>
            </div>

            {/* Extracted Subjects Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                Extracted Marksheet Subjects Table ({pendingVerification.extracted.subjects.length} rows)
              </h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Course Title</th>
                      <th className="py-2.5 px-3 text-center">Ext + Int</th>
                      <th className="py-2.5 px-3 text-center">Total</th>
                      <th className="py-2.5 px-3 text-center">Credit</th>
                      <th className="py-2.5 px-3 text-center">Grade</th>
                      <th className="py-2.5 px-3 text-center">Grade Value</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {pendingVerification.extracted.subjects.map((sub: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                          {sub.subjectCode}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                          {sub.subjectName}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">
                          {sub.externalMarks !== null && sub.internalMarks !== null
                            ? `${sub.externalMarks}+${sub.internalMarks}`
                            : sub.practicalMarks !== null
                            ? `${sub.practicalMarks} (Prac)`
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white">
                          {sub.totalMarks}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300">
                          {sub.credit ?? '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          <span
                            className={
                              sub.grade === 'F'
                                ? 'text-rose-600 font-bold'
                                : 'text-emerald-600'
                            }
                          >
                            {sub.grade || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300">
                          {sub.gradeValue ?? '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'PASS'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Debug JSON Accordion */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDebugJson(!showDebugJson)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-500" />
                  <span>Parser Debug Information (JSON Audit)</span>
                </div>
                {showDebugJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showDebugJson && (
                <div className="p-4 bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-64">
                  <pre>{JSON.stringify(pendingVerification.debugJson || pendingVerification.extracted, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS: [ Confirm & Save ] and [ Discard ] */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleDiscard}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950/60 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Discard
              </button>

              <button
                onClick={handleConfirmSave}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all hover:scale-105"
              >
                <Check className="w-4 h-4" />
                Confirm & Save to Results
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE RUNNER BANNER & CAPTCHA PROMPT */}
        {runnerStatus && (
          <div className="space-y-4">
            {/* Live Progress Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Live Collection Session
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeSession?.name || 'Active Session'}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {completed} / {total} Students Collected
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {progressPercent}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              {/* ACTIVE STUDENT CAPTCHA CALLOUT */}
              {isWaitingCaptcha && runnerStatus.currentStudent && (
                <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 space-y-4 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isBrowserPageReady ? 'bg-emerald-500' : isBrowserStarting ? 'bg-blue-500 animate-ping' : isBrowserFailed ? 'bg-rose-500' : 'bg-amber-500 animate-ping'}`}></div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                        {isBrowserFailed
                          ? 'Browser Window Required'
                          : isBrowserStarting
                          ? 'Opening CCSU browser...'
                          : 'Action Required: Enter CAPTCHA on CCSU Window'}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-amber-200 dark:bg-amber-900 px-2.5 py-1 rounded-md">
                        Current Roll No: {runnerStatus.currentStudent.rollNumber}
                      </span>
                    </div>
                  </div>

                  {/* 1. BROWSER FAILURE SAFETY ALERT */}
                  {isBrowserFailed && (
                    <div className="p-4 rounded-xl bg-rose-100/90 dark:bg-rose-950/80 border-2 border-rose-500 text-rose-950 dark:text-rose-100 text-xs space-y-3 animate-in fade-in">
                      <div className="flex items-center gap-2 font-bold text-sm text-rose-900 dark:text-rose-200">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                        <span>CCSU browser window could not be opened.</span>
                      </div>
                      <p className="text-xs text-rose-800 dark:text-rose-300">
                        {browserSession?.lastError || browserDiagnostics?.launchError || actionError?.message || 'The desktop Chrome window is not currently open or active.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleBrowserAction('OPEN')}
                          disabled={browserLoading}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow flex items-center gap-1.5 transition-all"
                        >
                          <Globe className="w-4 h-4" />
                          {browserLoading ? 'Opening CCSU browser...' : 'Open CCSU Browser'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBrowserAction('RETRY')}
                          disabled={browserLoading}
                          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-50 dark:hover:bg-slate-700 transition-all"
                        >
                          Retry Browser Session
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. BROWSER STARTING ALERT */}
                  {isBrowserStarting && !isBrowserFailed && (
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/50 border-2 border-blue-400 text-blue-900 dark:text-blue-100 text-xs space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-2 font-bold text-sm text-blue-900 dark:text-blue-200">
                        <div className="w-3 h-3 rounded-full bg-blue-500 animate-ping"></div>
                        <span>Opening CCSU browser...</span>
                      </div>
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        Launching a visible Google Chrome window on your desktop and connecting to the official CCSU portal.
                      </p>
                    </div>
                  )}

                  {/* 3. BROWSER READY NOTIFICATION */}
                  {isBrowserPageReady && !isCloudflareActive && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 text-emerald-900 dark:text-emerald-100 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold">
                          CCSU browser is open. Complete CAPTCHA/Cloudflare verification in that window.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBrowserAction('FOCUS')}
                        disabled={browserLoading}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shrink-0 shadow-sm"
                      >
                        Bring CCSU Window to Front
                      </button>
                    </div>
                  )}

                  {/* 4. CLOUDFLARE VERIFICATION NOTICE */}
                  {isCloudflareActive && !isBrowserFailed && (
                    <div className="p-4 rounded-xl bg-amber-100/90 dark:bg-amber-950/80 border-2 border-amber-500 text-amber-950 dark:text-amber-100 text-xs space-y-2.5 animate-in fade-in">
                      <div className="flex items-center gap-2 font-bold text-sm text-amber-900 dark:text-amber-200">
                        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                        <span>Cloudflare verification required</span>
                      </div>
                      <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                        Please complete the &apos;Verify you are human&apos; check in the CCSU browser window.
                      </p>
                      {isBrowserPageReady ? (
                        <div className="p-3 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-amber-300 dark:border-amber-800/60 text-[11px] text-slate-800 dark:text-slate-200 space-y-2 font-medium">
                          <p className="font-bold text-slate-900 dark:text-white">Next Steps:</p>
                          <ol className="list-decimal list-inside space-y-1 ml-1">
                            <li>Switch to the opened <strong>CCSU Chrome browser window</strong> on your desktop.</li>
                            <li>Click the <strong>&quot;Verify you are human&quot;</strong> Cloudflare checkbox.</li>
                            <li>Wait until the <strong>&quot;STATEMENT OF MARKS&quot;</strong> table appears in the window.</li>
                            <li>Click <strong>&quot;Check Again / Extract &amp; Verify Marksheet&quot;</strong> below.</li>
                          </ol>
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => handleBrowserAction('FOCUS')}
                              disabled={browserLoading}
                              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold shadow-xs"
                            >
                              Focus CCSU Window
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-300 text-[11px] text-rose-800 dark:text-rose-200 space-y-2">
                          <p className="font-bold">CCSU browser window could not be opened.</p>
                          <button
                            type="button"
                            onClick={() => handleBrowserAction('OPEN')}
                            disabled={browserLoading}
                            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold"
                          >
                            Open CCSU Browser
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 5. CONTEXTUAL ACTION ERROR ALERT (non-Cloudflare, non-browser) */}
                  {actionError && !isCloudflareActive && !isBrowserFailed && (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 text-xs space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{actionError.title}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-200">
                        {actionError.message}
                      </p>
                      {actionError.state === 'CCSU_RESULT_LINK_NOT_FOUND' && (
                        <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-200 bg-rose-100/80 dark:bg-rose-900/40 p-2 rounded-lg mt-1">
                          💡 Tip: A fresh CAPTCHA code has been reloaded below. Type the letters into the <strong>Code</strong> box and click <strong>Submit CAPTCHA & Extract</strong>.
                        </p>
                      )}
                    </div>
                  )}

                  {/* 6. TEMPORARY BROWSER DIAGNOSTICS CARD */}
                  <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono space-y-2 border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isBrowserPageReady ? 'bg-emerald-500' : isBrowserStarting ? 'bg-blue-500 animate-ping' : 'bg-rose-500'}`}></div>
                        <span>Desktop Browser Diagnostics</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300">
                          {browserStatus}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleBrowserAction('FOCUS')}
                          disabled={browserLoading || !browserDiagnostics?.browserLaunched}
                          className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-sans font-semibold disabled:opacity-30"
                        >
                          Bring to Front
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBrowserAction('RETRY')}
                          disabled={browserLoading}
                          className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-sans font-semibold"
                        >
                          {browserLoading ? 'Working...' : 'Re-open'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Browser launched</span>
                        <span className={browserDiagnostics?.browserLaunched ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {browserDiagnostics?.browserLaunched ? 'true' : 'false'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Headless</span>
                        <span className="text-emerald-400 font-bold">false</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Browser PID</span>
                        <span className="text-slate-200 font-bold">
                          {browserDiagnostics?.browserPid ? browserDiagnostics.browserPid : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Context / Page Active</span>
                        <span className={browserDiagnostics?.pageActive ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                          {browserDiagnostics?.contextActive ? 'Context: true' : 'Context: false'} • {browserDiagnostics?.pageActive ? 'Page: true' : 'Page: false'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px]">Current URL</span>
                        <span className="text-slate-300 truncate block font-sans text-[10px]" title={browserDiagnostics?.currentUrl || ''}>
                          {browserDiagnostics?.currentUrl || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Page Title</span>
                        <span className="text-slate-300 truncate block font-sans text-[10px]" title={browserDiagnostics?.pageTitle || ''}>
                          {browserDiagnostics?.pageTitle || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Number of open pages</span>
                        <span className="text-indigo-400 font-bold">
                          {browserDiagnostics?.numberOfOpenPages ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">
                        Student: <span className="underline">{runnerStatus.currentStudent.name}</span> ({runnerStatus.currentStudent.course}, Sem {runnerStatus.currentStudent.semester})
                      </p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300">
                        Roll number and Marksheet Type (NEP) are prefilled in the CCSU window. Type the CAPTCHA code shown in the browser window below, or solve it in Chrome, and click Extract.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                      {/* Live CAPTCHA Image from Browser */}
                      {captchaImage ? (
                        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border-2 border-amber-400 shadow-xs">
                          <img
                            src={captchaImage}
                            alt="CCSU CAPTCHA"
                            className="h-7 w-auto object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={fetchCaptchaImage}
                            disabled={fetchingCaptchaImage}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Reload CAPTCHA image"
                          >
                            <RotateCw className={`w-3.5 h-3.5 ${fetchingCaptchaImage ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={fetchCaptchaImage}
                          disabled={fetchingCaptchaImage}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${fetchingCaptchaImage ? 'animate-spin' : ''}`} />
                          Load CAPTCHA
                        </button>
                      )}

                      {/* Inline CAPTCHA Input */}
                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 shadow-xs">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Code:</span>
                        <input
                          type="text"
                          placeholder="Type letters"
                          value={captchaInput}
                          onChange={e => setCaptchaInput(e.target.value.toUpperCase())}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleEnterCaptchaAndExtract();
                          }}
                          className="w-24 px-2 py-1 text-xs font-mono font-extrabold uppercase tracking-wider rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <button
                        onClick={handleEnterCaptchaAndExtract}
                        disabled={loading}
                        className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all hover:scale-105"
                      >
                        <Check className="w-4 h-4" />
                        {loading
                          ? 'Extracting Marksheet...'
                          : captchaInput.trim()
                          ? 'Submit CAPTCHA & Extract'
                          : isCloudflareActive
                          ? 'Check Again / Extract & Verify'
                          : 'Extract & Verify Marksheet'}
                      </button>

                      <button
                        onClick={() => handleAction('SKIP')}
                        disabled={loading}
                        className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Skip this student"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleAction('STOP')}
                        disabled={loading}
                        className="px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-xs font-medium"
                        title="Stop Session"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Manual HTML Paste Option (Guaranteed Backup) */}
                  <div className="border-t border-amber-200 dark:border-amber-800/60 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowPastedHtml(!showPastedHtml)}
                      className="text-[11px] text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      {showPastedHtml ? 'Hide Direct Marksheet HTML Input' : 'Optional: Paste Marksheet HTML (if already opened in another browser)'}
                    </button>
                    {showPastedHtml && (
                      <div className="mt-2 space-y-2">
                        <textarea
                          rows={4}
                          placeholder="Paste live marksheet HTML (e.g. from View Page Source) here..."
                          value={pastedHtml}
                          onChange={e => setPastedHtml(e.target.value)}
                          className="w-full p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-200"
                        />
                        {pastedHtml && (
                          <button
                            type="button"
                            onClick={() => handleAction('SUBMIT_CAPTCHA', pastedHtml)}
                            disabled={loading}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm"
                          >
                            Extract from Pasted HTML
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Completed Banner */}
              {runnerStatus.status === 'COMPLETED' && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>All students in the batch queue have been collected and verified!</span>
                  </div>
                  <a
                    href="/results"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
                  >
                    View Results Matrix
                  </a>
                </div>
              )}
            </div>

            {/* LIVE QUEUE & AUDIT TIMELINE TABLE */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Execution Trail & Status Log
                </h4>
                <span className="text-[11px] text-slate-500">
                  Real-time updates
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                      <th className="py-2.5 px-4">Time</th>
                      <th className="py-2.5 px-4">Roll Number</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Result Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {runnerStatus.history?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 font-sans">
                          Queue waiting for start...
                        </td>
                      </tr>
                    ) : (
                      runnerStatus.history.slice().reverse().map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 text-slate-400 text-[11px]">{item.timestamp}</td>
                          <td className="py-2.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">{item.rollNumber}</td>
                          <td className="py-2.5 px-4 font-sans">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                  : item.status === 'VALIDATION_WARNING'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-sans text-slate-700 dark:text-slate-300">{item.message}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
