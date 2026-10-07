'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebar } from './sidebar-context';
import { Database, ShieldCheck, Wifi, Menu, LogOut, UserCheck } from 'lucide-react';

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { toggleMobile } = useSidebar();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('rajkumarsharma705214@gmail.com');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      setIsLoggingOut(true);
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        setIsLoggingOut(false);
      }
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleMobile}
          className="md:hidden p-2 -ml-1 rounded-lg text-slate-300 hover:bg-slate-800 focus:outline-none transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-400 truncate hidden xs:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* System Health Indicators */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-800/90 border border-slate-700/60 px-3 py-1 rounded-full text-xs font-medium text-slate-300">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>Adapter: <strong className="text-indigo-400">CCSU</strong></span>
          <span className="text-slate-600">|</span>
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>Prisma DB Active</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Manual CAPTCHA</span>
        </div>

        {/* Authenticated User Status */}
        <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-800/60 px-2.5 py-1 rounded-lg text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <UserCheck className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline" />
          <span className="text-emerald-300 font-medium max-w-[130px] sm:max-w-[200px] truncate" title={userEmail}>
            {userEmail}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-900/60 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          title="Sign out of Result Analyzer"
          aria-label="Logout"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isLoggingOut ? 'Signing out...' : 'Logout'}</span>
        </button>
      </div>
    </header>
  );
}
