import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from './prisma';

export interface CollegeSubjectMeta {
  code: string;
  name: string;
  isPractical: boolean;
  externalMax: number;
  internalMax: number;
  totalMax: number;
}

export interface CollegeStudentMarkEntry {
  external: number | null;
  internal: number | null;
  practical: number | null;
  total: number;
  status: string;
  isFail: boolean;
}

export interface CollegeStudentRecord {
  srNo: number;
  rollNumber: string;
  name: string;
  marks: Record<string, CollegeStudentMarkEntry>;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  division: string;
  result: string;
  isFail: boolean;
}

export interface CollegeAnalysisData {
  collegeName: string;
  subtitle: string;
  course: string;
  semester: string;
  semesterLabel: string;
  subjects: CollegeSubjectMeta[];
  students: CollegeStudentRecord[];
  totalMaxMarks: number;
}

export class CollegeFormatExporter {
  public static readonly COLLEGE_TITLE = 'SUNDER DEEP COLLEGE OF MANAGEMANT & TECHNOLOGY, GHAZIABAD';

  /**
   * Formats semester into 1st, 2nd, 3rd, 4th, etc.
   */
  public static formatSemesterLabel(sem: string): string {
    const s = (sem || '').trim().toUpperCase();
    if (s === '1' || s === 'I' || s === 'SEM I' || s === 'SEM-I' || s === 'FIRST') return '1st';
    if (s === '2' || s === 'II' || s === 'SEM II' || s === 'SEM-II' || s === 'SECOND') return '2nd';
    if (s === '3' || s === 'III' || s === 'SEM III' || s === 'SEM-III' || s === 'THIRD') return '3rd';
    if (s === '4' || s === 'IV' || s === 'SEM IV' || s === 'SEM-IV' || s === 'FOURTH') return '4th';
    if (s === '5' || s === 'V' || s === 'SEM V' || s === 'SEM-V' || s === 'FIFTH') return '5th';
    if (s === '6' || s === 'VI' || s === 'SEM VI' || s === 'SEM-VI' || s === 'SIXTH') return '6th';
    return sem || '1st';
  }

  /**
   * Normalizes course name (e.g. B.C.A. -> BCA)
   */
  public static formatCourseName(course: string): string {
    const c = (course || '').trim().replace(/\./g, '').toUpperCase();
    return c || 'BCA';
  }

  /**
   * Calculates division according to CCSU / College standard:
   * First: >= 60%
   * Second: >= 50% and < 60%
   * Third: < 50% (and passed)
   * Fail: If result status is FAIL/FAILED or student failed
   */
  public static calculateDivision(percentage: number, resultStatus: string, isFail: boolean): string {
    const status = (resultStatus || '').toUpperCase();
    if (isFail || status === 'FAIL' || status === 'FAILED' || status === 'DETAINED') {
      return 'FAIL';
    }
    if (status === 'BACK' || status === 'PCP' || status === 'PROMOTED') {
      return 'BACK';
    }
    if (percentage >= 60) return 'First';
    if (percentage >= 50) return 'Second';
    return 'Third';
  }

  /**
   * Shortens long subject names for compact header display
   */
  public static shortenSubjectName(name: string, code: string): string {
    if (!name) return `Subject (${code})`;
    const clean = name.trim();
    if (clean.length <= 18) return `${clean} (${code})`;

    // Common abbreviations
    const abbrev = clean
      .replace(/Mathematical Foundation For Computer Science-i/i, 'Math I')
      .replace(/Mathematical Foundation For Computer Science-ii/i, 'Math II')
      .replace(/Computer Architecture Practical/i, 'CA Lab')
      .replace(/Computer Architecture/i, 'Comp. Arch.')
      .replace(/Problem Solving Technique Practical/i, 'PST Lab')
      .replace(/Problem Solving Technique/i, 'PST')
      .replace(/Indian Knowledge System/i, 'IKS')
      .replace(/Environmental Science And Sustainability/i, 'EVS')
      .replace(/General English - I/i, 'Gen. English')
      .replace(/Computer Graphics & Multimedia/i, 'CG & Multi.')
      .replace(/Computer Graphics Lab/i, 'CG Lab')
      .replace(/Operating System/i, 'OS')
      .replace(/Software Engineering/i, 'Soft. Engg.')
      .replace(/Optimization Techniques/i, 'Optim. Tech.')
      .replace(/Programming/i, 'Prog.')
      .replace(/Practical/i, 'Lab');

    return `${abbrev} (${code})`;
  }

