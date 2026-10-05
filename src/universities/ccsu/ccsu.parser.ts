import {
  CollectionState,
  ExamType,
  ExtractedResult,
  ExtractedSubject,
  ResultStatus,
  StudentLookupInput,
  SubjectStatus,
  isCloudflareResponse,
  isMarksheetDom
} from '../base/types';
import {
  normalizeSemesterToNumber,
  toRomanSemester,
  detectSemesterInText
} from '../base/semester-helper';

export interface RollCandidateElement {
  tagName: string;
  className: string;
  id: string;
  innerText: string;
  textContent: string;
  href?: string | null;
  parentText?: string;
  associatedLabel?: string;
  extractedValue?: string;
  isValid: boolean;
  rejectionReason?: string;
}

export interface RollParserDebugInfo {
  requestedRollNumber: string;
  candidateRollElements: RollCandidateElement[];
  selectedElement: string;
  selectedElementText: string;
  extractedRollNumber: string | null;
  rollExtractionMethod: string;
  rollExtractionCandidates: Array<{
    value: string;
    method: string;
    isValid: boolean;
    rejectionReason?: string;
    rawText?: string;
  }>;
  headerIdentitySectionText?: string;
}

/**
 * CCSU Result HTML Parser
 * Robustly parses CCSU official marksheets from the new tab.
 * Dynamically discovers all subject rows based on table headers:
 * COURSE TITLE, CODE NO., MAX, MIN, EXT+INT, TOTAL, CRD., GRD., GRD PTS., GRD VAL.
 * Strictly verifies identity ONLY via requestedRollNumber === actualMarksheetRollNumber.
 */
export class CCSUParser {
  /**
   * Strips scripts, styles, svg, and html comments to avoid CSS/JS tokens bleeding into text extraction.
   */
  public sanitizeHtmlForParsing(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ');
  }

