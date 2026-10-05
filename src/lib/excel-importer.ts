import * as XLSX from 'xlsx';

export interface ColumnMapping {
  rollNumber: string;
  name: string;
  enrollmentNumber?: string;
  course?: string;
  semester?: string;
  section?: string;
  batch?: string;
}

export interface ParsedStudentRow {
  rollNumber: string;
  name: string;
  enrollmentNumber?: string;
  course: string;
  semester: string;
  section?: string;
  batch?: string;
  isValid: boolean;
  errors: string[];
}

export interface ImportValidationReport {
  totalRows: number;
  validRows: ParsedStudentRow[];
  invalidRows: ParsedStudentRow[];
  duplicateRollNumbers: string[];
  headers: string[];
  suggestedMapping: Partial<ColumnMapping>;
}

export class ExcelImporter {
  /**
   * Intelligently guesses column mappings based on common header synonyms
   */
  public static guessColumnMapping(headers: string[]): Partial<ColumnMapping> {
    const mapping: Partial<ColumnMapping> = {};
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const h of headers) {
      const n = norm(h);

      if (!mapping.rollNumber && (n.includes('roll') || n.includes('regno') || n === 'univroll' || n === 'rollnumber')) {
        mapping.rollNumber = h;
      } else if (!mapping.name && (n.includes('name') || n.includes('student') || n.includes('candidate'))) {
        mapping.name = h;
      } else if (!mapping.enrollmentNumber && (n.includes('enrol') || n.includes('enroll') || n.includes('reg') || n === 'eno')) {
        mapping.enrollmentNumber = h;
      } else if (!mapping.course && (n.includes('course') || n.includes('prog') || n.includes('branch') || n.includes('stream'))) {
        mapping.course = h;
      } else if (!mapping.semester && (n.includes('sem') || n.includes('semester') || n.includes('year'))) {
        mapping.semester = h;
      } else if (!mapping.section && (n.includes('sec') || n.includes('section') || n.includes('group'))) {
        mapping.section = h;
      } else if (!mapping.batch && (n.includes('batch') || n.includes('session') || n.includes('cohort'))) {
        mapping.batch = h;
      }
    }

    return mapping;
  }

  /**
   * Parses raw file buffer (Excel or CSV) and extracts raw sheet rows
   */
  public static parseFile(buffer: Buffer): { headers: string[]; rows: Array<Record<string, any>> } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];

    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    if (rawRows.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = Object.keys(rawRows[0]);
    return { headers, rows: rawRows };
  }

  /**
   * Validates parsed student records against user column mapping
   */
  public static validateRecords(
    rawRows: Array<Record<string, any>>,
    mapping: ColumnMapping,
    defaultCourse = 'Bachelor of Computer Applications (B.C.A.)',
    defaultSemester = 'IV'
  ): ImportValidationReport {
    const validRows: ParsedStudentRow[] = [];
    const invalidRows: ParsedStudentRow[] = [];
    const seenRolls = new Set<string>();
    const duplicateRollNumbers: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const errors: string[] = [];

      const rawRoll = mapping.rollNumber ? String(row[mapping.rollNumber] || '').trim() : '';
      const rawName = mapping.name ? String(row[mapping.name] || '').trim() : '';
      const rawEnroll = mapping.enrollmentNumber ? String(row[mapping.enrollmentNumber] || '').trim() : '';
      const rawCourse = mapping.course && row[mapping.course] ? String(row[mapping.course]).trim() : defaultCourse;
      const rawSemester = mapping.semester && row[mapping.semester] ? String(row[mapping.semester]).trim() : defaultSemester;
      const rawSection = mapping.section && row[mapping.section] ? String(row[mapping.section]).trim() : '';
      const rawBatch = mapping.batch && row[mapping.batch] ? String(row[mapping.batch]).trim() : '';

      // Check 1: Required roll number
      if (!rawRoll) {
        errors.push(`Row ${i + 2}: Roll Number is empty`);
      } else {
        // Check 2: Invalid format check (at least 3 alphanumeric characters)
        if (!/^[A-Za-z0-9\-_]{3,25}$/.test(rawRoll)) {
          errors.push(`Row ${i + 2}: Roll number format '${rawRoll}' is invalid`);
        }

        // Check 3: Duplicate detection within upload
        const cleanRoll = rawRoll.toUpperCase();
        if (seenRolls.has(cleanRoll)) {
          errors.push(`Row ${i + 2}: Duplicate roll number '${rawRoll}' in file`);
          if (!duplicateRollNumbers.includes(rawRoll)) {
            duplicateRollNumbers.push(rawRoll);
          }
        } else {
          seenRolls.add(cleanRoll);
        }
      }

      // Check 4: Student name
      if (!rawName) {
        errors.push(`Row ${i + 2}: Student name is empty`);
      }

      const parsedRecord: ParsedStudentRow = {
        rollNumber: rawRoll,
        name: rawName || 'Unknown Student',
        enrollmentNumber: rawEnroll || undefined,
        course: rawCourse,
        semester: rawSemester,
        section: rawSection || undefined,
        batch: rawBatch || undefined,
        isValid: errors.length === 0,
        errors,
      };

      if (parsedRecord.isValid) {
        validRows.push(parsedRecord);
      } else {
        invalidRows.push(parsedRecord);
      }
    }

    const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
    const suggestedMapping = this.guessColumnMapping(headers);

    return {
      totalRows: rawRows.length,
      validRows,
      invalidRows,
      duplicateRollNumbers,
      headers,
      suggestedMapping,
    };
  }
}
