'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import {
  Upload,
  Download,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  X,
} from 'lucide-react';

interface StudentResult {
  id: string;
  resultStatus: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
}

interface StudentItem {
  id: string;
  rollNumber: string;
  name: string;
  enrollmentNumber?: string | null;
  course: string;
  semester: string;
  section?: string | null;
  batch?: string | null;
  results?: StudentResult[];
}

interface SampleRow {
  rollNumber: string;
  name: string;
  course: string;
  semester: string;
  enrollmentNumber?: string;
  section?: string;
}

interface ImportPreviewReport {
  success: boolean;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateRollNumbers?: string[];
  headers: string[];
  suggestedMapping: Record<string, string>;
  sampleValid: SampleRow[];
  validationErrors?: Array<{ row: number; reason: string }>;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

  // Import Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewReport, setPreviewReport] = useState<ImportPreviewReport | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Manual Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    rollNumber: '',
    name: '',
    enrollmentNumber: '',
    course: 'B.C.A.',
    semester: 'IV',
    section: 'A',
    batch: '2021-2024',
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL('/api/students', window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (courseFilter) url.searchParams.set('course', courseFilter);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setStudents(json.students);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, courseFilter]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const url = new URL('/api/students', window.location.origin);
        if (search) url.searchParams.set('search', search);
        if (courseFilter) url.searchParams.set('course', courseFilter);

        const res = await fetch(url.toString());
        const json = await res.json();
        if (active && json.success) {
          setStudents(json.students);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [search, courseFilter]);

  // Handle file select & dry-run validation preview
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setUploading(true);
    setImportMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dryRun', 'true');

