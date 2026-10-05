'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import {
  ScrollText,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter,
  RefreshCw,
  Search
} from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({ total: 0, completed: 0, failed: 0, warnings: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/logs', window.location.origin);
      if (statusFilter) url.searchParams.set('status', statusFilter);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setLogs(json.logs || []);
        setCounts(json.counts || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const handleRetryFailed = async () => {
    try {
      const res = await fetch('/api/logs', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setRetryMessage(json.message);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Collection Audit & Activity Logs"
        subtitle="Immutable timestamped record of all roll number requests, validations, and statuses."
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
        {retryMessage && (
          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs font-semibold flex items-center justify-between">
            <span>{retryMessage}</span>
            <button onClick={() => setRetryMessage(null)}>✕</button>
          </div>
        )}

        {/* Top KPI Counts Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px]">Total Logged Lookups</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">{counts.total}</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px]">Completed Successfully</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{counts.completed}</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px]">Validation Warnings</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{counts.warnings}</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px]">Failed / Retry Required</span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{counts.failed}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="py-2 px-3 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="VALIDATION_WARNING">Validation Warning</option>
              <option value="FAILED">Failed</option>
              <option value="SKIPPED">Skipped</option>
            </select>

            <button
              onClick={fetchLogs}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <button
            onClick={handleRetryFailed}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry Failed Students
          </button>
        </div>

        {/* Logs Timeline Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Session Name</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Message / Audit Trail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                      No logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.startedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                        {log.rollNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-sans text-xs">
                        {log.session?.name || 'Manual lookup'}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              : log.status === 'VALIDATION_WARNING'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-xs text-slate-700 dark:text-slate-300">
                        {log.message}
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
