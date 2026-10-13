'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Zap,
  Layers,
  Image as ImageIcon,
  Volume2,
  Film,
  Mic,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Bucket {
  key: string;
  kind: 'llm' | 'image' | 'video' | 'tts' | 'asr';
  unit: 'token' | 'image' | 'second' | 'character';
  requests: number;
  totalTokens: number;
  quantity: number;
}

interface UsageData {
  totals: { requests: number; llmTokens: number };
  byModel: Bucket[];
  byDay: Bucket[];
  byKind: Bucket[];
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export default function AdminUsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usage');
      const json = await res.json();
      if (json.success !== false) {
        setData(json);
      }
    } catch {
      toast.error('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsage();
  }, [fetchUsage]);

  const modalityIcons = {
    llm: Zap,
    image: ImageIcon,
    tts: Volume2,
    video: Film,
    asr: Mic,
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-violet-500" />
            Global Token Consumption & Usage Telemetry
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aggregated consumption logs across all models, learners, and modalities.
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={fetchUsage} className="text-xs">
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
          Refresh Telemetry
        </Button>
      </div>

      {/* Overview Totals */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-border/60 bg-card/60 space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">Total API Requests</div>
            <div className="text-3xl font-black text-foreground">
              {data.totals.requests.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">Across all providers</div>
          </div>

          <div className="p-5 rounded-2xl border border-border/60 bg-card/60 space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">Total LLM Tokens</div>
            <div className="text-3xl font-black text-violet-600 dark:text-violet-400">
              {fmtNum(data.totals.llmTokens)}
            </div>
            <div className="text-[11px] text-muted-foreground">Prompt + completion tokens</div>
          </div>

          <div className="p-5 rounded-2xl border border-border/60 bg-card/60 space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">Active Modalities</div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {data.byKind.length}
            </div>
            <div className="text-[11px] text-muted-foreground">Text, Audio, Visuals, Video</div>
          </div>

          <div className="p-5 rounded-2xl border border-border/60 bg-card/60 space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">Logged Days</div>
            <div className="text-3xl font-black text-foreground">{data.byDay.length}</div>
            <div className="text-[11px] text-muted-foreground">Historical telemetry timeline</div>
          </div>
        </div>
      )}

      {/* Modality Breakdown Cards */}
      {data && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-foreground">Modality Distribution</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {data.byKind.map((k) => {
              const Icon = modalityIcons[k.kind] || Zap;
              return (
                <div key={k.key} className="p-4 rounded-xl border border-border/60 bg-card/60 space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-bold uppercase">{k.kind}</span>
                    <Icon className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="text-xl font-black text-foreground">
                    {k.kind === 'llm' ? fmtNum(k.totalTokens) : fmtNum(k.quantity)}
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      {k.unit}s
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{k.requests} requests</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Models Breakdown Table */}
      {data && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-foreground">Consumption by Model</h2>
          <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/40 bg-muted/40 font-semibold text-muted-foreground">
                  <th className="p-3.5 pl-5">Model / Endpoint</th>
                  <th className="p-3.5">Modality</th>
                  <th className="p-3.5">Requests</th>
                  <th className="p-3.5">LLM Tokens</th>
                  <th className="p-3.5 pr-5">Non-token Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {data.byModel.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No model activity logged yet.
                    </td>
                  </tr>
                ) : (
                  data.byModel.map((m) => (
                    <tr key={m.key} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 pl-5 font-bold font-mono text-foreground text-sm">
                        {m.key}
                      </td>
                      <td className="p-3.5 uppercase font-semibold text-muted-foreground">
                        {m.kind}
                      </td>
                      <td className="p-3.5 font-bold text-foreground">{m.requests}</td>
                      <td className="p-3.5 font-mono text-violet-600 dark:text-violet-400 font-bold">
                        {m.kind === 'llm' ? m.totalTokens.toLocaleString() : '—'}
                      </td>
                      <td className="p-3.5 pr-5 text-muted-foreground">
                        {m.kind !== 'llm' ? `${m.quantity.toLocaleString()} ${m.unit}s` : '—'}
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
  );
}
