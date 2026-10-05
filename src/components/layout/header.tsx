'use client';

import React from 'react';
import { useTheme } from './theme-provider';
import { useSidebar } from './sidebar-context';
import { Sun, Moon, Database, ShieldCheck, Wifi, Menu } from 'lucide-react';

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { isDark, setTheme } = useTheme();
  const { toggleMobile } = useSidebar();

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleMobile}
          className="md:hidden p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden xs:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* System Health Indicators */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300">
          <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          <span>Adapter: <strong className="text-indigo-600 dark:text-indigo-400">CCSU</strong></span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <Database className="w-3.5 h-3.5 text-indigo-500" />
          <span>Prisma DB Active</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Manual CAPTCHA</span>
        </div>

        {/* Dark/Light mode toggle */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Light/Dark theme"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
}
