import {
  ExtractedResult,
  StudentLookupInput,
  ValidationErrorItem,
  ValidationResult,
  ValidationStatus
} from './types';
import { normalizeSemesterToNumber } from './semester-helper';

/**
 * 10-Point Data Validation Engine for University Result Analyzer
 * Strictly checks for data corruption, mismatched roll numbers, semester mismatches, and parsing anomalies.
 */
export function validateResultData(
  extracted: ExtractedResult,
  expected: StudentLookupInput
): ValidationResult {
  const errors: ValidationErrorItem[] = [];
  const warnings: ValidationErrorItem[] = [];

  // Rule 1: Roll number matches requested roll number
  const cleanExtractedRoll = extracted.rollNumber.trim().toLowerCase();
  const cleanExpectedRoll = expected.rollNumber.trim().toLowerCase();
  if (!cleanExtractedRoll || cleanExtractedRoll !== cleanExpectedRoll) {
    errors.push({
      ruleId: 'RULE_1_ROLL_MISMATCH',
      fieldName: 'rollNumber',
      message: `Extracted roll number '${extracted.rollNumber}' does not match expected '${expected.rollNumber}'.`,
      severity: 'ERROR',
    });
  }

  // Rule 1B: Semester verification (ensures 1st sem is not accepted when 2nd sem is requested)
  if (expected.semester && extracted.semester) {
    const expectedSemNum = normalizeSemesterToNumber(expected.semester);
    const extractedSemNum = normalizeSemesterToNumber(extracted.semester);
    if (expectedSemNum !== null && extractedSemNum !== null && expectedSemNum !== extractedSemNum) {
      errors.push({
        ruleId: 'RULE_1B_SEMESTER_MISMATCH',
        fieldName: 'semester',
        message: `Extracted marksheet semester '${extracted.semester}' (Semester ${extractedSemNum}) does not match expected semester '${expected.semester}' (Semester ${expectedSemNum}).`,
        severity: 'ERROR',
      });
    }
  }

  // Rule 2: Student name is captured (for display and records only - NOT used for identity verification)
  if (!extracted.studentName || extracted.studentName.trim().length < 2) {
    // Provide fallback from expected if missing
    extracted.studentName = expected.name || 'Unknown Student';
  }

  // Rule 3: Subject count is reasonable
  const subjectCount = extracted.subjects ? extracted.subjects.length : 0;
  if (subjectCount === 0) {
    errors.push({
      ruleId: 'RULE_3_NO_SUBJECTS',
      fieldName: 'subjects',
      message: 'Zero subjects found in the extracted result table.',
      severity: 'ERROR',
    });
  } else if (subjectCount < 2 || subjectCount > 20) {
    warnings.push({
      ruleId: 'RULE_3_UNUSUAL_SUBJECT_COUNT',
      fieldName: 'subjects',
      message: `Unusual subject count (${subjectCount}) detected for this semester.`,
      severity: 'WARNING',
    });
  }

  // Rules 4, 5, 7: Subject-level checks
  const seenCodes = new Set<string>();
  let computedTotalMarks = 0;

  if (extracted.subjects) {
    for (let i = 0; i < extracted.subjects.length; i++) {
      const sub = extracted.subjects[i];
      const subLabel = sub.subjectCode || sub.subjectName || `Subject #${i + 1}`;

      // Rule 7: Detect duplicate subjects
      const codeKey = sub.subjectCode ? sub.subjectCode.trim().toUpperCase() : sub.subjectName.trim().toUpperCase();
      if (codeKey) {
        if (seenCodes.has(codeKey)) {
          warnings.push({
            ruleId: 'RULE_7_DUPLICATE_SUBJECT',
            fieldName: 'subjects',
            message: `Duplicate subject '${codeKey}' appeared more than once in the result.`,
            severity: 'WARNING',
          });
        } else {
          seenCodes.add(codeKey);
        }
      }

      // Rule 4: Marks should be numeric
      if (isNaN(sub.totalMarks) || typeof sub.totalMarks !== 'number') {
        errors.push({
          ruleId: 'RULE_4_NON_NUMERIC_MARKS',
          fieldName: `subjects[${i}].totalMarks`,
          message: `Subject '${subLabel}' total marks is not a valid number: ${sub.totalMarks}`,
          severity: 'ERROR',
        });
      }

      // Rule 5: Marks should not exceed maximum marks
      if (sub.maxMarks > 0 && sub.totalMarks > sub.maxMarks) {
        errors.push({
          ruleId: 'RULE_5_MARKS_EXCEED_MAX',
          fieldName: `subjects[${i}].totalMarks`,
          message: `Subject '${subLabel}' marks (${sub.totalMarks}) exceeds maximum marks (${sub.maxMarks}).`,
          severity: 'ERROR',
        });
      }

      // Component checks
      if (sub.internalMarks !== null && sub.internalMarks !== undefined && sub.internalMarks < 0) {
        warnings.push({
          ruleId: 'RULE_4_NEGATIVE_MARKS',
          fieldName: `subjects[${i}].internalMarks`,
          message: `Subject '${subLabel}' has negative internal marks: ${sub.internalMarks}`,
          severity: 'WARNING',
        });
      }
      if (sub.externalMarks !== null && sub.externalMarks !== undefined && sub.externalMarks < 0) {
        warnings.push({
          ruleId: 'RULE_4_NEGATIVE_MARKS',
          fieldName: `subjects[${i}].externalMarks`,
          message: `Subject '${subLabel}' has negative external marks: ${sub.externalMarks}`,
          severity: 'WARNING',
        });
      }

      // Validate letter grade if present
      if (sub.grade) {
        const validGradeRegex = /^(O|A\+|A|B\+|B\-|B|C|P|F|PASS|FAIL|ABSENT)$/i;
        if (!validGradeRegex.test(sub.grade.trim())) {
          warnings.push({
            ruleId: 'RULE_8_UNUSUAL_GRADE_FORMAT',
            fieldName: `subjects[${i}].grade`,
            message: `Subject '${subLabel}' has unrecognized grade format: '${sub.grade}'.`,
            severity: 'WARNING',
          });
        }
      }

      if (!isNaN(sub.totalMarks) && sub.totalMarks >= 0) {
        computedTotalMarks += sub.totalMarks;
      }
    }
  }

  // Rule 6: Total marks comparison
  if (extracted.totalMarks > 0 && computedTotalMarks > 0) {
    const diff = Math.abs(extracted.totalMarks - computedTotalMarks);
    // Allow small margin for grace marks or practical omissions if specified
    if (diff > 5) {
      warnings.push({
        ruleId: 'RULE_6_TOTAL_SUM_MISMATCH',
        fieldName: 'totalMarks',
        message: `Extracted total marks (${extracted.totalMarks}) deviates from subject sum (${computedTotalMarks}) by ${diff}.`,
        severity: 'WARNING',
      });
    }
  }

  // Rule 8: Missing subjects (subject codes empty or generic placeholder)
  const hasEmptySubjectCode = extracted.subjects?.some(s => !s.subjectCode || s.subjectCode.trim() === '');
  if (hasEmptySubjectCode) {
    warnings.push({
      ruleId: 'RULE_8_EMPTY_SUBJECT_CODES',
      fieldName: 'subjects',
      message: 'One or more subjects have empty paper codes.',
      severity: 'WARNING',
    });
  }

  // Rule 9: Detect unexpected result structure
  if (extracted.maxMarks <= 0) {
    warnings.push({
      ruleId: 'RULE_9_ZERO_MAX_MARKS',
      fieldName: 'maxMarks',
      message: `Maximum marks for result is 0 or negative (${extracted.maxMarks}).`,
      severity: 'WARNING',
    });
  }

  // Rule 10: Determine overall status
  let status: ValidationStatus = 'VALID';
  if (errors.length > 0) {
    status = 'FAILED_TO_PARSE';
  } else if (warnings.length > 0) {
    status = 'WARNING';
  }

  return {
    isValid: errors.length === 0,
    status,
    errors,
    warnings,
  };
}
