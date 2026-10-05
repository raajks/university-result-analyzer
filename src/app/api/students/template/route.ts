import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  const sampleData = [
    {
      'Roll Number': '210052010001',
      'Student Name': 'Aarav Sharma',
      'Enrollment No': 'M21098401',
      'Course': 'B.C.A.',
      'Semester': 'IV',
      'Section': 'A',
      'Batch': '2021-2024',
    },
    {
      'Roll Number': '210052010002',
      'Student Name': 'Ananya Gupta',
      'Enrollment No': 'M21098402',
      'Course': 'B.C.A.',
      'Semester': 'IV',
      'Section': 'A',
      'Batch': '2021-2024',
    },
    {
      'Roll Number': '210052010003',
      'Student Name': 'Rohan Verma',
      'Enrollment No': 'M21098403',
      'Course': 'B.C.A.',
      'Semester': 'IV',
      'Section': 'B',
      'Batch': '2021-2024',
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, 'Student Roster');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="students_import_template.xlsx"',
    },
  });
}
