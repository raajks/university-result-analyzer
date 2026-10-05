import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ExcelExporter } from '@/lib/excel-exporter';

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

    const records = results.map((r, idx) => ({
      'S.No': idx + 1,
      'Roll Number': r.student.rollNumber,
      'Student Name': r.student.name,
      'Course': r.student.course,
      'Semester': r.semester,
      'Total Marks': r.totalMarks,
      'Max Marks': r.maxMarks,
      'Percentage': `${r.percentage.toFixed(2)}%`,
      'SGPA': r.sgpa ?? 'N/A',
      'Result Status': r.resultStatus,
    }));

    const csvContent = ExcelExporter.generateCsv(records);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="student_results_${Date.now()}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
