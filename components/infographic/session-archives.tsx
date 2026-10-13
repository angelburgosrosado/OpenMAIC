'use client';

import React from 'react';
import { History } from 'lucide-react';
import type { GeneratedInfographic } from '@/lib/types/infographic';

interface SessionArchivesProps {
  history: GeneratedInfographic[];
  onSelect: (image: GeneratedInfographic) => void;
}

export function SessionArchives({ history, onSelect }: SessionArchivesProps) {
  if (!history || history.length <= 1) return null;

  return (
    <div className="w-full mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-slate-400" />
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Session Variations & Revisions
        </h4>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {history.slice(1).map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className="group relative cursor-pointer rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 hover:border-cyan-500/60 transition-all shadow-sm bg-slate-900"
          >
            <div className="aspect-video w-full overflow-hidden bg-slate-950">
              <img
                src={item.data}
                alt={item.prompt}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-left">
              <p className="text-[11px] font-semibold text-white truncate">{item.prompt}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] text-cyan-300 font-bold uppercase">{item.level}</span>
                <span className="text-[9px] text-slate-400">•</span>
                <span className="text-[9px] text-purple-300 font-medium">{item.style}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
