'use client';

import React from 'react';
import { ExternalLink, BookOpen, ShieldCheck } from 'lucide-react';
import type { SearchResultItem } from '@/lib/types/infographic';

interface SearchResultsPanelProps {
  results: SearchResultItem[];
}

export function SearchResultsPanel({ results }: SearchResultsPanelProps) {
  if (!results || results.length === 0) return null;

  return (
    <div className="w-full mt-6 p-4 md:p-6 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Google Search Grounding Sources
          </h4>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/30">
          <ShieldCheck className="w-3 h-3" />
          <span>Factual Grounding Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {results.map((item, idx) => {
          let hostname = '';
          try {
            hostname = new URL(item.url).hostname.replace(/^www\./, '');
          } catch {
            hostname = item.url;
          }

          return (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/70 dark:border-white/5 hover:border-cyan-500/40 hover:bg-cyan-50/30 dark:hover:bg-slate-800/40 transition-all text-left"
            >
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {item.title}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span className="truncate max-w-[160px] font-medium">{hostname}</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
