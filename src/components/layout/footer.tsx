import React from 'react';
import { Heart, Code2, ExternalLink } from 'lucide-react';

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-4 px-6 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Code2 className="w-4 h-4" />
          </div>
          <span>
            Develop and Design by{' '}
            <a
              href="https://github.com/raajks"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-4 decoration-indigo-400/50 hover:decoration-indigo-500 transition-all inline-flex items-center gap-1 group"
            >
              <span>Mr. Raj</span>
              <GithubIcon className="inline group-hover:scale-110 transition-transform text-slate-700 dark:text-slate-300" />
            </a>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
          <span>University Result Analyzer</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" /> for Academic Excellence
          </span>
        </div>
      </div>
    </footer>
  );
}
