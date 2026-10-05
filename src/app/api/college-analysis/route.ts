import { NextRequest, NextResponse } from 'next/server';
import { CollegeFormatExporter } from '@/lib/college-format-exporter';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const semester = searchParams.get('semester') || '';
    const course = searchParams.get('course') || '';

    const data = await CollegeFormatExporter.getCollegeAnalysisData(course, semester);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('[API COLLEGE ANALYSIS ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
