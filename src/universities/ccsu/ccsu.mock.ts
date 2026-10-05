import { StudentLookupInput } from '../base/types';
import { normalizeSemesterToNumber, toRomanSemester } from '../base/semester-helper';

interface MockSubjectTemplate {
  code: string;
  name: string;
  max: string;
  min: number;
  credit: number;
  isPractical: boolean;
}

export class CCSUMockGenerator {
  /**
   * Generates realistic CCSU marksheet HTML matching the verified new-tab marksheet layout.
   * Headers: COURSE TITLE, CODE NO., MAX, MIN, EXT+INT, TOTAL, CRD., GRD., GRD PTS., GRD VAL.
   * Automatically adapts subjects to match the requested semester (1st, 2nd, etc.).
   */
  public static generateMockResultHtml(student: StudentLookupInput, scenario: 'PASS' | 'BACK' | 'FAIL' = 'PASS'): string {
    const roll = student.rollNumber;
    const name = student.name || 'ABHI SHARMA';
    const enroll = student.enrollmentNumber || 'M250302001';
    
    // Normalize semester
    const semNum = normalizeSemesterToNumber(student.semester) || 2;
    const sem = toRomanSemester(semNum);
    const course = student.course && student.course.includes('SEM') ? student.course : `BCA SEM-${sem}`;

    // Semester-specific subject templates
    let subjectTemplates: MockSubjectTemplate[];

    if (semNum === 2) {
      subjectTemplates = [
        { code: '2001', name: 'DATA STRUCTURES USING C', max: '75+25', min: 40, credit: 3, isPractical: false },
        { code: '2002', name: 'OBJECT ORIENTED PROGRAMMING USING C++', max: '75+25', min: 40, credit: 3, isPractical: false },
        { code: '2002P', name: 'OOP LAB (C++)', max: '100', min: 40, credit: 2, isPractical: true },
        { code: '2003', name: 'DIGITAL ELECTRONICS AND COMPUTER ORGANIZATION', max: '75+25', min: 40, credit: 2, isPractical: false },
        { code: '2004', name: 'DISCRETE MATHEMATICS', max: '75+25', min: 40, credit: 3, isPractical: false },
        { code: '2004P', name: 'DATA STRUCTURES LAB', max: '100', min: 40, credit: 2, isPractical: true },
        { code: '2005', name: 'FINANCIAL MANAGEMENT AND ACCOUNTING', max: '75+25', min: 40, credit: 3, isPractical: false },
        { code: '2006', name: 'ENVIRONMENTAL STUDIES', max: '50', min: 20, credit: 2, isPractical: false },
      ];
    } else if (semNum === 1) {
      subjectTemplates = [
        { code: '1001', name: 'MATHEMATICAL FOUNDATION FOR COMPUTER SCIENCE-I', max: '75+25', min: 40, credit: 3, isPractical: false },
        { code: '1002', name: 'COMPUTER ARCHITECTURE', max: '75+25', min: 40, credit: 3, isPractical: false },
        { code: '1002P', name: 'COMPUTER ARCHITECTURE PRACTICAL', max: '100', min: 40, credit: 2, isPractical: true },
        { code: '1003', name: 'INDIAN KNOWLEDGE SYSTEM', max: '75+25', min: 40, credit: 2, isPractical: false },
        { code: '1004', name: 'PROBLEM SOLVING TECHNIQUE', max: '75+25', min: 40, credit: 3, isPractical: false },
        { code: '1004P', name: 'PROBLEM SOLVING TECHNIQUE PRACTICAL', max: '100', min: 40, credit: 2, isPractical: true },
        { code: '1005', name: 'GENERAL ENGLISH-I', max: '75+25', min: 40, credit: 3, isPractical: false },
        { code: '1006', name: 'ENVIRONMENTAL SCIENCE AND SUSTAINABILITY', max: '50', min: 20, credit: 2, isPractical: false },
      ];
    } else {
      subjectTemplates = [
        { code: `${semNum}001`, name: `CORE SUBJECT 1 (SEM ${sem})`, max: '75+25', min: 40, credit: 3, isPractical: false },
        { code: `${semNum}002`, name: `CORE SUBJECT 2 (SEM ${sem})`, max: '75+25', min: 40, credit: 3, isPractical: false },
        { code: `${semNum}002P`, name: `LAB 1 (SEM ${sem})`, max: '100', min: 40, credit: 2, isPractical: true },
        { code: `${semNum}003`, name: `ALLIED SUBJECT (SEM ${sem})`, max: '75+25', min: 40, credit: 2, isPractical: false },
        { code: `${semNum}004`, name: `TECHNICAL SUBJECT (SEM ${sem})`, max: '75+25', min: 40, credit: 3, isPractical: false },
        { code: `${semNum}004P`, name: `LAB 2 (SEM ${sem})`, max: '100', min: 40, credit: 2, isPractical: true },
        { code: `${semNum}005`, name: `MANAGEMENT SUBJECT (SEM ${sem})`, max: '75+25', min: 40, credit: 3, isPractical: false },
        { code: `${semNum}006`, name: `VALUE ADDED (SEM ${sem})`, max: '50', min: 20, credit: 2, isPractical: false },
      ];
    }

    let subjectsHtml = '';
    let overallResult = 'PASSED';
    let sgpa = 7.85;
    let cgpa = 7.85;
    let totalCredits = 19;
    let totalGradeValue = 149;

    if (scenario === 'FAIL') {
      overallResult = 'FAIL';
      sgpa = 3.05;
      cgpa = 3.05;
      totalCredits = 19;
      totalGradeValue = 58;

      const marksRows = [
        { extInt: '018+017', tot: '035', grd: 'F', pts: '00', val: '00' },
        { extInt: '025+020', tot: '045', grd: 'P', pts: '05', val: '15' },
        { extInt: '066',     tot: '066', grd: 'B-', pts: '07', val: '14' },
        { extInt: '016+017', tot: '033', grd: 'F', pts: '00', val: '00' },
        { extInt: '029+020', tot: '049', grd: 'P', pts: '05', val: '15' },
        { extInt: '065',     tot: '065', grd: 'B',  pts: '07', val: '14' },
        { extInt: '018+017', tot: '035', grd: 'F', pts: '00', val: '00' },
        { extInt: '035',     tot: '035', grd: 'P',  pts: '00', val: '00' },
      ];

      subjectsHtml = subjectTemplates.map((t, idx) => {
        const m = marksRows[idx] || marksRows[0];
        return `
        <tr>
          <td>${t.name}</td>
          <td>${t.code}</td>
          <td>${t.max}</td>
          <td>${t.min}</td>
          <td>${m.extInt}</td>
          <td>${m.tot}</td>
          <td>${t.credit}</td>
          <td>${m.grd}</td>
          <td>${m.pts}</td>
          <td>${m.val}</td>
        </tr>`;
      }).join('\n');
    } else if (scenario === 'BACK') {
      overallResult = 'PROMOTED WITH BACK PAPER (PWBP)';
      sgpa = 5.25;
      cgpa = 5.25;
      totalCredits = 19;
      totalGradeValue = 100;

      const marksRows = [
        { extInt: '018+017', tot: '035', grd: 'F',  pts: '00', val: '00' },
        { extInt: '035+020', tot: '055', grd: 'B',  pts: '06', val: '18' },
        { extInt: '070',     tot: '070', grd: 'B+', pts: '07', val: '14' },
        { extInt: '030+020', tot: '050', grd: 'P',  pts: '05', val: '10' },
        { extInt: '015+015', tot: '030', grd: 'F',  pts: '00', val: '00' },
        { extInt: '075',     tot: '075', grd: 'A',  pts: '08', val: '16' },
        { extInt: '035+020', tot: '055', grd: 'B',  pts: '06', val: '18' },
        { extInt: '040',     tot: '040', grd: 'P',  pts: '05', val: '10' },
      ];

      subjectsHtml = subjectTemplates.map((t, idx) => {
        const m = marksRows[idx] || marksRows[0];
        return `
        <tr>
          <td>${t.name}</td>
          <td>${t.code}</td>
          <td>${t.max}</td>
          <td>${t.min}</td>
          <td>${m.extInt}</td>
          <td>${m.tot}</td>
          <td>${t.credit}</td>
          <td>${m.grd}</td>
          <td>${m.pts}</td>
          <td>${m.val}</td>
        </tr>`;
      }).join('\n');
    } else {
      // PASS
      overallResult = 'PASSED';
      sgpa = 7.85;
      cgpa = 7.85;
      totalCredits = 19;
      totalGradeValue = 149;

      const marksRows = [
        { extInt: '045+022', tot: '067', grd: 'B+', pts: '07', val: '21' },
        { extInt: '050+023', tot: '073', grd: 'A',  pts: '08', val: '24' },
        { extInt: '085',     tot: '085', grd: 'A+', pts: '09', val: '18' },
        { extInt: '042+020', tot: '062', grd: 'B',  pts: '06', val: '12' },
        { extInt: '048+022', tot: '070', grd: 'A',  pts: '08', val: '24' },
        { extInt: '088',     tot: '088', grd: 'A+', pts: '09', val: '18' },
        { extInt: '045+021', tot: '066', grd: 'B+', pts: '07', val: '21' },
        { extInt: '042',     tot: '042', grd: 'A',  pts: '08', val: '16' },
      ];

      subjectsHtml = subjectTemplates.map((t, idx) => {
        const m = marksRows[idx] || marksRows[0];
        return `
        <tr>
          <td>${t.name}</td>
          <td>${t.code}</td>
          <td>${t.max}</td>
          <td>${t.min}</td>
          <td>${m.extInt}</td>
          <td>${m.tot}</td>
          <td>${t.credit}</td>
          <td>${m.grd}</td>
          <td>${m.pts}</td>
          <td>${m.val}</td>
        </tr>`;
      }).join('\n');
    }

    const sessionLabel = semNum % 2 === 0 ? 'JUN-2026' : 'DEC-2025';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CH. CHARAN SINGH UNIVERSITY, MEERUT - STATEMENT OF MARKS</title>
</head>
<body>
  <div class="header">
    <h2>CH. CHARAN SINGH UNIVERSITY, MEERUT</h2>
    <h3>STATEMENT OF MARKS</h3>
    <p>NEP EXAMINATION - ${sessionLabel}</p>
  </div>

  <table border="1" cellpadding="5" cellspacing="0" width="100%" class="student-info">
    <tr>
      <td><b>Roll No:</b></td>
      <td>${roll}</td>
      <td><b>Enrolment No:</b></td>
      <td>${enroll}</td>
    </tr>
    <tr>
      <td><b>Candidate Name:</b></td>
      <td>${name}</td>
      <td><b>Course/Class:</b></td>
      <td>${course}</td>
    </tr>
    <tr>
      <td><b>Father's Name:</b></td>
      <td>MR. RAMESH SHARMA</td>
      <td><b>Mother's Name:</b></td>
      <td>MRS. SUNITA SHARMA</td>
    </tr>
    <tr>
      <td><b>Institution Name:</b></td>
      <td colspan="3">(0123) INSTITUTE OF APPLIED COMPUTER STUDIES, MEERUT</td>
    </tr>
    <tr>
      <td><b>Semester:</b></td>
      <td>${sem}</td>
      <td><b>Exam Session:</b></td>
      <td>${sessionLabel}</td>
    </tr>
  </table>

  <br/>

  <table border="1" cellpadding="4" cellspacing="0" width="100%" class="marks-table">
    <thead>
      <tr bgcolor="#E0E0E0">
        <th>COURSE TITLE</th>
        <th>CODE NO.</th>
        <th>MAX</th>
        <th>MIN</th>
        <th>EXT+INT</th>
        <th>TOTAL</th>
        <th>CRD.</th>
        <th>GRD.</th>
        <th>GRD PTS.</th>
        <th>GRD VAL.</th>
      </tr>
    </thead>
    <tbody>
      ${subjectsHtml}
    </tbody>
  </table>

  <br/>

  <table border="1" cellpadding="5" cellspacing="0" width="100%" class="summary-table">
    <tr>
      <td><b>Total Credits:</b> ${totalCredits}</td>
      <td><b>Total Grade Value:</b> ${totalGradeValue}</td>
      <td><b>SGPA:</b> ${sgpa}</td>
      <td><b>CGPA:</b> ${cgpa}</td>
      <td><b>Result:</b> <b>${overallResult}</b></td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
