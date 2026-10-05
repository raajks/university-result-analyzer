/**
 * Semester Normalization & Matching Helper
 * Provides bulletproof detection and comparison of academic semesters across
 * numeric ('1', '2'), Roman ('I', 'II'), and ordinal/text representations ('1st', '2nd', 'Second', 'SEM-II').
 */

export function normalizeSemesterToNumber(sem?: string | null): number | null {
  if (!sem) return null;
  const s = sem.trim().toUpperCase();

  // Strip prefixes like "SEMESTER", "SEM", "PART"
  const clean = s.replace(/^(?:SEMESTER|SEM|PART)[-_\s]*/i, '').trim();

  if (clean === '1' || clean === 'I' || clean === '1ST' || clean === 'FIRST') return 1;
  if (clean === '2' || clean === 'II' || clean === '2ND' || clean === 'SECOND') return 2;
  if (clean === '3' || clean === 'III' || clean === '3RD' || clean === 'THIRD') return 3;
  if (clean === '4' || clean === 'IV' || clean === '4TH' || clean === 'FOURTH') return 4;
  if (clean === '5' || clean === 'V' || clean === '5TH' || clean === 'FIFTH') return 5;
  if (clean === '6' || clean === 'VI' || clean === '6TH' || clean === 'SIXTH') return 6;
  if (clean === '7' || clean === 'VII' || clean === '7TH' || clean === 'SEVENTH') return 7;
  if (clean === '8' || clean === 'VIII' || clean === '8TH' || clean === 'EIGHTH') return 8;

  // Regex checks on the full string for embedded tokens
  if (/(?:^|[^A-Z0-9])(?:SEM|SEMESTER)?[-_\s]*(?:8|8TH|EIGHTH|VIII)(?:$|[^A-Z0-9])/i.test(s)) return 8;
  if (/(?:^|[^A-Z0-9])(?:SEM|SEMESTER)?[-_\s]*(?:7|7TH|SEVENTH|VII)(?:$|[^A-Z0-9])/i.test(s)) return 7;
  if (/(?:^|[^A-Z0-9])(?:SEM|SEMESTER)?[-_\s]*(?:6|6TH|SIXTH|VI)(?:$|[^A-Z0-9])/i.test(s)) return 6;
  if (/(?:^|[^A-Z0-9])(?:SEM|SEMESTER)?[-_\s]*(?:5|5TH|FIFTH|V)(?:$|[^A-Z0-9])/i.test(s)) return 5;
  if (/(?:^|[^A-Z0-9])(?:SEM|SEMESTER)?[-_\s]*(?:4|4TH|FOURTH|IV)(?:$|[^A-Z0-9])/i.test(s)) return 4;
  if (/(?:^|[^A-Z0-9])(?:SEM|SEMESTER)?[-_\s]*(?:3|3RD|THIRD|III)(?:$|[^A-Z0-9])/i.test(s)) return 3;
  if (/(?:^|[^A-Z0-9])(?:SEM|SEMESTER)?[-_\s]*(?:2|2ND|SECOND|II)(?:$|[^A-Z0-9])/i.test(s)) return 2;
  if (/(?:^|[^A-Z0-9])(?:SEM|SEMESTER)?[-_\s]*(?:1|1ST|FIRST|I)(?:$|[^A-Z0-9])/i.test(s)) return 1;

  return null;
}

export function toRomanSemester(semNumber: number): string {
  const romans = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  return romans[semNumber] || String(semNumber);
}

export function toOrdinalSemester(semNumber: number): string {
  const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
  return ordinals[semNumber] || `${semNumber}th`;
}

/**
 * Checks whether text, URL, or HTML snippet corresponds to the target semester number.
 * Uses strict token boundaries to prevent substring collisions (e.g. 'I' matching inside 'II' or 'III').
 */
export function textMatchesSemester(text: string, targetSemNumber: number): boolean {
  if (!text || !targetSemNumber) return false;
  const upper = text.toUpperCase();

  const roman = toRomanSemester(targetSemNumber);
  const num = String(targetSemNumber);
  const ord = toOrdinalSemester(targetSemNumber).toUpperCase();

  // 1. URL pattern: -II- or -2- or /II/ or /2/
  const urlPattern = new RegExp(`[-_/]${roman}[-_/]`, 'i');
  const urlNumPattern = new RegExp(`[-_/]${num}[-_/]`, 'i');
  if (urlPattern.test(upper) || urlNumPattern.test(upper)) return true;

  // 2. SEM prefix: SEM-II, SEM - II, SEMESTER-II, SEMESTER II, SEM-2
  const semPattern = new RegExp(`(?:SEM|SEMESTER)[-_\s]*${roman}(?:$|[^A-Z0-9])`, 'i');
  const semNumPattern = new RegExp(`(?:SEM|SEMESTER)[-_\s]*${num}(?:$|[^A-Z0-9])`, 'i');
  if (semPattern.test(upper) || semNumPattern.test(upper)) return true;

  // 3. Ordinal check: 2ND SEM, SECOND SEM, 2ND SEMESTER
  if (upper.includes(ord)) return true;

  // 4. Roman word boundary check (only for Sem > 1 to avoid 'I' colliding with common English/University names)
  if (targetSemNumber > 1) {
    const romanWordPattern = new RegExp(`\\b${roman}\\b`);
    if (romanWordPattern.test(upper)) return true;
  } else {
    // For Sem 1, require explicit SEM context or URL pattern or (SEM-I)
    if (/\bSEM[-_\s]*I\b/i.test(upper) || /\bSEM-1\b/i.test(upper) || /\b1ST\s*SEM\b/i.test(upper)) return true;
  }

  return false;
}

/**
 * Scans text and identifies which semester number (1-8) it refers to, if any.
 * Checks in descending order (8 down to 1) so longer Roman numerals like VIII, VII, VI, IV, III, II
 * are checked before I.
 */
export function detectSemesterInText(text: string): number | null {
  if (!text) return null;
  for (const n of [8, 7, 6, 5, 4, 3, 2, 1]) {
    if (textMatchesSemester(text, n)) {
      return n;
    }
  }
  return null;
}
