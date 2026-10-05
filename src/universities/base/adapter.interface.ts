import {
  ExtractedResult,
  MarksheetTypeOption,
  StudentLookupInput,
  ValidationResult
} from './types';

export interface UniversityResultAdapter {
  readonly universityCode: string;
  readonly universityName: string;
  readonly defaultPortalUrl: string;

  /**
   * Returns selectable marksheet types supported by this university.
   */
  getMarksheetTypes(): MarksheetTypeOption[];

  /**
   * Indicates whether this university requires manual CAPTCHA solving.
   * For compliance, automation must always pause when this is true.
   */
  requiresCaptcha(): boolean;

  /**
   * Parses raw HTML/DOM returned from university portal into a structured ExtractedResult.
   * Must gracefully handle missing optional fields and dynamic subject counts.
   */
  extractResult(rawHtml: string, expected: StudentLookupInput): Promise<ExtractedResult>;

  /**
   * Executes the 10-point data validation suite against extracted results.
   */
  validateResult(extracted: ExtractedResult, expected: StudentLookupInput): Promise<ValidationResult>;

  /**
   * Normalizes grades, casing, status codes, and formatting.
   */
  normalizeResult(extracted: ExtractedResult): ExtractedResult;
}
