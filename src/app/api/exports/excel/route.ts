import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ExcelExporter, ExportStudentRow } from '@/lib/excel-exporter';
import { StatsEngine, SubjectStats } from '@/lib/stats-engine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const semester = searchParams.get('semester') || '';
    const course = searchParams.get('course') || '';

    const results = await prisma.result.findMany({
      where: {
        ...(semester ? { semester } : {}),
        student: course ? { course } : {},
      },
      include: {
        student: true,
        subjects: { orderBy: { subjectCode: 'asc' } },
      },
      orderBy: { student: { rollNumber: 'asc' } },
    });

    const totalStudents = await prisma.student.count({
      where: {
        ...(semester ? { semester } : {}),
        ...(course ? { course } : {}),
      },
    });

    // Extract subjects map
    const subjectMap = new Map<string, string>();
    for (const r of results) {
      for (const s of r.subjects) {
        if (!subjectMap.has(s.subjectCode)) {
          subjectMap.set(s.subjectCode, s.subjectName);
        }
      }
    }
    const uniqueSubjects = Array.from(subjectMap.entries()).map(([code, name]) => ({ code, name }));

    // Prepare rows for export
    const exportStudents: ExportStudentRow[] = results.map(r => {
      const marksMap: Record<string, number> = {};
      const backList: string[] = [];

      for (const s of r.subjects) {
        marksMap[s.subjectCode] = s.totalMarks;
        if (s.status === 'FAIL' || s.status === 'BACK') {
          backList.push(s.subjectCode);
        }
      }

      return {
        rollNumber: r.student.rollNumber,
        name: r.student.name,
        enrollmentNumber: r.student.enrollmentNumber,
        course: r.student.course,
        semester: r.semester,
        totalMarks: r.totalMarks,
        maxMarks: r.maxMarks,
        percentage: r.percentage,
        sgpa: r.sgpa,
        resultStatus: r.resultStatus,
        backSubjects: backList.join(', '),
        subjects: marksMap,
      };
    });

    // Subject statistics
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
      subjectStatsList.push(StatsEngine.computeSubjectStats(code, group.name, group.marks));
    }

    // Cohort stats
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

    // Generate 5-sheet workbook
    const buffer = ExcelExporter.generateComprehensiveWorkbook(
      exportStudents,
      subjectStatsList,
      cohortStats,
      uniqueSubjects
    );

    // Audit export
    await prisma.exportLog.create({
      data: {
        sessionName: `Comprehensive Results Export (${results.length} students)`,
        format: 'XLSX',
        recordCount: results.length,
        generatedBy: 'Teacher / Exam Coordinator',
      },
    });

    const filename = `University_Results_${course || 'CCSU'}_Sem${semester || 'All'}_${Date.now()}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