  /**
   * Fetches data from database and structures it into CollegeAnalysisData
   */
  public static async getCollegeAnalysisData(courseFilter?: string, semesterFilter?: string): Promise<CollegeAnalysisData> {
    const cleanCourse = (courseFilter || '').replace(/\./g, '').trim().toUpperCase();
    const cleanSem = (semesterFilter || '').trim().toUpperCase();

    const resultsRaw = await prisma.result.findMany({
      include: {
        student: true,
        subjects: { orderBy: { subjectCode: 'asc' } },
      },
      orderBy: { student: { rollNumber: 'asc' } },
    });

    const results = resultsRaw.filter(r => {
      if (cleanCourse) {
        const studentCourseClean = (r.student.course || '').replace(/\./g, '').trim().toUpperCase();
        if (studentCourseClean !== cleanCourse && !studentCourseClean.includes(cleanCourse)) {
          return false;
        }
      }
      if (cleanSem) {
        const sSem1 = (r.semester || '').trim().toUpperCase();
        const sSem2 = (r.student.semester || '').trim().toUpperCase();
        const semNormalized = cleanSem.replace(/^SEM[\s-]*/i, '');
        const match1 = sSem1 === cleanSem || sSem1.replace(/^SEM[\s-]*/i, '') === semNormalized;
        const match2 = sSem2 === cleanSem || sSem2.replace(/^SEM[\s-]*/i, '') === semNormalized;
        if (!match1 && !match2) return false;
      }
      return true;
    });

    const activeCourse = results[0]?.student.course || courseFilter || 'B.C.A.';
    const activeSem = results[0]?.semester || semesterFilter || 'I';
    const courseClean = this.formatCourseName(activeCourse);
    const semLabel = this.formatSemesterLabel(activeSem);
    const subtitle = `RESULT ANALYSIS, SDCMT ${courseClean} (${semLabel} Sem)`;

    // Detect unique subjects across all students
    const subjectMap = new Map<string, CollegeSubjectMeta>();

    for (const r of results) {
      for (const s of r.subjects) {
        if (!subjectMap.has(s.subjectCode)) {
          const isPractical =
            /P$/i.test(s.subjectCode) ||
            /practical/i.test(s.subjectName) ||
            /lab/i.test(s.subjectName) ||
            (s.practicalMarks !== null && s.practicalMarks > 0);

          let extMax = 75;
          let intMax = 25;
          let totMax = 100;

          if (isPractical) {
            extMax = 0;
            intMax = 0;
            totMax = s.maxMarks || 100;
          } else {
            if (s.maxMarks === 50) {
              extMax = 35;
              intMax = 15;
              totMax = 50;
            } else {
              extMax = 75;
              intMax = 25;
              totMax = s.maxMarks || 100;
            }
          }

          subjectMap.set(s.subjectCode, {
            code: s.subjectCode,
            name: s.subjectName,
            isPractical,
            externalMax: extMax,
            internalMax: intMax,
            totalMax: totMax,
          });
        }
      }
    }

    // Sort subjects: Theory subjects first, then Practical/Lab subjects
    const subjects = Array.from(subjectMap.values()).sort((a, b) => {
      if (a.isPractical && !b.isPractical) return 1;
      if (!a.isPractical && b.isPractical) return -1;
      return a.code.localeCompare(b.code, undefined, { numeric: true });
    });

    const totalMaxMarks = subjects.reduce((sum, s) => sum + s.totalMax, 0) || 600;

    // Build student records
    const students: CollegeStudentRecord[] = results.map((r, idx) => {
      const marksMap: Record<string, CollegeStudentMarkEntry> = {};
      let studentObtained = 0;
      let hasFailedSubject = false;

      for (const sub of subjects) {
        const found = r.subjects.find(s => s.subjectCode === sub.code);
        if (found) {
          const isFail = found.status === 'FAIL' || found.status === 'BACK' || found.totalMarks < (sub.totalMax * 0.4);
          if (isFail) hasFailedSubject = true;

          marksMap[sub.code] = {
            external: found.externalMarks,
            internal: found.internalMarks,
            practical: found.practicalMarks,
            total: found.totalMarks,
            status: found.status,
            isFail,
          };
          studentObtained += found.totalMarks;
        } else {
          marksMap[sub.code] = {
            external: null,
            internal: null,
            practical: null,
            total: 0,
            status: 'ABSENT',
            isFail: true,
          };
        }
      }

      const totalMarks = r.totalMarks > 0 ? r.totalMarks : studentObtained;
      const calcMax = r.maxMarks > 0 ? r.maxMarks : totalMaxMarks;
      const percentage = r.percentage > 0 ? r.percentage : (totalMarks / calcMax) * 100;
      const isFailResult = r.resultStatus === 'FAIL' || r.resultStatus === 'FAILED' || hasFailedSubject;

      const division = this.calculateDivision(percentage, r.resultStatus, isFailResult);
      const result = isFailResult ? (r.resultStatus === 'BACK' ? 'BACK' : 'FAIL') : 'PASS';

      return {
        srNo: idx + 1,
        rollNumber: r.student.rollNumber,
        name: r.student.name,
        marks: marksMap,
        totalObtained: totalMarks,
        totalMax: calcMax,
        percentage,
        division,
        result,
        isFail: isFailResult,
      };
    });

    return {
      collegeName: this.COLLEGE_TITLE,
      subtitle,
      course: courseClean,
      semester: activeSem,
      semesterLabel: semLabel,
      subjects,
      students,
      totalMaxMarks,
    };
  }

