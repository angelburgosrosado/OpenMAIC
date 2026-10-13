'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  estimateCourseConsumption,
  type CourseEstimateInput,
  type ScriptComplexity,
  type VisualDensity,
  type VoiceNarrator,
  type VideoExportQuality,
} from '@/lib/server/calculator/token-calculator';
import {
  LLM_MODELS_PRICING,
  TTS_PRICING,
  IMAGE_PRICING,
} from '@/lib/server/calculator/pricing-data';
import {
  Calculator,
  Zap,
  Clock,
  DollarSign,
  ArrowLeft,
  Sparkles,
  BarChart3,
  Layers,
  Info,
} from 'lucide-react';
import { AuthModal } from '@/components/auth/auth-modal';
import { PricingModal } from '@/components/monetization/pricing-modal';
import { cn } from '@/lib/utils';

export default function CalculatorPage() {
  const setPricingOpen = useAuthStore((s) => s.setPricingModalOpen);

  const [sceneCount, setSceneCount] = useState<number>(10);
  const [scriptComplexity, setScriptComplexity] = useState<ScriptComplexity>('standard');
  const [modelId, setModelId] = useState<string>('gpt-4o');
  const [visualDensity, setVisualDensity] = useState<VisualDensity>('each_slide');
  const [imageProviderId, setImageProviderId] = useState<string>('flux-schnell');
  const [voiceNarrator, setVoiceNarrator] = useState<VoiceNarrator>('edge-tts');
  const [videoExport, setVideoExport] = useState<VideoExportQuality>('video-render-local');
  const [hasWebSearch, setHasWebSearch] = useState<boolean>(true);
  const [pdfPagesCount, setPdfPagesCount] = useState<number>(10);

  const estimate = useMemo(() => {
    const input: CourseEstimateInput = {
      sceneCount,
      scriptComplexity,
      modelId,
      visualDensity,
      imageProviderId,
      voiceNarrator,
      videoExport,
      hasWebSearch,
      pdfPagesCount,
    };
    return estimateCourseConsumption(input);
  }, [
    sceneCount,
    scriptComplexity,
    modelId,
    visualDensity,
    imageProviderId,
    voiceNarrator,
    videoExport,
    hasWebSearch,
    pdfPagesCount,
  ]);

  const comparisonModels = ['gpt-4o', 'claude-3-7-sonnet', 'gemini-2.5-pro', 'deepseek-v3', 'gpt-4o-mini'];
  const comparisons = useMemo(() => {
    return comparisonModels.map((mid) => {
      const res = estimateCourseConsumption({
        sceneCount,
        scriptComplexity,
        modelId: mid,
        visualDensity,
        imageProviderId,
        voiceNarrator,
        videoExport,
        hasWebSearch,
        pdfPagesCount,
      });
      return {
        id: mid,
        name: LLM_MODELS_PRICING[mid]?.name || mid,
        cost: res.rawProviderCostUsd,
        tokens: res.totalPlatformTokens,
      };
    });
  }, [
    sceneCount,
    scriptComplexity,
    visualDensity,
    imageProviderId,
    voiceNarrator,
    videoExport,
    hasWebSearch,
    pdfPagesCount,
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="h-16 px-6 sm:px-12 border-b border-border/40 flex items-center justify-between backdrop-blur-md bg-background/80 sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          <span>Back to OpenMAIC Studio</span>
        </Link>
        <Button
          size="sm"
          onClick={() => setPricingOpen(true)}
          className="text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold"
        >
          View Plans & Pricing
        </Button>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Calculator className="w-3.5 h-3.5" />
            <span>Interactive Simulator</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Token Consumption & Cost Calculator
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Model exact token usage across multi-slide lectures, script generation, audio synthesis,
            and visual rendering before kicking off AI jobs.
          </p>
        </div>

        {/* Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
          {/* Controls Left (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Number of Slides / Scenes</Label>
                <span className="text-xs font-black px-2 py-0.5 rounded bg-muted text-foreground">
                  {sceneCount} slides
                </span>
              </div>
              <Slider
                value={[sceneCount]}
                onValueChange={(vals) => setSceneCount(vals[0])}
                min={3}
                max={30}
                step={1}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Script Dialogue Density</Label>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {(
                  [
                    { id: 'concise', label: 'Brisk (~40w)' },
                    { id: 'standard', label: 'Balanced (~90w)' },
                    { id: 'in_depth', label: 'Detailed (~180w)' },
                    { id: 'academic', label: 'Academic (~300w)' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setScriptComplexity(c.id)}
                    className={cn(
                      'p-2.5 rounded-xl border text-center transition-all',
                      scriptComplexity === c.id
                        ? 'border-emerald-600 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400'
                        : 'border-border/60 hover:bg-muted/40 text-muted-foreground',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Generative Model</Label>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full text-xs font-medium p-2.5 rounded-xl border border-border/60 bg-background text-foreground"
              >
                {Object.values(LLM_MODELS_PRICING).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (${m.inputPerMillion}/M in, ${m.outputPerMillion}/M out)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Slide Visuals</Label>
                <select
                  value={visualDensity}
                  onChange={(e) => setVisualDensity(e.target.value as VisualDensity)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-border/60 bg-background text-foreground"
                >
                  <option value="none">No Images</option>
                  <option value="few">Few Key Slides (~30%)</option>
                  <option value="each_slide">Every Slide</option>
                  <option value="diagrams_and_illustrations">Heavy Diagrams</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Voice Narrator</Label>
                <select
                  value={voiceNarrator}
                  onChange={(e) => setVoiceNarrator(e.target.value as VoiceNarrator)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-border/60 bg-background text-foreground"
                >
                  {Object.values(TTS_PRICING).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-border/40">
              <div className="flex items-center gap-2">
                <Switch
                  checked={hasWebSearch}
                  onCheckedChange={setHasWebSearch}
                  id="page-calc-web"
                />
                <Label htmlFor="page-calc-web" className="text-xs font-medium cursor-pointer">
                  Include Web Research (Tavily/Brave)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="page-calc-pdf" className="text-xs text-muted-foreground">
                  PDF Pages:
                </Label>
                <input
                  id="page-calc-pdf"
                  type="number"
                  min={0}
                  max={200}
                  value={pdfPagesCount}
                  onChange={(e) => setPdfPagesCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 text-xs p-1 rounded border border-border/60 bg-background text-center font-bold"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Calculated Outputs (5 cols) */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-muted/20 border border-border/40 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-border/60 bg-background space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Platform Tokens</span>
                </div>
                <div className="text-2xl font-black text-foreground tabular-nums">
                  {estimate.totalPlatformTokens.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-background space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Provider Cost</span>
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  ${estimate.rawProviderCostUsd}
                </div>
              </div>
            </div>

            {/* Modality breakdown */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-foreground">Modality Breakdown</div>
              <div className="space-y-2 text-xs">
                {Object.entries(estimate.breakdown)
                  .filter(([, b]) => b.costUsd > 0)
                  .map(([key, b]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span className="font-semibold text-foreground">
                          ${b.costUsd} ({b.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${b.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Benchmark Table */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="text-xs font-bold text-foreground">Side-by-side Model Benchmark</div>
              <div className="space-y-1">
                {comparisons.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-1.5 px-2 rounded text-xs text-muted-foreground"
                  >
                    <span>{c.name}</span>
                    <span className="font-mono font-bold text-foreground">
                      ${c.cost.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <AuthModal />
      <PricingModal />
    </div>
  );
}
