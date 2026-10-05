import { NextRequest, NextResponse } from 'next/server';
import { CollegeFormatExporter } from '@/lib/college-format-exporter';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const semester = searchParams.get('semester') || '';
    const course = searchParams.get('course') || '';

    const { fileName, buffer } = await CollegeFormatExporter.saveCollegeFormatToFile(course, semester);

    // Audit the college format export
    await prisma.exportLog.create({
      data: {
        sessionName: `SDCMT College Analysis Export (${course || 'BCA'} Sem ${semester || 'All'})`,
        format: 'XLSX',
        recordCount: 1,
        generatedBy: 'College Coordinator / Exam Dept',
      },
    }).catch(() => {});

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('[API EXPORT COLLEGE FORMAT ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