  /**
   * Generates SheetJS Workbook matching the exact college format
   */
  public static generateCollegeWorkbook(data: CollegeAnalysisData): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();

    // 1. Build Header Rows
    const row1: any[] = [data.collegeName];
    const row2: any[] = [data.subtitle];
    const row3: any[] = ['Sr. No.', 'ROLL NO.', 'NAME'];
    const row4: any[] = ['MAXIMUM MARKS', '', ''];

    const merges: XLSX.Range[] = [];

    // Track column index
    let colIdx = 3;

    for (const sub of data.subjects) {
      const headerTitle = this.shortenSubjectName(sub.name, sub.code);

      if (!sub.isPractical) {
        // Theory Subject: External, Internal, TOTAL
        // Row 3: Title spanning Ext & Int cols, then TOTAL
        row3.push(headerTitle, '', 'TOTAL');
        merges.push({ s: { r: 2, c: colIdx }, e: { r: 2, c: colIdx + 1 } });

        // Row 4: External max (75), Internal max (25), Total max (100)
        row4.push(sub.externalMax, sub.internalMax, sub.totalMax);
        colIdx += 3;
      } else {
        // Practical Subject: Single column
        row3.push(headerTitle);
        row4.push(sub.totalMax);
        colIdx += 1;
      }
    }

    // Summary Columns in Row 3 & Row 4
    row3.push('OBT. MARKS', 'Percentage %', 'DIVISION', 'RESULT');
    row4.push(data.totalMaxMarks, '', '', '');

    const totalCols = row3.length;

    // Merge Row 1 across all columns
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });
    // Merge Row 2 across all columns
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } });
    // Merge Row 4 "MAXIMUM MARKS" across Sr. No., ROLL NO., NAME (Cols 0-2)
    merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 2 } });

    // Pad Row 1 and Row 2 with empty strings so SheetJS formats cleanly
    while (row1.length < totalCols) row1.push('');
    while (row2.length < totalCols) row2.push('');

    // 2. Build Student Data Rows
    const dataRows: any[][] = [];

    data.students.forEach((st) => {
      const sRow: any[] = [st.srNo, st.rollNumber, st.name];

      for (const sub of data.subjects) {
        const mark = st.marks[sub.code];
        if (!sub.isPractical) {
          sRow.push(
            mark?.external !== null && mark?.external !== undefined ? mark.external : '—',
            mark?.internal !== null && mark?.internal !== undefined ? mark.internal : '—',
            mark?.total ?? 0
          );
        } else {
          sRow.push(
            mark?.practical !== null && mark?.practical !== undefined
              ? mark.practical
              : mark?.total ?? 0
          );
        }
      }

      sRow.push(
        st.totalObtained,
        parseFloat(st.percentage.toFixed(4)),
        st.division,
        st.result
      );

      dataRows.push(sRow);
    });

    const allRows = [row1, row2, row3, row4, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    ws['!merges'] = merges;

    // Define column widths
    const colWidths = [
      { wch: 8 },  // Sr. No.
      { wch: 16 }, // ROLL NO.
      { wch: 22 }, // NAME
    ];

    for (const sub of data.subjects) {
      if (!sub.isPractical) {
        colWidths.push({ wch: 8 }, { wch: 8 }, { wch: 9 });
      } else {
        colWidths.push({ wch: 14 });
      }
    }

    colWidths.push(
      { wch: 12 }, // OBT. MARKS
      { wch: 14 }, // Percentage %
      { wch: 12 }, // DIVISION
      { wch: 10 }  // RESULT
    );

    ws['!cols'] = colWidths;

    const sheetName = `SDCMT ${data.course} Sem ${data.semesterLabel}`.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    return wb;
  }

  /**
   * Generates and writes the SDCMT College Format Excel file directly to disk in exports/
   */
  public static async saveCollegeFormatToFile(
    courseFilter?: string,
    semesterFilter?: string
  ): Promise<{ filePath: string; fileName: string; buffer: Buffer }> {
    const data = await this.getCollegeAnalysisData(courseFilter, semesterFilter);
    const wb = this.generateCollegeWorkbook(data);

    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const fileName = `SDCMT_${data.course}_Sem_${data.semesterLabel}_Result_Analysis.xlsx`;
    const filePath = path.join(exportsDir, fileName);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    fs.writeFileSync(filePath, buffer);

    console.log(`[COLLEGE FORMAT EXPORTER] Successfully saved SDCMT master sheet to: ${filePath}`);

    return { filePath, fileName, buffer };
  }
}
