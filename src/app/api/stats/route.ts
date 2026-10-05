import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { StatsEngine, SubjectStats } from '@/lib/stats-engine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const course = searchParams.get('course') || '';
    const semester = searchParams.get('semester') || '';

    // Total registered students
    const totalStudents = await prisma.student.count({
      where: {
        ...(course ? { course } : {}),
        ...(semester ? { semester } : {}),
      },
    });

    // All collected results
    const results = await prisma.result.findMany({
      where: {
        ...(semester ? { semester } : {}),
        student: course ? { course } : {},
      },
      include: {
        student: true,
        subjects: true,
      },
    });

    // 1. Overall Cohort Statistics
    const cohortStats = StatsEngine.computeCohortStats(
      totalStudents,
      results.map(r => ({
        resultStatus: r.resultStatus,
        totalMarks: r.totalMarks,
        maxMarks: r.maxMarks,
        percentage: r.percentage,
        sgpa: r.sgpa,
        subjects: r.subjects.map(s => ({ grade: s.grade, status: s.status })),
      }))
    );

    // 2. Subject-wise Deep Statistics
    const subjectGroups = new Map<string, { name: string; marks: Array<{ marks: number; status: string }> }>();
    for (const r of results) {
      for (const s of r.subjects) {
        if (!subjectGroups.has(s.subjectCode)) {
          subjectGroups.set(s.subjectCode, { name: s.subjectName, marks: [] });
        }
        subjectGroups.get(s.subjectCode)!.marks.push({
          marks: s.totalMarks,
          status: s.status,
        });
      }
    }

    const subjectStatsList: SubjectStats[] = [];
    for (const [code, group] of subjectGroups.entries()) {
      const stats = StatsEngine.computeSubjectStats(code, group.name, group.marks);
      subjectStatsList.push(stats);
    }

    // Chart 1: Pass vs Fail Distribution
    const passFailChart = [
      { name: 'Passed', value: cohortStats.passedCount, fill: '#10b981' },
      { name: 'Back Paper', value: cohortStats.backCount, fill: '#f59e0b' },
      { name: 'Failed', value: cohortStats.failedCount, fill: '#ef4444' },
    ].filter(item => item.value > 0);

    // Chart 2: Subject-wise Pass Percentage
    const subjectPassChart = subjectStatsList.map(s => ({
      subject: s.subjectCode,
      name: s.subjectName,
      passPercentage: s.passPercentage,
    }));

    // Chart 3: Subject-wise Average Marks
    const subjectAvgMarksChart = subjectStatsList.map(s => ({
      subject: s.subjectCode,
      name: s.subjectName,
      averageMarks: s.averageMarks,
      highestMarks: s.highestMarks,
      lowestMarks: s.lowestMarks,
    }));

    // Chart 4: Grade Distribution Chart Data
    const gradeChart = Object.entries(cohortStats.gradeDistribution).map(([grade, count]) => ({
      grade,
      count,
    }));

    return NextResponse.json({
      success: true,
      cohort: cohortStats,
      subjectStats: subjectStatsList,
      charts: {
        passFailChart,
        subjectPassChart,
        subjectAvgMarksChart,
        gradeChart,
        sgpaChart: cohortStats.sgpaDistribution,
        marksChart: cohortStats.marksDistribution,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
