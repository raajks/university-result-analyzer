import { NextRequest, NextResponse } from 'next/server';
import { ExcelImporter, ColumnMapping } from '@/lib/excel-importer';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const mappingRaw = formData.get('mapping') as string | null;
    const isDryRun = formData.get('dryRun') === 'true';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { headers, rows } = ExcelImporter.parseFile(buffer);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'File is empty or could not be read.' }, { status: 400 });
    }

    let mapping: ColumnMapping;
    if (mappingRaw) {
      mapping = JSON.parse(mappingRaw);
    } else {
      const guessed = ExcelImporter.guessColumnMapping(headers);
      mapping = {
        rollNumber: guessed.rollNumber || headers[0] || '',
        name: guessed.name || headers[1] || '',
        enrollmentNumber: guessed.enrollmentNumber,
        course: guessed.course,
        semester: guessed.semester,
        section: guessed.section,
        batch: guessed.batch,
      };
    }

    const report = ExcelImporter.validateRecords(rows, mapping);

    // If dryRun, just return report with suggested mappings and preview rows
    if (isDryRun || !mappingRaw) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        headers,
        totalRows: report.totalRows,
        validCount: report.validRows.length,
        invalidCount: report.invalidRows.length,
        duplicateRollNumbers: report.duplicateRollNumbers,
        suggestedMapping: report.suggestedMapping,
        previewRows: rows.slice(0, 5),
        sampleValid: report.validRows.slice(0, 5),
        sampleInvalid: report.invalidRows.slice(0, 5),
      });
    }

    // Actual commit to database
    let insertedCount = 0;
    let updatedCount = 0;

    for (const record of report.validRows) {
      const existing = await prisma.student.findUnique({
        where: { rollNumber: record.rollNumber },
      });

      if (existing) {
        await prisma.student.update({
          where: { rollNumber: record.rollNumber },
          data: {
            name: record.name,
            enrollmentNumber: record.enrollmentNumber || existing.enrollmentNumber,
            course: record.course || existing.course,
            semester: record.semester || existing.semester,
            section: record.section || existing.section,
            batch: record.batch || existing.batch,
          },
        });
        updatedCount++;
      } else {
        await prisma.student.create({
          data: {
            rollNumber: record.rollNumber,
            name: record.name,
            enrollmentNumber: record.enrollmentNumber,
            course: record.course,
            semester: record.semester,
            section: record.section,
            batch: record.batch,
          },
        });
        insertedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      insertedCount,
      updatedCount,
      invalidCount: report.invalidRows.length,
      invalidRows: report.invalidRows.slice(0, 10),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
