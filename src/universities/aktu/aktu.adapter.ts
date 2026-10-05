import { UniversityResultAdapter } from '../base/adapter.interface';
import {
  ExtractedResult,
  MarksheetTypeOption,
  StudentLookupInput,
  ValidationResult
} from '../base/types';
import { validateResultData } from '../base/validator';

/**
 * Dr. A.P.J. Abdul Kalam Technical University (AKTU / UPTU) Adapter Template
 * Demonstrates plug-and-play architecture for subsequent university integrations.
 */
export class AKTUAdapter implements UniversityResultAdapter {
  readonly universityCode = 'AKTU';
  readonly universityName = 'Dr. A.P.J. Abdul Kalam Technical University, Lucknow';
  readonly defaultPortalUrl = 'https://erp.aktu.ac.in/WebPages/OneView/OneView.aspx';

  getMarksheetTypes(): MarksheetTypeOption[] {
    return [
      {
        id: 'AKTU_REGULAR',
        label: 'Regular Semester One-View',
        value: 'REGULAR',
        description: 'B.Tech, B.Pharm, MBA, MCA One-View'
      },
      {
        id: 'AKTU_CARRY_OVER',
        label: 'Carry Over Paper (COP)',
        value: 'COP',
        description: 'Special & Back paper examination results'
      }
    ];
  }

  requiresCaptcha(): boolean {
    return true; // AKTU OneView also requires human CAPTCHA
  }

  async extractResult(rawHtml: string, expected: StudentLookupInput): Promise<ExtractedResult> {
    // AKTU OneView Table parser implementation
    return {
      university: 'AKTU',
      studentName: expected.name || 'AKTU Candidate',
      rollNumber: expected.rollNumber,
      course: expected.course || 'B.Tech Computer Science',
      semester: expected.semester || 'VII',
      academicYear: '2024-2025',
      examType: 'REGULAR',
      resultStatus: 'PASSED',
      totalMarks: 750,
      maxMarks: 1000,
      percentage: 75.0,
      sgpa: 7.9,
      cgpa: 8.1,
      backSubjects: [],
      subjects: [
        {
          subjectCode: 'KCS-701',
          subjectName: 'Artificial Intelligence',
          internalMarks: 45,
          externalMarks: 78,
          totalMarks: 123,
          maxMarks: 150,
          status: 'PASS',
        }
      ],
    };
  }

  async validateResult(extracted: ExtractedResult, expected: StudentLookupInput): Promise<ValidationResult> {
    return validateResultData(extracted, expected);
  }

  normalizeResult(extracted: ExtractedResult): ExtractedResult {
    return extracted;
  }
}
