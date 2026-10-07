'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import {
  Search,
  FileSpreadsheet,
  Download,
  GraduationCap,
  TableProperties,
  X,
  ExternalLink,
} from 'lucide-react';

export default function ResultsTablePage() {
  const [viewMode, setViewMode] = useState<'COLLEGE_FORMAT' | 'MATRIX'>('COLLEGE_FORMAT');
  const [columns, setColumns] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [collegeData, setCollegeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('I');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Fetch Matrix results
  const fetchMatrixResults = async () => {
    try {
      const url = new URL('/api/results', window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (statusFilter) url.searchParams.set('status', statusFilter);
      if (semesterFilter) url.searchParams.set('semester', semesterFilter);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setColumns(json.columns || []);
        setResults(json.results || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch College Format results
  const fetchCollegeData = async () => {
    try {
      const url = new URL('/api/college-analysis', window.location.origin);
      url.searchParams.set('course', 'BCA');
      if (semesterFilter) url.searchParams.set('semester', semesterFilter);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setCollegeData(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchMatrixResults(), fetchCollegeData()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, semesterFilter]);

  // Filtered college students based on search and status
  const filteredCollegeStudents = (collegeData?.students || []).filter((s: any) => {
    if (search) {
      const q = search.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !s.rollNumber.includes(q)) return false;
    }
    if (statusFilter) {
      if (statusFilter === 'PASSED' && s.result !== 'PASS') return false;
      if (statusFilter === 'BACK' && s.result !== 'BACK') return false;
      if (statusFilter === 'FAILED' && s.result !== 'FAIL') return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <Header
        title="Result Tabulation & Master Analysis"
        subtitle="Live synchronization with CCSU official marksheets & SDCMT College Examination Tabulation."
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-[1500px] mx-auto w-full">
        {/* VIEW MODE TOGGLE & EXPORT TOOLBAR */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          {/* Format Toggle */}
          <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full lg:w-auto">
            <button
              onClick={() => setViewMode('COLLEGE_FORMAT')}
              className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'COLLEGE_FORMAT'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>SDCMT College Analysis Format</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                Official
              </span>
            </button>

            <button
              onClick={() => setViewMode('MATRIX')}
              className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'MATRIX'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <TableProperties className="w-4 h-4" />
              <span>Standard Matrix Table</span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search roll no or name..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Semester Filter */}
            <select
              value={semesterFilter}
              onChange={e => setSemesterFilter(e.target.value)}
              className="py-1.5 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="">All Semesters</option>
              <option value="I">Semester I</option>
              <option value="II">Semester II</option>
              <option value="III">Semester III</option>
              <option value="IV">Semester IV</option>
              <option value="V">Semester V</option>
              <option value="VI">Semester VI</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 dark:text-slate-300"
            >
              <option value="">All Results</option>
              <option value="PASSED">Passed Only</option>
              <option value="BACK">Back Paper</option>
              <option value="FAILED">Failed</option>
            </select>

            {/* Direct College Format Download */}
            <a
              href={`/api/exports/college-format?course=BCA&semester=${semesterFilter}`}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all"
              title="Download exact institutional spreadsheet matching college format"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Download SDCMT College Sheet (.xlsx)
            </a>

            {/* Standard Excel Download */}
            <a
              href={`/api/exports/excel?course=BCA&semester=${semesterFilter}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              5-Sheet Excel
            </a>
          </div>
        </div>

        {/* 1. SDCMT COLLEGE ANALYSIS FORMAT VIEW */}
        {viewMode === 'COLLEGE_FORMAT' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* College Header Banner - Always Visible */}
            <div className="py-4 px-6 text-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-300 dark:border-slate-800">
              <h2 className="font-extrabold text-base sm:text-xl text-slate-900 dark:text-white uppercase tracking-wider">
                {collegeData?.collegeName || 'SUNDER DEEP COLLEGE OF MANAGEMANT & TECHNOLOGY, GHAZIABAD'}
              </h2>
              <h3 className="font-bold text-xs sm:text-sm text-indigo-700 dark:text-indigo-400 uppercase tracking-wide mt-1">
                {collegeData?.subtitle || 'RESULT ANALYSIS, SDCMT BCA (1st Sem)'}
              </h3>
              <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Official Examination Tabulation Format
                </span>
                <span>•</span>
                <span>Auto-Saved to Disk (`exports/`)</span>
                <span>•</span>
                <span>{filteredCollegeStudents.length} Students Listed</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              {(() => {
                const totalTableCols = 3 + (collegeData?.subjects || []).reduce((acc: number, sub: any) => acc + (sub.isPractical ? 1 : 3), 0) + 4;
                return (
                  <table className="w-full text-center border-collapse text-xs select-text">
                    <thead>

                  {/* ROW 3: COLUMN HEADERS */}
                  <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700 text-[11px]">
                    <th className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 min-w-[50px]">Sr. No.</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 min-w-[120px]">ROLL NO.</th>
                    <th className="py-2.5 px-4 border-r border-slate-300 dark:border-slate-700 min-w-[160px] text-left">NAME</th>

                    {/* Subject Headers */}
                    {(collegeData?.subjects || []).map((sub: any) => {
                      if (!sub.isPractical) {
                        return (
                          <React.Fragment key={sub.code}>
                            <th
                              colSpan={2}
                              className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 text-center min-w-[110px]"
                              title={sub.name}
                            >
                              <div className="truncate max-w-[140px] font-bold">{sub.name}</div>
                              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">({sub.code})</div>
                            </th>
                            <th className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 text-center min-w-[60px] font-bold">
                              TOTAL
                            </th>
                          </React.Fragment>
                        );
                      } else {
                        return (
                          <th
                            key={sub.code}
                            className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 text-center min-w-[110px]"
                            title={sub.name}
                          >
                            <div className="truncate max-w-[140px] font-bold">{sub.name}</div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">({sub.code})</div>
                          </th>
                        );
                      }
                    })}

                    <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 min-w-[80px]">OBT. MARKS</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 min-w-[90px]">Percentage %</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 min-w-[80px]">DIVISION</th>
                    <th className="py-2.5 px-3 min-w-[75px]">RESULT</th>
                  </tr>

                  {/* ROW 4: MAXIMUM MARKS */}
                  <tr className="bg-slate-50 dark:bg-slate-950/80 font-bold text-slate-700 dark:text-slate-300 border-b-2 border-slate-400 dark:border-slate-700 text-[11px]">
                    <th colSpan={3} className="py-2 px-3 text-left border-r border-slate-300 dark:border-slate-700 tracking-wider">
                      MAXIMUM MARKS
                    </th>

                    {/* Maximum Marks for Subjects */}
                    {(collegeData?.subjects || []).map((sub: any) => {
                      if (!sub.isPractical) {
                        return (
                          <React.Fragment key={`max-${sub.code}`}>
                            <th className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 text-center font-mono">{sub.externalMax}</th>
                            <th className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 text-center font-mono">{sub.internalMax}</th>
                            <th className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 text-center font-mono bg-slate-100/50 dark:bg-slate-900">{sub.totalMax}</th>
                          </React.Fragment>
                        );
                      } else {
                        return (
                          <th key={`max-${sub.code}`} className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 text-center font-mono">
                            {sub.totalMax}
                          </th>
                        );
                      }
                    })}

                    <th className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 text-center font-mono font-bold">
                      {collegeData?.totalMaxMarks || 600}
                    </th>
                    <th className="py-2 px-2 border-r border-slate-300 dark:border-slate-700"></th>
                    <th className="py-2 px-2 border-r border-slate-300 dark:border-slate-700"></th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>

                {/* ROW 5+: STUDENT ROWS */}
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={totalTableCols} className="py-12 text-center text-slate-400">
                        Loading SDCMT college format data...
                      </td>
                    </tr>
                  ) : filteredCollegeStudents.length === 0 ? (
                    <tr>
                      <td colSpan={totalTableCols} className="py-12 text-center text-slate-400">
                        No student marks found for current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCollegeStudents.map((st: any, idx: number) => {
                      const stKey = st.id || `${st.rollNumber}-${st.srNo || idx}`;
                      return (
                        <tr
                          key={stKey}
                          onClick={() => {
                            const mRow = results.find(r => r.rollNumber === st.rollNumber);
                            if (mRow) setSelectedStudent(mRow);
                          }}
                          className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors"
                        >
                          {/* Sr. No */}
                          <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-500">
                            {st.srNo}
                          </td>

                          {/* Roll No */}
                          <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {st.rollNumber}
                          </td>

                          {/* Name */}
                          <td className="py-2 px-4 border-r border-slate-200 dark:border-slate-800 text-left font-medium text-slate-900 dark:text-white whitespace-nowrap">
                            {st.name}
                          </td>

                          {/* Marks for each subject */}
                          {(collegeData?.subjects || []).map((sub: any) => {
                            const m = st.marks[sub.code];
                            const isFail = m?.isFail || m?.status === 'FAIL' || m?.status === 'BACK';

                            if (!sub.isPractical) {
                              return (
                                <React.Fragment key={`${stKey}-${sub.code}`}>
                                  {/* External */}
                                  <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-mono">
                                    {m?.external !== null && m?.external !== undefined ? m.external : '—'}
                                  </td>
                                  {/* Internal */}
                                  <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-mono">
                                    {m?.internal !== null && m?.internal !== undefined ? m.internal : '—'}
                                  </td>
                                  {/* Total */}
                                  <td
                                    className={`py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-mono font-bold ${
                                      isFail
                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400'
                                        : 'bg-slate-50/60 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    {m?.total ?? 0}
                                  </td>
                                </React.Fragment>
                              );
                            } else {
                              return (
                                <td
                                  key={`${stKey}-${sub.code}`}
                                  className={`py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-mono font-bold ${
                                    isFail
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  {m?.practical !== null && m?.practical !== undefined ? m.practical : m?.total ?? 0}
                                </td>
                              );
                            }
                          })}

                        {/* OBT. MARKS */}
                        <td
                          className={`py-2 px-2 border-r border-slate-200 dark:border-slate-800 font-mono font-bold ${
                            st.isFail
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {st.totalObtained}
                        </td>

                        {/* Percentage % */}
                        <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 font-mono font-medium text-slate-700 dark:text-slate-300">
                          {st.percentage.toFixed(2)}%
                        </td>

                        {/* DIVISION */}
                        <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              st.division === 'First'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : st.division === 'Second'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : st.division === 'Third'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {st.division}
                          </span>
                        </td>

                        {/* RESULT */}
                        <td className="py-2 px-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              st.result === 'PASS'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                : st.result === 'BACK'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                            }`}
                          >
                            {st.result}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
                );
              })()}
            </div>
          </div>
        )}

        {/* 2. STANDARD MATRIX VIEW */}
        {viewMode === 'MATRIX' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Consolidated Marks Matrix ({results.length} Records)
                </h3>
                <p className="text-[11px] text-slate-500">
                  {columns.length} Subject Papers Dynamically Auto-Discovered
                </p>
              </div>

              <div className="text-xs text-slate-500">
                Click any student row to inspect complete scorecard drilldown
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                    <th className="py-3 px-3.5 w-12 text-center">#</th>
                    <th className="py-3 px-4 sticky left-0 bg-slate-50 dark:bg-slate-950/90 z-10 shadow-xs">Roll No</th>
                    <th className="py-3 px-4">Student Name</th>

                    {/* Dynamically Injected Subject Columns */}
                    {columns.map(col => (
                      <th key={col.code} className="py-3 px-3 text-center min-w-[100px]" title={col.name}>
                        <div className="font-bold text-slate-700 dark:text-slate-300">{col.code}</div>
                        <div className="text-[9px] font-normal text-slate-400 truncate max-w-[110px]">{col.name}</div>
                      </th>
                    ))}

                    <th className="py-3 px-3 text-center">Source</th>
                    <th className="py-3 px-3 text-center">Total</th>
                    <th className="py-3 px-3 text-center">Score %</th>
                    <th className="py-3 px-3 text-center">SGPA</th>
                    <th className="py-3 px-4 text-center">Result</th>
                    <th className="py-3 px-4">Back Papers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={columns.length + 8} className="py-12 text-center text-slate-400">
                        Loading matrix data...
                      </td>
                    </tr>
                  ) : results.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 8} className="py-12 text-center text-slate-400">
                        No results found matching query.
                      </td>
                    </tr>
                  ) : (
                    results.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedStudent(row)}
                        className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-3.5 text-center font-mono text-slate-400">{row.sNo}</td>
                        <td className="py-3 px-4 font-bold font-mono text-indigo-600 dark:text-indigo-400 sticky left-0 bg-white dark:bg-slate-900 z-10">
                          {row.rollNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          {row.studentName}
                        </td>

                        {/* Dynamic Subject Mark Cells */}
                        {columns.map(col => {
                          const sub = row.subjects[col.code];
                          if (!sub) {
                            return <td key={col.code} className="py-3 px-3 text-center text-slate-300 dark:text-slate-600">—</td>;
                          }

                          const isFail = sub.status === 'FAIL' || sub.status === 'BACK';
                          return (
                            <td key={col.code} className="py-3 px-3 text-center font-mono font-medium">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded ${
                                  isFail
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 font-bold'
                                    : sub.marks >= 75
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {sub.marks}
                              </span>
                            </td>
                          );
                        })}

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.source === 'CCSU REAL'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {row.source || 'MOCK'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white font-mono">
                          {row.totalMarks}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-600 dark:text-slate-300">
                          {row.percentage}%
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                          {row.sgpa ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.resultStatus === 'PASSED'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                : row.resultStatus === 'BACK'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                            }`}
                          >
                            {row.resultStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] font-mono text-rose-500">
                          {row.backSubjects.length > 0 ? row.backSubjects.join(', ') : 'None'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* STUDENT DETAILED SCORECARD MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                  Individual Student Performance Card
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedStudent.studentName}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedStudent.source === 'CCSU REAL'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {selectedStudent.source || 'MOCK'}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Roll Number</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedStudent.rollNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Enrollment No</span>
                  <span className="font-mono">{selectedStudent.enrollmentNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Course</span>
                  <span className="font-medium">{selectedStudent.course}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Semester</span>
                  <span className="font-semibold">Sem {selectedStudent.semester}</span>
                </div>
              </div>

              {/* Subject Breakdown Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                  Subject-wise Marks Breakdown
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3 text-center">Marks</th>
                        <th className="py-2.5 px-3 text-center">Grade</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {columns.map(col => {
                        const sub = selectedStudent.subjects[col.code];
                        if (!sub) return null;
                        return (
                          <tr key={col.code}>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">{col.code}</span>
                              <span className="block text-[11px] text-slate-500">{col.name}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              {sub.marks} / {sub.maxMarks}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                              {sub.grade || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sub.status === 'PASS'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                                }`}
                              >
                                {sub.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Overall Summary Row */}
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Grand Total</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedStudent.totalMarks} / {selectedStudent.maxMarks} ({selectedStudent.percentage}%)
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-slate-500 block text-[10px]">Result Classification</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedStudent.resultStatus} (SGPA: {selectedStudent.sgpa ?? 'N/A'})
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-950/60">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
