import { UniversityResultAdapter } from '../base/adapter.interface';
import {
  ExtractedResult,
  MarksheetTypeOption,
  StudentLookupInput,
  ValidationResult
} from '../base/types';
import { validateResultData } from '../base/validator';
import { CCSU_CONFIG } from './ccsu.config';
import { CCSUParser } from './ccsu.parser';

export class CCSUAdapter implements UniversityResultAdapter {
  readonly universityCode = 'CCSU';
  readonly universityName = CCSU_CONFIG.name;
  readonly defaultPortalUrl = CCSU_CONFIG.portalUrl;

  private parser = new CCSUParser();

  getMarksheetTypes(): MarksheetTypeOption[] {
    return CCSU_CONFIG.marksheetTypes;
  }

  /**
   * CCSU result portal strictly requires manual human CAPTCHA solving.
   */
  requiresCaptcha(): boolean {
    return true;
  }

  /**
   * Extracts structured result from the HTML marksheet returned by CCSU.
   */
  async extractResult(rawHtml: string, expected: StudentLookupInput): Promise<ExtractedResult> {
    const parsed = this.parser.parseHtml(rawHtml, expected);
    return this.normalizeResult(parsed);
  }

  /**
   * Runs the comprehensive 10-point data validation engine.
   */
  async validateResult(extracted: ExtractedResult, expected: StudentLookupInput): Promise<ValidationResult> {
    return validateResultData(extracted, expected);
  }

  /**
   * Cleans and normalizes strings, grades, and status codes.
   */
  normalizeResult(extracted: ExtractedResult): ExtractedResult {
    const normalized = { ...extracted };

    // Standardize student name casing
    normalized.studentName = this.toTitleCase(normalized.studentName);

    // Standardize subjects
    normalized.subjects = normalized.subjects.map(s => ({
      ...s,
      subjectCode: s.subjectCode.trim().toUpperCase(),
      subjectName: this.toTitleCase(s.subjectName),
      status: s.status,
    }));

    return normalized;
  }

  private toTitleCase(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
