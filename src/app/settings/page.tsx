'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/header';
import { useTheme } from '@/components/layout/theme-provider';
import {
  Settings,
  Moon,
  Sun,
  Database,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Server
} from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="System & Application Settings"
        subtitle="Configure appearance, database connections, and operational preferences."
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full">
        {resetMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between">
            <span>{resetMessage}</span>
            <button onClick={() => setResetMessage(null)}>✕</button>
          </div>
        )}

        {/* Theme Preference */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Interface Theme
              </h3>
              <p className="text-xs text-slate-500">
                Choose light mode, dark mode, or follow system default.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <button
              onClick={() => setTheme('light')}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 font-medium transition-all ${
                theme === 'light'
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              Light Theme
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 font-medium transition-all ${
                theme === 'dark'
                  ? 'border-indigo-600 bg-indigo-950/50 text-indigo-300 font-bold'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Moon className="w-5 h-5 text-indigo-400" />
              Dark Theme
            </button>

            <button
              onClick={() => setTheme('system')}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 font-medium transition-all ${
                theme === 'system'
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Server className="w-5 h-5 text-slate-500" />
              System Sync
            </button>
          </div>
        </div>

        {/* Database & Runtime Information */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Database & Runtime Diagnostics
              </h3>
              <p className="text-xs text-slate-500">
                Prisma ORM connected with full relational integrity
              </p>
            </div>
          </div>

          <div className="space-y-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span>Environment</span>
              <span className="font-bold text-slate-900 dark:text-white">Development / Production-Ready</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span>ORM Provider</span>
              <span className="font-bold text-indigo-600">Prisma (SQLite local dev / PostgreSQL production)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span>Automation Engine</span>
              <span className="font-bold text-slate-900 dark:text-white">Playwright Headful + Zero-Network Mock</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>CAPTCHA Policy</span>
              <span className="font-bold text-emerald-600">Strict Human-in-the-Loop Enforced</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
