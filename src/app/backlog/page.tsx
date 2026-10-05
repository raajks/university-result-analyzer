'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import {
  AlertTriangle,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  BookOpen
} from 'lucide-react';

export default function BacklogAnalysisPage() {
  const [backlogs, setBacklogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  useEffect(() => {
    async function loadBacklogs() {
      try {
        setLoading(true);
        const res = await fetch('/api/results');
        const json = await res.json();
        if (json.success) {
          const list: any[] = [];
          for (const r of json.results) {
            for (const [code, sub] of Object.entries<any>(r.subjects)) {
              if (sub.status === 'FAIL' || sub.status === 'BACK') {
                list.push({
                  rollNumber: r.rollNumber,
                  studentName: r.studentName,
                  course: r.course,
                  semester: r.semester,
                  subjectCode: code,
                  subjectName: json.columns.find((c: any) => c.code === code)?.name || code,
                  marksObtained: sub.marks,
                  maxMarks: sub.maxMarks,
                  status: sub.status,
                  overallResult: r.resultStatus,
                  internalMarks: sub.internal,
                  externalMarks: sub.external,
                });
              }
            }
          }
          setBacklogs(list);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadBacklogs();
  }, []);

  const filtered = backlogs.filter(b => {
    const matchesSearch =
      b.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.studentName.toLowerCase().includes(search.toLowerCase());
    const matchesSub = !subjectFilter || b.subjectCode === subjectFilter;
    return matchesSearch && matchesSub;
  });

  const uniqueSubjectCodes = Array.from(new Set(backlogs.map(b => b.subjectCode)));

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Backlog & Carry-Over Paper Analysis"
        subtitle="Identify students failing to meet minimum passing thresholds for special/carry-over exams."
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
        {/* Metric Alert Pill */}
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                {backlogs.length} Total Paper Backlogs Recorded
              </h3>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Students eligible for carry-over examination registration under university ordinances.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search roll no or student..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="py-2 px-3 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Back Subjects</option>
              {uniqueSubjectCodes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <a
            href="/api/exports/excel"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export Backlog Sheet
          </a>
        </div>

        {/* Backlog Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Students with Back Papers ({filtered.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Course & Sem</th>
                  <th className="py-3 px-4">Failed Paper Code</th>
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4 text-center">Marks Obtained</th>
                  <th className="py-3 px-4 text-center">Min Needed (40%)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Loading backlog analysis...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No backlog records found matching filters!
                    </td>
                  </tr>
                ) : (
                  filtered.map((b, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {b.rollNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {b.studentName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {b.course} (Sem {b.semester})
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {b.subjectCode}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {b.subjectName}
                      </td>
                      <td className="py-3 px-4 text-center font-bold font-mono text-rose-600 dark:text-rose-400">
                        {b.marksObtained} / {b.maxMarks}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-mono">
                        40
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