    try {
      const res = await fetch('/api/students/import', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setPreviewReport(json);
        setMapping(json.suggestedMapping || {});
      } else {
        alert(json.error || 'Failed to inspect file.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  // Submit actual import with mapped columns
  const handleCommitImport = async () => {
    if (!uploadFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('dryRun', 'false');

    try {
      const res = await fetch('/api/students/import', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setImportMessage(`Successfully imported ${json.insertedCount} new, updated ${json.updatedCount} students.`);
        setIsUploadOpen(false);
        setUploadFile(null);
        setPreviewReport(null);
        fetchStudents();
      } else {
        alert(json.error);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  // Delete individual student
  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete student "${name}"?`)) return;

    try {
      const res = await fetch(`/api/students?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setImportMessage(`Student "${name}" deleted.`);
        fetchStudents();
      } else {
        alert(json.error);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Clear all students (for fresh import)
  const handleClearAllStudents = async () => {
    if (!confirm('Warning: Are you sure you want to delete ALL students and results? This will wipe the roster completely so you can import your fresh list.')) return;

    try {
      const res = await fetch('/api/students?scope=all', { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setImportMessage('All students and results cleared. Roster is clean for new import.');
        fetchStudents();
      } else {
        alert(json.error);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Handle manual student creation
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.rollNumber || !newStudent.name) return;

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent),
      });
      const json = await res.json();
      if (json.success) {
        setIsAddOpen(false);
        setNewStudent({
          rollNumber: '',
          name: '',
          enrollmentNumber: '',
          course: 'B.C.A.',
          semester: 'IV',
          section: 'A',
          batch: '2021-2024',
        });
        fetchStudents();
      } else {
        alert(json.error);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Student Master Roster"
        subtitle="Manage student enrollments, upload CSV/Excel files, and validate roll numbers."
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
        {importMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{importMessage}</span>
            </div>
            <button onClick={() => setImportMessage(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by roll no or name..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={courseFilter}
              onChange={e => setCourseFilter(e.target.value)}
              className="py-2 px-3 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Courses</option>
              <option value="B.C.A.">B.C.A.</option>
              <option value="B.Sc.">B.Sc.</option>
              <option value="B.Tech">B.Tech</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <a
              href="/api/students/template"
              download
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Download standard Excel import template"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Template
            </a>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Excel/CSV
            </button>

            <button
              onClick={() => setIsAddOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Student
            </button>

            {students.length > 0 && (
              <button
                onClick={handleClearAllStudents}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-medium hover:bg-rose-100 transition-colors"
                title="Wipe current roster to start completely clean"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Student Master Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Enrolled Students ({students.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              CCSU Affiliated Roster
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Enrollment No</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Result Status</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-3 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Loading students...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No students found. Upload your Excel/CSV file or click &quot;Add Student&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  students.map((st, idx) => {
                    const result = st.results?.[0];
                    return (
                      <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                          {st.rollNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                          {st.name}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {st.enrollmentNumber || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {st.course}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Sem {st.semester}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {st.section ? `Sec ${st.section}` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {result ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                result.resultStatus === 'PASSED'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                  : result.resultStatus === 'BACK'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                              }`}
                            >
                              {result.resultStatus}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Not Collected</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                          {result ? `${result.totalMarks} / ${result.maxMarks} (${result.percentage}%)` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleDeleteStudent(st.id, st.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title={`Delete student ${st.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* IMPORT EXCEL & COLUMN MAPPING MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Import Student Master File
                </h3>
                <p className="text-xs text-slate-500">
                  Select Excel (.xlsx, .xls) or CSV file. Map columns before final ingestion.
                </p>
              </div>
              <button onClick={() => setIsUploadOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* File Upload Box */}
              {!previewReport ? (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-indigo-500 transition-colors">
                  <FileSpreadsheet className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Click to select or drag and drop Excel/CSV file
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supports .xlsx, .xls, .csv up to 10MB
                  </p>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileSelect}
                    className="mt-4 text-xs mx-auto block file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {uploading && <p className="text-xs text-indigo-600 font-medium mt-3">Inspecting headers & records...</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Validation Summary Pill */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Total Rows: {previewReport.totalRows}</span>
                      <span className="text-slate-400 mx-2">|</span>
                      <span className="text-emerald-600 font-bold">Valid: {previewReport.validCount}</span>
                      <span className="text-slate-400 mx-2">|</span>
                      <span className="text-rose-500 font-bold">Errors: {previewReport.invalidCount}</span>
                    </div>
                    {Boolean(previewReport.duplicateRollNumbers && previewReport.duplicateRollNumbers.length > 0) && (
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {previewReport.duplicateRollNumbers?.length} Duplicates Detected
                      </span>
                    )}
                  </div>

                  {/* Intelligent Column Mapping */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Verify Column Mapping
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Roll Number Column *
                        </label>
                        <select
                          value={mapping.rollNumber || ''}
                          onChange={e => setMapping({ ...mapping, rollNumber: e.target.value })}
                          className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                        >
                          <option value="">Select Column</option>
                          {previewReport.headers.map((h: string) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Student Name Column *
                        </label>
                        <select
                          value={mapping.name || ''}
                          onChange={e => setMapping({ ...mapping, name: e.target.value })}
                          className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                        >
                          <option value="">Select Column</option>
                          {previewReport.headers.map((h: string) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Enrollment No Column
                        </label>
                        <select
                          value={mapping.enrollmentNumber || ''}
                          onChange={e => setMapping({ ...mapping, enrollmentNumber: e.target.value })}
                          className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                        >
                          <option value="">None / Optional</option>
                          {previewReport.headers.map((h: string) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Section Column
                        </label>
                        <select
                          value={mapping.section || ''}
                          onChange={e => setMapping({ ...mapping, section: e.target.value })}
                          className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                        >
                          <option value="">None / Optional</option>
                          {previewReport.headers.map((h: string) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* First 3 Rows Preview */}
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-500 uppercase mb-1">Preview First 3 Rows</h5>
                    <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg font-mono text-[10px] overflow-x-auto">
                      {previewReport.sampleValid?.map((row, i: number) => (
                        <div key={i} className="py-0.5 text-slate-700 dark:text-slate-300">
                          Roll: {row.rollNumber} | Name: {row.name} | Course: {row.course} (Sem {row.semester})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <button
                type="button"
                onClick={() => { setPreviewReport(null); setUploadFile(null); }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Reset
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                {previewReport && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleCommitImport}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm"
                  >
                    {uploading ? 'Importing...' : `Confirm & Import ${previewReport.validCount} Students`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD SINGLE STUDENT MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateStudent} className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Individual Student</h3>
              <button type="button" onClick={() => setIsAddOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Roll Number *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 210052010045"
                  value={newStudent.rollNumber}
                  onChange={e => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Student Full Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Vikram Sharma"
                  value={newStudent.name}
                  onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Enrollment No</label>
                  <input
                    type="text"
                    placeholder="M21098472"
                    value={newStudent.enrollmentNumber}
                    onChange={e => setNewStudent({ ...newStudent, enrollmentNumber: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Semester</label>
                  <input
                    type="text"
                    value={newStudent.semester}
                    onChange={e => setNewStudent({ ...newStudent, semester: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course</label>
                  <input
                    type="text"
                    value={newStudent.course}
                    onChange={e => setNewStudent({ ...newStudent, course: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Section</label>
                  <input
                    type="text"
                    value={newStudent.section}
                    onChange={e => setNewStudent({ ...newStudent, section: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-950/60">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm"
              >
                Save Student
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