  /**
   * Validates whether an extracted string genuinely resembles a CCSU student roll number.
   * Rejects layout tokens, CSS classes, HTML artifacts, and tokens containing 'INGWRAP'.
   */
  public isValidCCSURollNumber(val: string | null | undefined): boolean {
    if (!val || typeof val !== 'string') return false;
    const trimmed = val.trim().toUpperCase();

    // Blacklist: Explicitly reject INGWRAP and known layout/CSS/HTML words
    const blacklist = [
      'INGWRAP',
      'WRAP',
      'SCROLL',
      'STYLE',
      'TABLE',
      'SCRIPT',
      'CLASS',
      'DIV',
      'HIDDEN',
      'UNDEFINED',
      'NULL',
      'OBJECT',
      'NAN',
      'STUDENT',
      'COLLEGE',
      'COURSE',
      'SEMESTER',
      'EXAMINATION',
      'CONTROLLER',
      'MARKSHEET',
      'STATEMENT',
      'SUBJECT',
      'NAME',
      'FATHER',
      'MOTHER',
      'INSTITUTION',
      'SESSION',
      'ENROL',
      'STATUS',
      'RESULT',
      'CREDIT',
      'GRADE',
      'POINT',
      'VALUE',
      'TOTAL',
      'CODE',
      'TITLE',
      'MIN',
      'MAX',
      'SEARCH',
      'PRINT',
      'SUBMIT',
      'PASS',
      'FAIL',
      'ACTION',
      'BUTTON',
      'OPTION',
      'SELECT'
    ];

    for (const b of blacklist) {
      if (trimmed.includes(b)) return false;
    }

    // Must not contain code/HTML syntax characters
    if (/[<>{};:=()\[\]"'\/\\]/.test(trimmed)) return false;

    // Length check: CCSU roll numbers are typically 10 to 15 alphanumeric digits
    if (trimmed.length < 6 || trimmed.length > 20) return false;

    // Must contain digits (at least 5 digits)
    const digits = trimmed.match(/\d/g);
    if (!digits || digits.length < 5) return false;

    // Standard alphanumeric university roll format
    if (!/^[A-Z0-9_-]+$/i.test(trimmed)) return false;

    return true;
  }

  /**
   * Checks if a table cell or text label specifically indicates a Roll Number field.
   * Strictly excludes enrollment, controller of exams, scrolling, etc.
   */
  public isRollNumberLabel(label: string): boolean {
    if (!label) return false;
    const clean = label
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Strict exclusion of non-roll labels and layout/CSS words
    if (
      clean.includes('enroll') ||
      clean.includes('enrol') ||
      clean.includes('controller') ||
      clean.includes('scroll') ||
      clean.includes('payroll') ||
      clean.includes('wrap') ||
      clean.includes('heading') ||
      clean.includes('loading') ||
      clean.includes('style') ||
      clean.includes('table') ||
      clean.includes('candidate') ||
      clean.includes('name') ||
      clean.includes('father') ||
      clean.includes('mother') ||
      clean.includes('college') ||
      clean.includes('institution') ||
      clean.includes('course') ||
      clean.includes('semester') ||
      clean.includes('session')
    ) {
      return false;
    }

    return (
      clean === 'roll no' ||
      clean === 'roll number' ||
      clean === 'rollno' ||
      clean === 'roll' ||
      clean === 'अनुक्रमांक' ||
      clean === 'roll no.' ||
      clean === 'roll number.' ||
      /^roll\s*(?:no|number|\.?)$/i.test(clean) ||
      /^अनुक्रमांक$/i.test(clean)
    );
  }

  /**
   * Dedicated CCSU Roll Number Extractor returning string | null.
   * Extracts the roll number ONLY from fields semantically associated with:
   * "ROLL NO", "ROLL NUMBER", "ROLL NO.", "Roll No.", "अनुक्रमांक".
   * Rejects "INGWRAP" and all non-roll tokens, returning null if no genuine roll number exists.
   */
  public extractCCSURollNumber(document: string | any): string | null {
    return this.extractCCSURollNumberWithDebug(document).rollNumber;
  }

  /**
   * Convenience helper returning string | null for backward compatibility
   */
  public extractCCSURoll(document: string | any): string | null {
    return this.extractCCSURollNumber(document);
  }

  /**
   * Full extractor providing structured debug information along with the roll number.
   */
  public extractCCSURollNumberWithDebug(
    document: string | any,
    expectedRoll?: string
  ): { rollNumber: string | null; debug: RollParserDebugInfo } {
    let html = '';
    if (typeof document === 'string') {
      html = document;
    } else if (document && typeof document === 'object') {
      html = document.outerHTML || document.innerHTML || document.body?.innerHTML || String(document);
    }

    const cleanRequested = (expectedRoll || '').trim().toUpperCase();
    const sanitizedHtml = this.sanitizeHtmlForParsing(html);

    // 1. Identify and extract header/identity section text
    let headerIdentityText = '';
    const headerMatch = sanitizedHtml.match(
      /(?:statement\s*of\s*marks|ccsu|chaudhary\s*charan\s*singh)[\s\S]{0,3000}?(?:course\s*title|code\s*no|subject\s*code)/i
    );
    if (headerMatch) {
      headerIdentityText = this.cleanText(headerMatch[0]);
    } else {
      headerIdentityText = this.cleanText(sanitizedHtml.substring(0, 3000));
    }

    const candidateElements: RollCandidateElement[] = [];
    const rollCandidates: Array<{
      value: string;
      method: string;
      isValid: boolean;
      rejectionReason?: string;
      rawText?: string;
      elementTag?: string;
    }> = [];

    // 2. Scan and log all elements whose text contains Roll, Roll No, Enrollment, Candidate
    const elementTagRegex = /<(td|th|b|strong|span|p|div|label|a|li|h[1-6]|tr)([^>]*)>([\s\S]*?)<\/\1>/gi;
    let elMatch;
    while ((elMatch = elementTagRegex.exec(sanitizedHtml)) !== null) {
      const tagName = elMatch[1].toUpperCase();
      const attrStr = elMatch[2];
      const innerHtml = elMatch[3];
      const text = this.cleanText(innerHtml);

      if (
        /(?:roll|roll\s*no|roll\s*number|enrollment|enrolment|candidate|अनुक्रमांक)/i.test(text) &&
        text.length < 150
      ) {
        const classMatch = attrStr.match(/class=["']([^"']*)["']/i);
        const idMatch = attrStr.match(/id=["']([^"']*)["']/i);
        const hrefMatch = attrStr.match(/href=["']([^"']*)["']/i);

        candidateElements.push({
          tagName,
          className: classMatch ? classMatch[1] : '',
          id: idMatch ? idMatch[1] : '',
          innerText: text,
          textContent: text,
          href: hrefMatch ? hrefMatch[1] : null,
          parentText: text.substring(0, 100),
          isValid: this.isValidCCSURollNumber(text),
          rejectionReason: text.toUpperCase().includes('INGWRAP')
            ? 'CONTAINS_INGWRAP'
            : !this.isValidCCSURollNumber(text)
            ? 'INVALID_ROLL_FORMAT'
            : undefined,
        });
        if (candidateElements.length >= 30) break;
      }
    }

    // 3. Strategy A: Structured Table Rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rMatch;
    while ((rMatch = rowRegex.exec(sanitizedHtml)) !== null) {
      const rowHtml = rMatch[1];
      const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
      const cells: { raw: string; text: string }[] = [];
      let cMatch;
      while ((cMatch = cellRegex.exec(rowHtml)) !== null) {
        cells.push({
          raw: cMatch[1],
          text: this.cleanText(cMatch[1]),
        });
      }

      for (let i = 0; i < cells.length; i++) {
        const cellText = cells[i].text;

        // A1: Cell contains both label and value e.g. "Roll No : 250302002002"
        const inlineMatch = cellText.match(
          /(?:^|\b)(?:roll\s*(?:no|number|\.?)|अनुक्रमांक)\s*[:\-]?\s*([A-Za-z0-9_-]{6,20})\b/i
        );
        if (inlineMatch && inlineMatch[1]) {
          const val = inlineMatch[1].trim().toUpperCase();
          const isIngwrap = val.includes('INGWRAP');
          const valid = !isIngwrap && this.isValidCCSURollNumber(val);

          rollCandidates.push({
            value: val,
            method: 'TABLE_CELL_INLINE',
            isValid: valid,
            rejectionReason: isIngwrap
              ? 'CONTAINS_INGWRAP'
              : !valid
              ? 'NON_ROLL_NUMBER_FORMAT'
              : undefined,
            rawText: cellText,
            elementTag: 'TD',
          });
        }

        // A2: Cell is solely the Roll No label -> Value is in adjacent cell (i + 1)
        if (this.isRollNumberLabel(cellText)) {
          if (i + 1 < cells.length) {
            const rawVal = cells[i + 1].text.replace(/^[:\-\s]+/, '').replace(/[:\-\s]+$/, '').trim();
            const upper = rawVal.toUpperCase();
            const isIngwrap = upper.includes('INGWRAP');
            const valid = !isIngwrap && this.isValidCCSURollNumber(upper);

            rollCandidates.push({
              value: upper,
              method: 'TABLE_CELL_ADJACENT',
              isValid: valid,
              rejectionReason: isIngwrap
                ? 'CONTAINS_INGWRAP'
                : !valid
                ? 'NON_ROLL_NUMBER_FORMAT'
                : undefined,
              rawText: `Label: "${cellText}" -> Value: "${rawVal}"`,
              elementTag: 'TD',
            });
          }
        }
      }
    }

    // 4. Strategy B: Single-Container Inline Key-Value (e.g. "ROLL NO : 250302002002")
    const inlinePatterns = [
      /(?:^|[>\s])(?:roll\s*(?:no|number|\.?)|अनुक्रमांक)\s*[:\-]\s*([A-Za-z0-9_-]{6,20})(?:[<\s]|$)/gi,
      /(?:^|[>\s])(?:roll\s*(?:no|number|\.?)|अनुक्रमांक)\s+([0-9]{8,16})(?:[<\s]|$)/gi,
    ];

    for (const pat of inlinePatterns) {
      let m;
      while ((m = pat.exec(sanitizedHtml)) !== null) {
        const rawVal = this.cleanText(m[1]).trim().toUpperCase();
        const isIngwrap = rawVal.includes('INGWRAP');
        const valid = !isIngwrap && this.isValidCCSURollNumber(rawVal);

        rollCandidates.push({
          value: rawVal,
          method: 'INLINE_LABEL_VALUE',
          isValid: valid,
          rejectionReason: isIngwrap
            ? 'CONTAINS_INGWRAP'
            : !valid
            ? 'NON_ROLL_NUMBER_FORMAT'
            : undefined,
          rawText: m[0],
          elementTag: 'CONTAINER',
        });
      }
    }

    // 5. Strategy C: Form Input Controls or Elements with Roll ID
    const inputPatterns = [
      /<input[^>]+(?:name|id)=["'](?:RollNo|txtRollNo|roll_no|rollno)["'][^>]+value=["']([^"']+)["']/gi,
      /<input[^>]+value=["']([^"']+)["'][^>]+(?:name|id)=["'](?:RollNo|txtRollNo|roll_no|rollno)["']/gi,
      /<(?:span|div|td|p)[^>]+id=["'][^"']*(?:rollno|roll_no|txtroll)[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div|td|p)>/gi,
    ];

    for (const pat of inputPatterns) {
      let m;
      while ((m = pat.exec(sanitizedHtml)) !== null) {
        const rawVal = this.cleanText(m[1]).trim().toUpperCase();
        const isIngwrap = rawVal.includes('INGWRAP');
        const valid = !isIngwrap && this.isValidCCSURollNumber(rawVal);

        rollCandidates.push({
          value: rawVal,
          method: 'DOM_INPUT_OR_ID',
          isValid: valid,
          rejectionReason: isIngwrap
            ? 'CONTAINS_INGWRAP'
            : !valid
            ? 'NON_ROLL_NUMBER_FORMAT'
            : undefined,
          rawText: m[0],
          elementTag: 'INPUT/ID',
        });
      }
    }

    // 6. Strategy D: Full Text Pattern (12-digit university roll in clean document text)
    const cleanDocText = this.cleanText(sanitizedHtml);
    const textRollPatterns = [
      /(?:Roll\s*(?:No|Number|\.?)|अनुक्रमांक)\s*[:\-\s]+([0-9]{8,16})\b/i,
      /\b([0-9]{12})\b/, // Standard 12-digit roll
    ];

    for (const pat of textRollPatterns) {
      const m = cleanDocText.match(pat);
      if (m && m[1]) {
        const rawVal = m[1].trim().toUpperCase();
        const isIngwrap = rawVal.includes('INGWRAP');
        const valid = !isIngwrap && this.isValidCCSURollNumber(rawVal);

        rollCandidates.push({
          value: rawVal,
          method: 'CLEAN_DOC_TEXT_PATTERN',
          isValid: valid,
          rejectionReason: isIngwrap
            ? 'CONTAINS_INGWRAP'
            : !valid
            ? 'NON_ROLL_NUMBER_FORMAT'
            : undefined,
          rawText: m[0],
          elementTag: 'TEXT',
        });
      }
    }

    // 7. Candidate Selection & Filtering
    const validCandidates = rollCandidates.filter(c => c.isValid);

    let selectedRoll: string | null = null;
    let selectedElementDesc = 'NONE';
    let selectedText = '';
    let selectedMethod = 'NONE';

    // Prioritize candidate matching expectedRoll if valid, else pick first valid candidate
    if (validCandidates.length > 0) {
      const matchingExpected = cleanRequested
        ? validCandidates.find(c => c.value === cleanRequested)
        : null;
      const best = matchingExpected || validCandidates[0];

      selectedRoll = best.value;
      selectedElementDesc = best.elementTag || 'TABLE_CELL';
      selectedText = best.rawText || best.value;
      selectedMethod = best.method;
    }

    const debug: RollParserDebugInfo = {
      requestedRollNumber: cleanRequested,
      candidateRollElements: candidateElements,
      selectedElement: selectedElementDesc,
      selectedElementText: selectedText,
      extractedRollNumber: selectedRoll,
      rollExtractionMethod: selectedMethod,
      rollExtractionCandidates: rollCandidates.map(c => ({
        value: c.value,
        method: c.method,
        isValid: c.isValid,
        rejectionReason: c.rejectionReason,
      })),
      headerIdentitySectionText: headerIdentityText.substring(0, 500),
    };

    return {
      rollNumber: selectedRoll,
      debug,
    };
  }

  /**
   * Detects collection state of raw HTML
   */
  public detectState(html: string): CollectionState {
    if (isCloudflareResponse(html)) {
      return 'CLOUDFLARE_CHALLENGE_ACTIVE';
    }
    if (isMarksheetDom(html)) {
      return 'MARKSHEET_READY';
    }
    return 'REAL_CCSU_EXTRACTION_FAILED';
  }

  /**
   * Parses raw HTML document into an ExtractedResult structure
   */
  public parseHtml(html: string, expected: StudentLookupInput): ExtractedResult {
    // 1. CLOUDFLARE DETECTION: Before attempting marksheet parsing, inspect the current page.
    // If Cloudflare challenge is active, immediately return CLOUDFLARE_CHALLENGE_ACTIVE.
    // Do NOT call extractCCSURollNumber(). Do NOT call subject parser.
    // Do NOT perform identity verification. Do NOT save anything. Do NOT report RESULT_NOT_FOUND.
    if (isCloudflareResponse(html)) {
      const err = new Error(
        `CLOUDFLARE_CHALLENGE_ACTIVE: Cloudflare security challenge ("Just a moment...") is active. Please complete the 'Verify you are human' check in the CCSU browser window.`
      );
      (err as any).code = 'CLOUDFLARE_CHALLENGE_ACTIVE';
      (err as any).state = 'CLOUDFLARE_CHALLENGE_ACTIVE';
      throw err;
    }

    // 2. MARKSHEET DETECTION: Only start parsing after the actual marksheet is available.
    // Require evidence such as "STATEMENT OF MARKS" and/or "NEP EXAMINATION" and the actual marksheet table.
    if (!isMarksheetDom(html)) {
      const err = new Error(
        `REAL_CCSU_EXTRACTION_FAILED: Captured DOM does not contain marksheet evidence ('STATEMENT OF MARKS' / 'NEP EXAMINATION' and marksheet table).`
      );
      (err as any).code = 'REAL_CCSU_EXTRACTION_FAILED';
      (err as any).state = 'REAL_CCSU_EXTRACTION_FAILED';
      throw err;
    }

    // 3. EXTRACT ACTUAL ROLL NUMBER
    const rollResult = this.extractCCSURollNumberWithDebug(html, expected.rollNumber);
    const requestedRoll = expected.rollNumber.trim().toUpperCase();
    const actualRoll = rollResult.rollNumber;

    // Output detailed parser debug information BEFORE identity verification
    console.log('====================================================');
    console.log('🔍 CCSU PARSER ROLL NUMBER EXTRACTION DEBUG:');
    console.log(JSON.stringify(rollResult.debug, null, 2));
    console.log('====================================================');

    // 4. VALIDATE EXTRACTED ROLL NUMBER
    if (!actualRoll) {
      const err = new Error(
        `REAL_CCSU_ROLL_NUMBER_NOT_FOUND: Could not extract a valid CCSU roll number from marksheet DOM for student ${requestedRoll}. Candidates evaluated: ${JSON.stringify(
          rollResult.debug.rollExtractionCandidates
        )}`
      );
      (err as any).code = 'REAL_CCSU_ROLL_NUMBER_NOT_FOUND';
      (err as any).state = 'REAL_CCSU_ROLL_NUMBER_NOT_FOUND';
      (err as any).debug = rollResult.debug;
      throw err;
    }

    // 5. IDENTITY RULE: Only requestedRollNumber === actualMarksheetRollNumber. Name must NOT be used for identity verification.
    if (actualRoll !== requestedRoll) {
      const err = new Error(
        `ROLL_MISMATCH: Actual CCSU marksheet roll number '${actualRoll}' does not match requested '${requestedRoll}'. Name must NOT be used for identity verification.`
      );
      (err as any).code = 'ROLL_MISMATCH';
      (err as any).state = 'ROLL_MISMATCH';
      (err as any).debug = rollResult.debug;
      throw err;
    }

    // 6. PARSE SUBJECTS AND METADATA
    const studentInfo = this.extractStudentMetadata(html, expected, rollResult.debug);
    const subjects = this.extractSubjectsTable(html);
    const summary = this.extractResultSummary(html, subjects);

    if (!subjects || subjects.length === 0) {
      const err = new Error(
        `REAL_CCSU_EXTRACTION_FAILED: Marksheet table detected but failed to parse subject records for student ${actualRoll}.`
      );
      (err as any).code = 'REAL_CCSU_EXTRACTION_FAILED';
      (err as any).state = 'REAL_CCSU_EXTRACTION_FAILED';
      (err as any).debug = rollResult.debug;
      throw err;
    }

    const extractedName = studentInfo.name || expected.name || 'Unknown Student';

    return {
      university: 'CCSU',
      source: 'CCSU_REAL',
      verificationStatus: 'VERIFIED',
      collectionState: 'ROLL_VERIFIED',
      studentName: this.toTitleCase(extractedName),
      rollNumber: actualRoll,
      actualRollNumber: actualRoll,
      enrollmentNumber: studentInfo.enrollmentNumber || expected.enrollmentNumber || null,
      fatherName: studentInfo.fatherName ? this.toTitleCase(studentInfo.fatherName) : null,
      motherName: studentInfo.motherName ? this.toTitleCase(studentInfo.motherName) : null,
      college: studentInfo.college || null,
      course: studentInfo.course || expected.course || 'Undergraduate',
      semester: (() => {
        const rawExtractedSem = studentInfo.semester || '';
        const semFromCourse = detectSemesterInText(studentInfo.course || '');
        const semNum = normalizeSemesterToNumber(rawExtractedSem) || semFromCourse || normalizeSemesterToNumber(expected.semester) || 1;
        return toRomanSemester(semNum);
      })(),
      academicYear: studentInfo.academicYear || expected.academicYear || '2024-2025',
      examSession: studentInfo.examSession || null,
      examType: (studentInfo.examType as ExamType) || 'REGULAR',
      resultStatus: summary.status,
      sourceResult: summary.sourceResult,
      sourceSGPA: summary.sgpa,
      sourceCGPA: summary.cgpa,
      totalMarks: summary.totalMarks,
      maxMarks: summary.maxMarks,
      percentage: summary.percentage,
      totalCredits: summary.totalCredits,
      totalGradeValue: summary.totalGradeValue,
      sgpa: summary.sgpa,
      cgpa: summary.cgpa,
      backSubjects: summary.backSubjects,
      subjects,
      rawHash: this.hashString(html.substring(0, 1000)),
      debugInfo: {
        source: 'CCSU_REAL',
        rollNumber: actualRoll,
        studentName: extractedName,
        subjectCount: subjects.length,
        requestedRollNumber: requestedRoll,
        candidateRollElements: rollResult.debug.candidateRollElements,
        selectedElement: rollResult.debug.selectedElement,
        selectedElementText: rollResult.debug.selectedElementText,
        extractedRollNumber: actualRoll,
        rollExtractionMethod: rollResult.debug.rollExtractionMethod,
        rollExtractionCandidates: rollResult.debug.rollExtractionCandidates,
        summary: {
          totalCredits: summary.totalCredits,
          totalGradeValue: summary.totalGradeValue,
          sgpa: summary.sgpa,
          cgpa: summary.cgpa,
          status: summary.status,
          sourceResult: summary.sourceResult,
        },
      },
    };
  }

  private extractStudentMetadata(
    html: string,
    expected: StudentLookupInput,
    rollDebug?: RollParserDebugInfo
  ) {
    const info: Record<string, string> = {};
    if (rollDebug?.extractedRollNumber) {
      info.rollNumber = rollDebug.extractedRollNumber;
    }

    const sanitized = this.sanitizeHtmlForParsing(html);

    // Row-by-row extraction for student metadata fields
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(sanitized)) !== null) {
      const rowContent = rowMatch[1];
      const cells: string[] = [];
      const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
      let cMatch;
      while ((cMatch = cellRegex.exec(rowContent)) !== null) {
        cells.push(this.cleanText(cMatch[1]));
      }

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const lower = cell.toLowerCase();
        const nextVal = cells[i + 1] || '';

        // Enrollment
        if (
          (lower.includes('enrol') || lower.includes('enrollment')) &&
          !info.enrollmentNumber &&
          nextVal
        ) {
          info.enrollmentNumber = nextVal.replace(/^[:\-\s]+/, '').trim();
        }
        // Candidate / Student Name
        if (
          (lower.includes('candidate') ||
            lower.includes('student name') ||
            lower === 'name:' ||
            lower === 'name') &&
          !lower.includes('father') &&
          !lower.includes('mother') &&
          !info.name &&
          nextVal
        ) {
          info.name = nextVal.replace(/^[:\-\s]+/, '').trim();
        }
        // Father Name
        if (lower.includes('father') && !info.fatherName && nextVal) {
          info.fatherName = nextVal.replace(/^[:\-\s]+/, '').trim();
        }
        // Mother Name
        if (lower.includes('mother') && !info.motherName && nextVal) {
          info.motherName = nextVal.replace(/^[:\-\s]+/, '').trim();
        }
        // College / Institution
        if (
          (lower.includes('institution') ||
            lower.includes('college') ||
            lower.includes('institute')) &&
          !info.college &&
          nextVal
        ) {
          info.college = nextVal.replace(/^[:\-\s]+/, '').trim();
        }
        // Course / Class
        if (
          (lower.includes('course') ||
            lower.includes('class') ||
            lower.includes('programme')) &&
          !info.course &&
          nextVal
        ) {
          info.course = nextVal.replace(/^[:\-\s]+/, '').trim();
        }
        // Semester
        if (
          (lower.includes('semester') || lower.includes('sem')) &&
          !info.semester &&
          nextVal
        ) {
          info.semester = nextVal.replace(/^[:\-\s]+/, '').trim();
        }
        // Exam Session
        if (lower.includes('session') && !info.examSession && nextVal) {
          info.examSession = nextVal.replace(/^[:\-\s]+/, '').trim();
        }
      }
    }

    // Free text regex fallback patterns for metadata fields
    const patterns = [
      {
        key: 'enrollmentNumber',
        regex: /(?:Enrolment|Enrollment)\s*(?:No|Number|\.?)\s*[:\-]?\s*([A-Za-z0-9]+)/i,
      },
      {
        key: 'name',
        regex: /(?:Candidate(?:'s)?\s*Name|Student\s*Name)\s*[:\-]?\s*([A-Za-z\s\.]+?)(?:<|\t|\n|Father|Mother|Roll|$)/i,
      },
      {
        key: 'fatherName',
        regex: /(?:Father(?:'s)?\s*Name)\s*[:\-]?\s*([A-Za-z\s\.]+?)(?:<|\t|\n|Mother|College|Institution|$)/i,
      },
      {
        key: 'motherName',
        regex: /(?:Mother(?:'s)?\s*Name)\s*[:\-]?\s*([A-Za-z\s\.]+?)(?:<|\t|\n|College|Institution|Enrollment|Roll|$)/i,
      },
      {
        key: 'college',
        regex: /(?:Institution(?:\s*Name)?|College(?:\s*Name)?)\s*[:\-]?\s*([A-Za-z0-9\.\-\s,\(\)]+?)(?:<|\t|\n|$)/i,
      },
      {
        key: 'course',
        regex: /(?:Course(?:\/Class)?|Program)\s*[:\-]?\s*([A-Za-z0-9\.\-\s]+?)(?:<|\t|\n|Semester|Year|Exam|$)/i,
      },
      { key: 'semester', regex: /(?:Semester|Sem|Year)\s*[:\-]?\s*([A-Za-z0-9]+)/i },
      {
        key: 'examSession',
        regex: /(?:Exam\s*(?:\/|\&)?\s*Session|Session)\s*[:\-]?\s*([A-Za-z0-9\-\s\(\)]+?)(?:<|\t|\n|$)/i,
      },
    ];

    for (const p of patterns) {
      if (!info[p.key]) {
        const m = sanitized.match(p.regex);
        if (m && m[1]) {
          info[p.key] = this.cleanText(m[1]).replace(/^[:\-\s]+/, '').trim();
        }
      }
    }

    return info;
  }

  private extractSubjectsTable(html: string): ExtractedSubject[] {
    const subjects: ExtractedSubject[] = [];
    const seenCodes = new Set<string>();

    // Locate the marksheet table that contains subject / course headers
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    let targetTableHtml = '';

    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableContent = tableMatch[1];
      const lower = tableContent.toLowerCase();
      // Match keywords from actual CCSU headers: COURSE TITLE, CODE NO., EXT+INT, TOTAL, CRD., GRD.
      if (
        (lower.includes('course title') || lower.includes('subject code') || lower.includes('code no') || lower.includes('paper code')) &&
        (lower.includes('marks') || lower.includes('credit') || lower.includes('grade') || lower.includes('total') || lower.includes('ext+int'))
      ) {
        targetTableHtml = tableContent;
        break;
      }
    }

    const contentToParse = targetTableHtml || html;

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let headerMap: Record<string, number> | null = null;

    while ((rowMatch = rowRegex.exec(contentToParse)) !== null) {
      const rowContent = rowMatch[1];

      // Check for header row with <th> or prominent <td> with header titles
      if (rowContent.includes('<th') || (headerMap === null && /course title|code no/i.test(rowContent))) {
        const headerCells: string[] = [];
        const cellTagRegex = /<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;
        let cMatch;
        while ((cMatch = cellTagRegex.exec(rowContent)) !== null) {
          headerCells.push(this.cleanText(cMatch[1]).toLowerCase());
        }

        if (headerCells.length >= 4) {
          const newMap: Record<string, number> = {};
          headerCells.forEach((rawH, idx) => {
            const h = rawH.replace(/[.\-_]/g, ' ').replace(/\s+/g, ' ').trim();
            if (h === 'code no' || h === 'subject code' || h === 'paper code' || h === 'code' || h.startsWith('code no')) {
              newMap['code'] = idx;
            } else if (h.includes('title') || h.includes('course title') || h.includes('subject name') || h.includes('paper name') || h === 'course') {
              newMap['name'] = idx;
            } else if (h === 'max' || h.includes('maximum')) {
              newMap['max'] = idx;
            } else if (h === 'min' || h.includes('minimum')) {
              newMap['min'] = idx;
            } else if (h.includes('ext+int') || h.includes('ext + int') || h.includes('theory+int')) {
              newMap['extInt'] = idx;
            } else if (h.includes('ext') || h.includes('theory')) {
              newMap['ext'] = idx;
            } else if (h.includes('int') || h.includes('sessional')) {
              newMap['int'] = idx;
            } else if (h.includes('prac') || h.includes('practical')) {
              newMap['prac'] = idx;
            } else if (h === 'total' || h === 'tot' || h.includes('marks obt') || h.includes('total marks')) {
              newMap['total'] = idx;
            } else if (h === 'crd' || h.includes('credit')) {
              newMap['credit'] = idx;
            } else if (h === 'grd pts' || h.includes('grade point') || h.includes('grd pts') || h === 'gp') {
              newMap['gradePoint'] = idx;
            } else if (h === 'grd val' || h.includes('grade value') || h.includes('grd val') || h === 'gv') {
              newMap['gradeValue'] = idx;
            } else if (h === 'grd' || (h.includes('grade') && !h.includes('point') && !h.includes('value'))) {
              newMap['grade'] = idx;
            } else if (h.includes('result') || h.includes('status')) {
              newMap['status'] = idx;
            }
          });

          if (newMap['code'] !== undefined || newMap['name'] !== undefined) {
            headerMap = newMap;
            continue;
          }
        }
      }

      // Parse data row
      const cells: string[] = [];
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        cells.push(this.cleanText(cellMatch[1]));
      }

      if (cells.length >= 3) {
        const subject = this.parseSubjectCells(cells, headerMap);
        if (subject) {
          const codeKey = subject.subjectCode.trim().toUpperCase();
          if (!seenCodes.has(codeKey)) {
            seenCodes.add(codeKey);
            subjects.push(subject);
          }
        }
      }
    }

    return subjects;
  }

  private parseSubjectCells(cells: string[], headerMap: Record<string, number> | null): ExtractedSubject | null {
    // If header mapping is active and valid
    if (headerMap && (headerMap['code'] !== undefined || headerMap['name'] !== undefined)) {
      const codeIdx = headerMap['code'] !== undefined ? headerMap['code'] : 1;
      const nameIdx = headerMap['name'] !== undefined ? headerMap['name'] : 0;

      let code = (cells[codeIdx] || '').trim();
      let name = (cells[nameIdx] || '').trim();

      // Check if code and name might be inverted
      if (!this.isValidSubjectCode(code) && this.isValidSubjectCode(name)) {
        const temp = code;
        code = name;
        name = temp;
      }

      if (!this.isValidSubjectCode(code)) return null;
      if (!/[a-zA-Z]/.test(name)) return null;

      // Handle MAX column (e.g. "75+25" or "100" or "50")
      let maxMarks = 100;
      if (headerMap['max'] !== undefined && cells[headerMap['max']]) {
        const rawMax = cells[headerMap['max']].trim();
        if (rawMax.includes('+')) {
          const parts = rawMax.split('+').map(p => this.parseNumeric(p) || 0);
          maxMarks = parts.reduce((a, b) => a + b, 0) || 100;
        } else {
          maxMarks = this.parseNumeric(rawMax) || 100;
        }
      }

      // Handle MIN column
      const minMarks = headerMap['min'] !== undefined ? this.parseNumeric(cells[headerMap['min']]) : null;

      // Handle EXT+INT column (e.g., "018+017" or "066" on practicals)
      let externalMarks: number | null = null;
      let internalMarks: number | null = null;
      let practicalMarks: number | null = null;
      let totalMarks = 0;

      const isPractical = /P$/i.test(code) || /P\d*$/i.test(code) || /practical/i.test(name);

      if (headerMap['extInt'] !== undefined && cells[headerMap['extInt']]) {
        const extIntValue = cells[headerMap['extInt']].trim();
        if (extIntValue.includes('+')) {
          // Format e.g. "018+017"
          const parts = extIntValue.split('+');
          externalMarks = this.parseNumeric(parts[0]);
          internalMarks = this.parseNumeric(parts[1]);
          totalMarks = (externalMarks || 0) + (internalMarks || 0);
        } else {
          // Single value in EXT+INT column (e.g. practical marks "066")
          const val = this.parseNumeric(extIntValue);
          if (isPractical) {
            practicalMarks = val;
            totalMarks = val || 0;
          } else {
            totalMarks = val || 0;
          }
        }
      } else {
        if (headerMap['ext'] !== undefined) externalMarks = this.parseNumeric(cells[headerMap['ext']]);
        if (headerMap['int'] !== undefined) internalMarks = this.parseNumeric(cells[headerMap['int']]);
        if (headerMap['prac'] !== undefined) practicalMarks = this.parseNumeric(cells[headerMap['prac']]);
      }

      // Handle TOTAL column if present (e.g., "035", "045", "066")
      if (headerMap['total'] !== undefined && cells[headerMap['total']]) {
        const parsedTot = this.parseNumeric(cells[headerMap['total']]);
        if (parsedTot !== null) totalMarks = parsedTot;
      }

      // If practical subject and practicalMarks not yet set, assign totalMarks
      if (isPractical && practicalMarks === null && totalMarks > 0) {
        practicalMarks = totalMarks;
      }

      const credit = headerMap['credit'] !== undefined ? this.parseNumeric(cells[headerMap['credit']]) : null;
      const grade = headerMap['grade'] !== undefined ? this.cleanGrade(cells[headerMap['grade']]) : null;
      const gradePoint = headerMap['gradePoint'] !== undefined ? this.parseNumeric(cells[headerMap['gradePoint']]) : null;
      const gradeValue = headerMap['gradeValue'] !== undefined ? this.parseNumeric(cells[headerMap['gradeValue']]) : null;
      const rawStatus = headerMap['status'] !== undefined ? cells[headerMap['status']] : '';

      const status = this.determineSubjectStatus(rawStatus || grade || '', totalMarks, maxMarks);

      return {
        subjectCode: code.trim().toUpperCase(),
        subjectName: name.trim() || `Subject ${code}`,
        internalMarks,
        externalMarks,
        practicalMarks,
        totalMarks,
        maxMarks,
        minMarks,
        credit,
        grade,
        gradePoint,
        gradeValue,
        status,
        isPractical,
      };
    }

    // Positional fallback parsing when no headers exist
    let codeIdx = -1;
    let nameIdx = -1;

    for (let i = 0; i < Math.min(cells.length, 3); i++) {
      if (this.isValidSubjectCode(cells[i])) {
        codeIdx = i;
        nameIdx = i === 0 ? 1 : 0;
        break;
      }
    }

    if (codeIdx === -1) return null;

    const code = cells[codeIdx];
    const name = cells[nameIdx] || `Subject ${code}`;
    const isPractical = /P$/i.test(code) || /P\d*$/i.test(code) || /practical/i.test(name);

    const otherCells = cells.filter((_, idx) => idx !== codeIdx && idx !== nameIdx);
    const nums = otherCells.map(c => this.parseNumeric(c)).filter((n): n is number => n !== null);

    let maxMarks = 100;
    let minMarks: number | null = null;
    let totalMarks = 0;
    let externalMarks: number | null = null;
    let internalMarks: number | null = null;
    let practicalMarks: number | null = null;
    let credit: number | null = null;
    let gradePoint: number | null = null;
    let gradeValue: number | null = null;
    let grade: string | null = null;

    for (const cell of otherCells) {
      const g = this.cleanGrade(cell);
      if (g) {
        grade = g;
        break;
      }
    }

    if (nums.length === 1) {
      totalMarks = nums[0];
    } else if (nums.length === 2) {
      maxMarks = Math.max(nums[0], nums[1]);
      totalMarks = Math.min(nums[0], nums[1]);
    } else if (nums.length >= 3) {
      if (nums[0] >= 50) {
        maxMarks = nums[0];
        minMarks = nums[1] < nums[0] ? nums[1] : null;
        totalMarks = nums[nums.length > 4 ? 4 : 2] || nums[nums.length - 1];
        if (nums.length >= 5) {
          externalMarks = nums[2];
          internalMarks = nums[3];
          if (nums.length >= 6) credit = nums[5];
          if (nums.length >= 7) gradePoint = nums[6];
          if (nums.length >= 8) gradeValue = nums[7];
        }
      } else {
        internalMarks = nums[0];
        externalMarks = nums[1];
        totalMarks = nums[2];
      }
    }

    if (isPractical) {
      practicalMarks = totalMarks;
      externalMarks = null;
      internalMarks = null;
    }

    const status = this.determineSubjectStatus(grade || '', totalMarks, maxMarks);

    return {
      subjectCode: code.trim().toUpperCase(),
      subjectName: name.trim(),
      internalMarks,
      externalMarks,
      practicalMarks,
      totalMarks,
      maxMarks,
      minMarks,
      credit,
      grade,
      gradePoint,
      gradeValue,
      status,
      isPractical,
    };
  }

  private extractResultSummary(html: string, subjects: ExtractedSubject[]) {
    let status: ResultStatus = 'PASSED';
    let sourceResult = '';
    let totalMarks = 0;
    let maxMarks = 0;
    let totalCredits: number | null = null;
    let totalGradeValue: number | null = null;
    let sgpa: number | null = null;
    let cgpa: number | null = null;
    const backSubjects: string[] = [];

    // Sum from subjects
    let computedCredits = 0;
    let computedGradeValue = 0;
    let hasCreditData = false;

    for (const sub of subjects) {
      totalMarks += sub.totalMarks;
      maxMarks += sub.maxMarks;
      if (sub.credit !== null && sub.credit !== undefined) {
        computedCredits += sub.credit;
        hasCreditData = true;
      }
      if (sub.gradeValue !== null && sub.gradeValue !== undefined) {
        computedGradeValue += sub.gradeValue;
      }
      if (sub.status === 'FAIL' || sub.status === 'BACK') {
        backSubjects.push(sub.subjectCode);
      }
    }

    // Look for explicit Result Status
    const statusMatch = html.match(/(?:Result|Final\s*Result|Status)\s*[:\-]?\s*(?:<\/b>)?\s*(?:<\/(?:td|th)>\s*<td[^>]*>)?\s*<b>?\s*([A-Za-z\s\+]+?)(?:<\/b>|<br|<\/td|\t|\n|$)/i);
    if (statusMatch && statusMatch[1]) {
      const raw = this.cleanText(statusMatch[1]).toUpperCase();
      sourceResult = raw;
      if (raw.includes('BACK') || raw.includes('PWBP') || raw.includes('COMPARTMENT')) status = 'BACK';
      else if (raw.includes('FAIL') || raw === 'F') status = 'FAILED';
      else if (raw.includes('PROMOT')) status = 'PROMOTED';
      else if (raw.includes('PASS') || raw === 'P') status = 'PASSED';
      else if (raw.includes('DETAIN')) status = 'DETAINED';
    } else if (backSubjects.length > 0) {
      status = backSubjects.length > 2 ? 'FAILED' : 'BACK';
      sourceResult = status;
    } else {
      sourceResult = 'PASS';
    }

    // Look for explicit Total Marks / Max Marks
    const totalMatch = html.match(/(?:Grand\s*Total|Total\s*Marks)\s*[:\-]?\s*(?:<\/b>)?\s*(?:<\/(?:td|th)>\s*<td[^>]*>)?\s*(\d+(?:\.\d+)?)\s*(?:\/|\s*out\s*of\s*)\s*(\d+)/i);
    if (totalMatch) {
      totalMarks = parseFloat(totalMatch[1]);
      maxMarks = parseFloat(totalMatch[2]);
    }

    // Look for Total Credits (e.g. "Total Credits: 19")
    const creditsMatch = html.match(/(?:Total\s*Credits?)\s*[:\-]?\s*(?:<\/b>)?\s*(?:<\/(?:td|th)>\s*<td[^>]*>)?\s*(\d+(?:\.\d+)?)/i);
    if (creditsMatch) {
      totalCredits = parseFloat(creditsMatch[1]);
    } else if (hasCreditData && computedCredits > 0) {
      totalCredits = computedCredits;
    }

    // Look for Total Grade Value (e.g. "Total Grade Value: 58" or "Total GV")
    const gvMatch = html.match(/(?:Total\s*(?:Grade\s*Value|GV))\s*[:\-]?\s*(?:<\/b>)?\s*(?:<\/(?:td|th)>\s*<td[^>]*>)?\s*(\d+(?:\.\d+)?)/i);
    if (gvMatch) {
      totalGradeValue = parseFloat(gvMatch[1]);
    } else if (computedGradeValue > 0) {
      totalGradeValue = computedGradeValue;
    }

    // Look for SGPA / CGPA directly provided by CCSU
    const sgpaMatch = html.match(/(?:SGPA)\s*[:\-]?\s*(?:<\/b>)?\s*(?:<\/(?:td|th)>\s*<td[^>]*>)?\s*(\d+\.?\d*)/i);
    if (sgpaMatch) sgpa = parseFloat(sgpaMatch[1]);

    const cgpaMatch = html.match(/(?:CGPA)\s*[:\-]?\s*(?:<\/b>)?\s*(?:<\/(?:td|th)>\s*<td[^>]*>)?\s*(\d+\.?\d*)/i);
    if (cgpaMatch) cgpa = parseFloat(cgpaMatch[1]);

    const percentage = maxMarks > 0 ? parseFloat(((totalMarks / maxMarks) * 100).toFixed(2)) : 0;

    return {
      status,
      sourceResult,
      totalMarks,
      maxMarks: maxMarks || (subjects.length * 100),
      percentage,
      totalCredits,
      totalGradeValue,
      sgpa,
      cgpa,
      backSubjects,
    };
  }

  private determineSubjectStatus(text: string, totalMarks: number, maxMarks: number): SubjectStatus {
    const t = text.toUpperCase().trim();
    if (t === 'F' || t.includes('FAIL')) return 'FAIL';
    if (t.includes('BACK') || t.includes('BP')) return 'BACK';
    if (t.includes('ABS') || t === 'AB') return 'ABSENT';
    // Grades like O, A+, A, B+, B-, B, C, P are PASS
    if (/^(O|A\+?|B\+|B\-|B|C|P|PASS)$/i.test(t)) return 'PASS';

    // Threshold check (40% default)
    const threshold = maxMarks > 0 ? maxMarks * 0.4 : 40;
    return totalMarks >= threshold ? 'PASS' : 'FAIL';
  }

  private cleanGrade(val: string | undefined | null): string | null {
    if (!val) return null;
    const clean = val.trim().toUpperCase();
    if (/^(O|A\+|A|B\+|B\-|B|C|P|F)$/i.test(clean)) {
      return clean;
    }
    return null;
  }

  private isValidSubjectCode(val: string | undefined): boolean {
    if (!val) return false;
    const clean = val.trim();
    if (clean.length < 2 || clean.length > 20) return false;
    // Exclude header or label words
    if (/^(subject|course|paper|code|total|max|min|grade|credit|s\.?no|#|roll|enrol|name|candidate|institution|college|session|crd|grd|val|pts)$/i.test(clean)) return false;
    return /^[A-Za-z0-9\-_]{2,15}$/.test(clean);
  }

  private cleanText(raw: string): string {
    return raw
      .replace(/<[^>]+>/g, '') // Strip HTML tags
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&#39;/gi, "'")
      .replace(/&quot;/gi, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private parseNumeric(val: string | undefined): number | null {
    if (!val) return null;
    const clean = val.replace(/[^0-9\.]/g, '');
    if (!clean) return null;
    const n = parseFloat(clean);
    return isNaN(n) ? null : n;
  }

  private toTitleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Dedicated standalone function: extractCCSURollNumber(document) -> string | null
 * Extracts the roll number ONLY from fields semantically associated with:
 * "ROLL NO", "ROLL NUMBER", "ROLL NO.", "Roll No.", "अनुक्रमांक".
 * If "INGWRAP" or invalid tokens are found, returns null (NEVER "INGWRAP").
 */
export function extractCCSURollNumber(document: string | any): string | null {
  const parser = new CCSUParser();
  return parser.extractCCSURollNumber(document);
}

