export type ExamType = 'REGULAR' | 'BACK' | 'SPECIAL' | 'IMPROVEMENT';
export type SubjectStatus = 'PASS' | 'FAIL' | 'BACK' | 'ABSENT';
export type ResultStatus = 'PASSED' | 'PROMOTED' | 'BACK' | 'FAILED' | 'DETAINED';
export type ValidationStatus = 'VALID' | 'WARNING' | 'FAILED_TO_PARSE';
export type ValidationSeverity = 'INFO' | 'WARNING' | 'ERROR';

export interface StudentLookupInput {
  rollNumber: string;
  enrollmentNumber?: string | null;
  name?: string | null;
  course?: string;
  semester?: string;
  marksheetType: string;
  academicYear?: string;
}

export interface ExtractedSubject {
  subjectCode: string;
  subjectName: string;
  internalMarks?: number | null;
  externalMarks?: number | null;
  practicalMarks?: number | null;
  totalMarks: number;
  maxMarks: number;
  minMarks?: number | null;
  credit?: number | null;
  grade?: string | null;
  gradePoint?: number | null;
  gradeValue?: number | null;
  status: SubjectStatus;
  isPractical?: boolean;
}

export type CollectionState =
  | 'WAITING_FOR_CAPTCHA'
  | 'CAPTCHA_SUBMITTED'
  | 'CLOUDFLARE_CHALLENGE_ACTIVE'
  | 'CCSU_RESULT_LINK_NOT_FOUND'
  | 'CCSU_RESULT_LINK_NAVIGATION_FAILED'
  | 'REAL_CCSU_MARKSHEET_NOT_FOUND'
  | 'MARKSHEET_READY'
  | 'EXTRACTING_MARKSHEET'
  | 'ROLL_VERIFIED'
  | 'ROLL_MISMATCH'
  | 'REAL_CCSU_ROLL_NUMBER_NOT_FOUND'
  | 'REAL_CCSU_EXTRACTION_FAILED';

export type BrowserSessionLifecycleStatus =
  | 'BROWSER_NOT_STARTED'
  | 'BROWSER_STARTING'
  | 'BROWSER_READY'
  | 'BROWSER_PAGE_READY'
  | 'BROWSER_CLOSED'
  | 'BROWSER_ERROR';

export interface BrowserSessionDiagnostics {
  browserLaunched: boolean;
  headless: boolean;
  browserPid: number | null;
  contextActive: boolean;
  pageActive: boolean;
  currentUrl: string;
  pageTitle: string;
  numberOfOpenPages: number;
  browserType?: string;
  executablePath?: string;
  windowVisible: boolean;
  launchError?: string | null;
}

export interface BrowserSessionInfo {
  status: BrowserSessionLifecycleStatus;
  diagnostics: BrowserSessionDiagnostics;
  lastError?: string | null;
}

export interface ExtractedResult {
  university: string;
  source?: 'CCSU_REAL' | 'MOCK';
  verificationStatus?: 'VERIFIED' | 'ROLL_MISMATCH' | 'RESULT_NOT_FOUND';
  collectionState?: CollectionState;
  studentName: string;
  rollNumber: string;
  actualRollNumber?: string;
  enrollmentNumber?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  college?: string | null;
  course: string;
  semester: string;
  academicYear: string;
  examSession?: string | null;
  examType: ExamType;
  resultStatus: ResultStatus;
  sourceResult?: string;
  sourceSGPA?: number | null;
  sourceCGPA?: number | null;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  totalCredits?: number | null;
  totalGradeValue?: number | null;
  sgpa?: number | null;
  cgpa?: number | null;
  backSubjects: string[];
  subjects: ExtractedSubject[];
  rawHash?: string;
  rawMetadata?: Record<string, any>;
  debugInfo?: Record<string, any>;
}

export interface ValidationErrorItem {
  ruleId: string;
  fieldName?: string;
  message: string;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  isValid: boolean;
  status: ValidationStatus;
  errors: ValidationErrorItem[];
  warnings: ValidationErrorItem[];
}

export interface MarksheetTypeOption {
  id: string;
  label: string;
  value: string;
  description?: string;
}

export type CollectionStep =
  | CollectionState
  | 'SEARCH_STARTED'
  | 'CAPTCHA_REQUIRED'
  | 'SEARCH_SUBMITTED'
  | 'RESULT_LINK_FOUND'
  | 'RESULT_TAB_OPENED'
  | 'MARKSHEET_PARSED'
  | 'VALIDATION_COMPLETED'
  | 'VALIDATION_PASSED'
  | 'VALIDATION_FAILED'
  | 'CLOUDFLARE_DETECTED'
  | 'RESULT_SAVED'
  | 'PARSE_FAILED';

export interface AutomationStepEvent {
  step: CollectionStep;
  rollNumber: string;
  message: string;
  requiresCaptcha: boolean;
  data?: any;
}

/**
 * Checks if HTML is a Cloudflare security challenge page.
 * Strictly checks for indicators:
 * "Just a moment...", "Verify you are human", "Cloudflare",
 * "Performing security verification", "Checking your browser"
 */
export function isCloudflareResponse(html: string): boolean {
  if (!html || typeof html !== 'string') return false;
  return (
    html.includes('Just a moment...') ||
    html.includes('Verify you are human') ||
    html.includes('Cloudflare') ||
    html.includes('Performing security verification') ||
    html.includes('Checking your browser') ||
    html.includes('security service to protect against malicious bots') ||
    html.includes('cf-mitigated') ||
    html.includes('cf-turnstile') ||
    html.includes('cf-challenge') ||
    /challenges\.cloudflare\.com/i.test(html) ||
    /turnstile/i.test(html)
  );
}

/**
 * Checks if HTML is a genuine CCSU marksheet DOM.
 * Only starts parsing when actual marksheet is available.
 * Requires evidence such as "STATEMENT OF MARKS" and/or "NEP EXAMINATION"
 * and an actual marksheet table.
 */
export function isMarksheetDom(html: string): boolean {
  if (!html || typeof html !== 'string') return false;
  if (isCloudflareResponse(html)) return false;

  // STRICT RULE: Do NOT treat "Search Results - Result" search page as MARKSHEET_READY
  if (
    html.includes('Search Results - Result') ||
    html.includes('Enter Roll Number:') ||
    html.includes('Select MarkSheet Type:') ||
    html.includes('name="buttonClicked"')
  ) {
    return false;
  }

  const hasEvidence =
    html.includes('STATEMENT OF MARKS') ||
    html.includes('NEP EXAMINATION') ||
    (html.includes('Marksheet') && (html.includes('Roll No') || html.includes('Class/Course') || html.includes('Candidate')));

  const hasMarksheetTable =
    /<table[\s\S]*?(?:COURSE\s+TITLE|CODE\s+NO|TOTAL|CREDIT|GRADE|GRD|S\.G\.P\.A\.)[\s\S]*?<\/table>/i.test(html) ||
    (html.includes('<table') && (html.includes('COURSE TITLE') || html.includes('CODE NO.') || html.includes('mark-tablePG')));

  return Boolean(hasEvidence && hasMarksheetTable);
}

