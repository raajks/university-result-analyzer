import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const semester = searchParams.get('semester') || '';
    const course = searchParams.get('course') || '';
    const status = searchParams.get('status') || '';

    const where: any = {};
    if (semester) where.semester = semester;
    if (status) where.resultStatus = status;
    if (search) {
      where.student = {
        OR: [
          { rollNumber: { contains: search } },
          { name: { contains: search } },
          { enrollmentNumber: { contains: search } },
        ],
      };
    }
    if (course) {
      where.student = { ...(where.student || {}), course };
    }

    const results = await prisma.result.findMany({
      where,
      include: {
        student: true,
        university: true,
        subjects: {
          orderBy: { subjectCode: 'asc' },
        },
        validationErrors: true,
      },
      orderBy: { student: { rollNumber: 'asc' } },
    });

    // Dynamically discover all unique subjects across the results
    const subjectMap = new Map<string, string>();
    for (const r of results) {
      for (const s of r.subjects) {
        if (!subjectMap.has(s.subjectCode)) {
          subjectMap.set(s.subjectCode, s.subjectName);
        }
      }
    }

    const uniqueSubjects = Array.from(subjectMap.entries()).map(([code, name]) => ({
      code,
      name,
    }));

    // Format rows for dynamic table
    const formattedRows = results.map((r, idx) => {
      const subjectMarks: Record<string, any> = {};
      const backSubjects: string[] = [];

      for (const s of r.subjects) {
        subjectMarks[s.subjectCode] = {
          marks: s.totalMarks,
          maxMarks: s.maxMarks,
          grade: s.grade,
          status: s.status,
          internal: s.internalMarks,
          external: s.externalMarks,
        };
        if (s.status === 'FAIL' || s.status === 'BACK') {
          backSubjects.push(s.subjectCode);
        }
      }

      let source = 'MOCK';
      try {
        if (r.rawDataJson) {
          const parsed = JSON.parse(r.rawDataJson);
          if (parsed.source === 'CCSU_REAL') source = 'CCSU REAL';
          else if (parsed.source) source = parsed.source;
        }
      } catch (_) {}

      return {
        id: r.id,
        sNo: idx + 1,
        source,
        studentId: r.student.id,
        rollNumber: r.student.rollNumber,
        studentName: r.student.name,
        enrollmentNumber: r.student.enrollmentNumber,
        course: r.student.course,
        semester: r.semester,
        totalMarks: r.totalMarks,
        maxMarks: r.maxMarks,
        percentage: r.percentage,
        sgpa: r.sgpa,
        cgpa: r.cgpa,
        resultStatus: r.resultStatus,
        validationStatus: r.validationStatus,
        backSubjects,
        subjects: subjectMarks,
        validationWarningsCount: r.validationErrors.length,
        collectedAt: r.collectedAt,
      };
    });

    return NextResponse.json({
      success: true,
      columns: uniqueSubjects,
      results: formattedRows,
      totalCount: formattedRows.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
