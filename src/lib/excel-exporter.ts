import * as XLSX from 'xlsx';
import { SubjectStats, CohortOverallStats } from './stats-engine';

export interface ExportStudentRow {
  rollNumber: string;
  name: string;
  enrollmentNumber?: string | null;
  course: string;
  semester: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  sgpa?: number | null;
  resultStatus: string;
  backSubjects: string;
  subjects: Record<string, number>; // code -> marks
}

export class ExcelExporter {
  /**
   * Generates a 5-sheet workbook with Student Summary, Subject Marks Matrix,
   * Back Students, Subject Statistical Analysis, and Overall Summary.
   */
  public static generateComprehensiveWorkbook(
    students: ExportStudentRow[],
    subjectStats: SubjectStats[],
    cohortStats: CohortOverallStats,
    uniqueSubjectCodes: Array<{ code: string; name: string }>
  ): Buffer {
    const wb = XLSX.utils.book_new();

    // -------------------------------------------------------------
    // SHEET 1: Student Summary
    // -------------------------------------------------------------
    const summaryData = students.map((s, idx) => ({
      'S.No': idx + 1,
      'Roll Number': s.rollNumber,
      'Student Name': s.name,
      'Enrollment No': s.enrollmentNumber || 'N/A',
      'Course': s.course,
      'Semester': s.semester,
      'Total Marks': s.totalMarks,
      'Max Marks': s.maxMarks,
      'Percentage': `${s.percentage.toFixed(2)}%`,
      'SGPA': s.sgpa ?? 'N/A',
      'Result Status': s.resultStatus,
      'Back Subjects': s.backSubjects || 'None',
    }));
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Student Summary');

    // -------------------------------------------------------------
    // SHEET 2: Subject-wise Marks (Dynamic Matrix)
    // -------------------------------------------------------------
    const matrixData = students.map((s, idx) => {
      const row: Record<string, any> = {
        'S.No': idx + 1,
        'Roll Number': s.rollNumber,
        'Student Name': s.name,
      };

      for (const sub of uniqueSubjectCodes) {
        row[`${sub.code} (${sub.name})`] = s.subjects[sub.code] ?? 'N/A';
      }

      row['Total'] = s.totalMarks;
      row['Result'] = s.resultStatus;
      return row;
    });
    const wsMatrix = XLSX.utils.json_to_sheet(matrixData);
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Subject-wise Marks');

    // -------------------------------------------------------------
    // SHEET 3: Back Students
    // -------------------------------------------------------------
    const backStudents = students.filter(
      s => s.resultStatus === 'BACK' || s.resultStatus === 'FAILED' || (s.backSubjects && s.backSubjects.length > 0)
    );
    const backData = backStudents.map((s, idx) => ({
      'S.No': idx + 1,
      'Roll Number': s.rollNumber,
      'Student Name': s.name,
      'Course': s.course,
      'Semester': s.semester,
      'Result Status': s.resultStatus,
      'Failed / Back Papers': s.backSubjects || 'N/A',
      'Total Score': `${s.totalMarks} / ${s.maxMarks}`,
    }));
    const wsBack = XLSX.utils.json_to_sheet(backData.length > 0 ? backData : [{ 'Status': 'No students with back papers!' }]);
    XLSX.utils.book_append_sheet(wb, wsBack, 'Back Students');

    // -------------------------------------------------------------
    // SHEET 4: Subject Analysis
    // -------------------------------------------------------------
    const analysisData = subjectStats.map((sub, idx) => ({
      'S.No': idx + 1,
      'Subject Code': sub.subjectCode,
      'Subject Name': sub.subjectName,
      'Total Students': sub.totalStudents,
      'Appeared': sub.appeared,
      'Passed': sub.passed,
      'Failed': sub.failed,
      'Pass %': `${sub.passPercentage.toFixed(2)}%`,
      'Average Marks': sub.averageMarks,
      'Highest Marks': sub.highestMarks,
      'Lowest Marks': sub.lowestMarks,
      'Median': sub.medianMarks,
      'Std Deviation': sub.standardDeviation,
    }));
    const wsAnalysis = XLSX.utils.json_to_sheet(analysisData);
    XLSX.utils.book_append_sheet(wb, wsAnalysis, 'Subject Analysis');

    // -------------------------------------------------------------
    // SHEET 5: Overall Summary
    // -------------------------------------------------------------
    const overallData = [
      { 'Metric': 'Total Students Registered', 'Value': cohortStats.totalStudents },
      { 'Metric': 'Results Successfully Collected', 'Value': cohortStats.resultsCollected },
      { 'Metric': 'Pending Results', 'Value': cohortStats.pendingCount },
      { 'Metric': 'Passed Count', 'Value': cohortStats.passedCount },
      { 'Metric': 'Back Paper Count', 'Value': cohortStats.backCount },
      { 'Metric': 'Failed Count', 'Value': cohortStats.failedCount },
      { 'Metric': 'Overall Pass Percentage', 'Value': `${cohortStats.passPercentage}%` },
      { 'Metric': 'Cohort Average Percentage', 'Value': `${cohortStats.averageMarks}%` },
      { 'Metric': 'Average SGPA', 'Value': cohortStats.averageSgpa },
      { 'Metric': 'Generated At', 'Value': new Date().toLocaleString() },
      { 'Metric': 'System', 'Value': 'University Result Analyzer (CCSU Module)' },
    ];
    const wsOverall = XLSX.utils.json_to_sheet(overallData);
    XLSX.utils.book_append_sheet(wb, wsOverall, 'Overall Summary');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer as Buffer;
  }

  /**
   * Generates CSV format string from array of records
   */
  public static generateCsv(records: Array<Record<string, any>>): string {
    const ws = XLSX.utils.json_to_sheet(records);
    return XLSX.utils.sheet_to_csv(ws);
  }
}
