export interface SubjectStats {
  subjectCode: string;
  subjectName: string;
  totalStudents: number;
  appeared: number;
  passed: number;
  failed: number;
  passPercentage: number;
  averageMarks: number;
  highestMarks: number;
  lowestMarks: number;
  medianMarks: number;
  standardDeviation: number;
}

export interface CohortOverallStats {
  totalStudents: number;
  resultsCollected: number;
  pendingCount: number;
  passedCount: number;
  failedCount: number;
  backCount: number;
  passPercentage: number;
  averageMarks: number;
  averageSgpa: number;
  gradeDistribution: Record<string, number>;
  sgpaDistribution: Array<{ range: string; count: number }>;
  marksDistribution: Array<{ range: string; count: number }>;
}

export class StatsEngine {
  /**
   * Computes deep statistical metrics for a single subject across all student results
   */
  public static computeSubjectStats(
    subjectCode: string,
    subjectName: string,
    marksList: Array<{ marks: number; status: string; isAbsent?: boolean }>
  ): SubjectStats {
    const totalStudents = marksList.length;
    const appearedList = marksList.filter(m => !m.isAbsent && m.status !== 'ABSENT');
    const appeared = appearedList.length;

    if (appeared === 0) {
      return {
        subjectCode,
        subjectName,
        totalStudents,
        appeared: 0,
        passed: 0,
        failed: 0,
        passPercentage: 0,
        averageMarks: 0,
        highestMarks: 0,
        lowestMarks: 0,
        medianMarks: 0,
        standardDeviation: 0,
      };
    }

    const marks = appearedList.map(m => m.marks).sort((a, b) => a - b);
    const passed = appearedList.filter(m => m.status === 'PASS').length;
    const failed = appeared - passed;
    const passPercentage = parseFloat(((passed / appeared) * 100).toFixed(2));

    const sum = marks.reduce((acc, curr) => acc + curr, 0);
    const averageMarks = parseFloat((sum / appeared).toFixed(2));
    const highestMarks = marks[marks.length - 1];
    const lowestMarks = marks[0];

    // Median
    const mid = Math.floor(appeared / 2);
    const medianMarks =
      appeared % 2 !== 0
        ? marks[mid]
        : parseFloat(((marks[mid - 1] + marks[mid]) / 2).toFixed(2));

    // Standard Deviation
    const squareDiffs = marks.map(value => {
      const diff = value - averageMarks;
      return diff * diff;
    });
    const avgSquareDiff = squareDiffs.reduce((acc, curr) => acc + curr, 0) / appeared;
    const standardDeviation = parseFloat(Math.sqrt(avgSquareDiff).toFixed(2));

    return {
      subjectCode,
      subjectName,
      totalStudents,
      appeared,
      passed,
      failed,
      passPercentage,
      averageMarks,
      highestMarks,
      lowestMarks,
      medianMarks,
      standardDeviation,
    };
  }

  /**
   * Computes cohort-wide statistical metrics and distribution curves
   */
  public static computeCohortStats(
    totalStudents: number,
    results: Array<{
      resultStatus: string;
      totalMarks: number;
      maxMarks: number;
      percentage: number;
      sgpa?: number | null;
      subjects: Array<{ grade?: string | null; status: string }>;
    }>
  ): CohortOverallStats {
    const resultsCollected = results.length;
    const pendingCount = Math.max(0, totalStudents - resultsCollected);

    let passedCount = 0;
    let failedCount = 0;
    let backCount = 0;
    let totalMarksSum = 0;
    let sgpaSum = 0;
    let sgpaValidCount = 0;

    const gradeDistribution: Record<string, number> = {
      'O (Outstanding)': 0,
      'A+ (Excellent)': 0,
      'A (Very Good)': 0,
      'B+ (Good)': 0,
      'B (Above Average)': 0,
      'C (Average)': 0,
      'P (Pass)': 0,
      'F (Fail)': 0,
    };

    const sgpaBands = [
      { range: '< 5.0', count: 0 },
      { range: '5.0 - 5.9', count: 0 },
      { range: '6.0 - 6.9', count: 0 },
      { range: '7.0 - 7.9', count: 0 },
      { range: '8.0 - 8.9', count: 0 },
      { range: '9.0 - 10.0', count: 0 },
    ];

    const marksBands = [
      { range: '< 40%', count: 0 },
      { range: '40% - 49%', count: 0 },
      { range: '50% - 59%', count: 0 },
      { range: '60% - 69%', count: 0 },
      { range: '70% - 79%', count: 0 },
      { range: '80% - 100%', count: 0 },
    ];

    for (const r of results) {
      if (r.resultStatus === 'PASSED' || r.resultStatus === 'PROMOTED') passedCount++;
      else if (r.resultStatus === 'BACK') backCount++;
      else failedCount++;

      totalMarksSum += r.percentage;

      if (r.sgpa !== null && r.sgpa !== undefined && r.sgpa > 0) {
        sgpaSum += r.sgpa;
        sgpaValidCount++;

        if (r.sgpa < 5.0) sgpaBands[0].count++;
        else if (r.sgpa < 6.0) sgpaBands[1].count++;
        else if (r.sgpa < 7.0) sgpaBands[2].count++;
        else if (r.sgpa < 8.0) sgpaBands[3].count++;
        else if (r.sgpa < 9.0) sgpaBands[4].count++;
        else sgpaBands[5].count++;
      }

      // Percentage distribution
      if (r.percentage < 40) marksBands[0].count++;
      else if (r.percentage < 50) marksBands[1].count++;
      else if (r.percentage < 60) marksBands[2].count++;
      else if (r.percentage < 70) marksBands[3].count++;
      else if (r.percentage < 80) marksBands[4].count++;
      else marksBands[5].count++;

      // Subject grades
      for (const s of r.subjects) {
        const g = (s.grade || '').toUpperCase();
        if (g === 'O') gradeDistribution['O (Outstanding)']++;
        else if (g === 'A+') gradeDistribution['A+ (Excellent)']++;
        else if (g === 'A') gradeDistribution['A (Very Good)']++;
        else if (g === 'B+') gradeDistribution['B+ (Good)']++;
        else if (g === 'B') gradeDistribution['B (Above Average)']++;
        else if (g === 'C') gradeDistribution['C (Average)']++;
        else if (g === 'P') gradeDistribution['P (Pass)']++;
        else if (g === 'F' || s.status === 'FAIL' || s.status === 'BACK') gradeDistribution['F (Fail)']++;
      }
    }

    const passPercentage =
      resultsCollected > 0
        ? parseFloat(((passedCount / resultsCollected) * 100).toFixed(2))
        : 0;

    const averageMarks =
      resultsCollected > 0
        ? parseFloat((totalMarksSum / resultsCollected).toFixed(2))
        : 0;

    const averageSgpa =
      sgpaValidCount > 0
        ? parseFloat((sgpaSum / sgpaValidCount).toFixed(2))
        : 0;

    return {
      totalStudents,
      resultsCollected,
      pendingCount,
      passedCount,
      failedCount,
      backCount,
      passPercentage,
      averageMarks,
      averageSgpa,
      gradeDistribution,
      sgpaDistribution: sgpaBands,
      marksDistribution: marksBands,
    };
  }
}
