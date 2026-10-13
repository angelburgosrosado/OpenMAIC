'use client';

import React from 'react';
import { Loader2, Sparkles, CheckCircle2, Globe, Microscope } from 'lucide-react';

interface InfographicLoadingProps {
  status: string;
  step: number;
  facts: string[];
}

export function InfographicLoading({ status, step, facts }: InfographicLoadingProps) {
  return (
    <div className="w-full max-w-2xl mx-auto my-8 p-6 md:p-8 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl animate-in fade-in duration-500">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Animated icon indicator */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
            {step === 1 ? (
              <Globe className="w-8 h-8 animate-pulse text-cyan-500" />
            ) : (
              <Microscope className="w-8 h-8 animate-bounce text-purple-500" />
            )}
          </div>
          <div className="absolute -top-1 -right-1">
            <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {status}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-medium">
            {step === 1 ? 'Step 1 of 2: Grounding with Google Search' : 'Step 2 of 2: Synthesizing 16:9 Infographic'}
          </p>
        </div>

        {/* Fact Ticker */}
        {facts && facts.length > 0 && (
          <div className="w-full mt-4 text-left border-t border-slate-200 dark:border-white/10 pt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Grounded Knowledge Points</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {facts.map((fact, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed animate-in fade-in slide-in-from-left duration-300"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>{fact}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
