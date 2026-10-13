'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  Layers,
  Sparkles,
  BarChart3,
  TrendingDown,
  Info,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function TokenCalculatorModal() {
  const open = useAuthStore((s) => s.calculatorModalOpen);
  const setOpen = useAuthStore((s) => s.setCalculatorModalOpen);
  const setPricingOpen = useAuthStore((s) => s.setPricingModalOpen);

  // Calculator inputs state
  const [sceneCount, setSceneCount] = useState<number>(10);
  const [scriptComplexity, setScriptComplexity] = useState<ScriptComplexity>('standard');
  const [modelId, setModelId] = useState<string>('gpt-4o');
  const [visualDensity, setVisualDensity] = useState<VisualDensity>('each_slide');
  const [imageProviderId, setImageProviderId] = useState<string>('flux-schnell');
  const [voiceNarrator, setVoiceNarrator] = useState<VoiceNarrator>('edge-tts');
  const [videoExport, setVideoExport] = useState<VideoExportQuality>('video-render-local');
  const [hasWebSearch, setHasWebSearch] = useState<boolean>(true);
  const [pdfPagesCount, setPdfPagesCount] = useState<number>(10);

  // Compute estimate live
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

  // Model comparison table data
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
        provider: LLM_MODELS_PRICING[mid]?.provider || '',
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-border/50 bg-background/95 backdrop-blur-2xl shadow-2xl rounded-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-br from-emerald-600/10 via-teal-500/5 to-primary/10 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Calculator className="w-3.5 h-3.5" />
              <span>Token Consumption & Cost Calculator</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>Real-time Multi-Modality Pricing Matrix</span>
            </div>
          </div>

          <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground mt-2">
            Interactive Classroom Cost Estimator
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Simulate token usage and provider costs for generating interactive courses across LLM,
            Voice synthesis, AI Illustrations, and Video rendering.
          </DialogDescription>
        </div>

        {/* Two-column Layout Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto flex-1 divide-y md:divide-y-0 md:divide-x divide-border/40">
          {/* Left Column: Interactive Controls (7 cols) */}
          <div className="md:col-span-7 p-6 space-y-6">
            {/* 1. Scenes slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Number of Slides / Scenes
                </Label>
                <span className="text-xs font-black px-2 py-0.5 rounded bg-muted text-foreground">
                  {sceneCount} scenes
                </span>
              </div>
              <Slider
                value={[sceneCount]}
                onValueChange={(vals) => setSceneCount(vals[0])}
                min={3}
                max={30}
                step={1}
                className="py-1"
              />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setSceneCount(5)}
                  className="hover:text-foreground"
                >
                  Quick: 5 slides
                </button>
                <button
                  type="button"
                  onClick={() => setSceneCount(10)}
                  className="hover:text-foreground font-semibold"
                >
                  Standard: 10 slides
                </button>
                <button
                  type="button"
                  onClick={() => setSceneCount(20)}
                  className="hover:text-foreground"
                >
                  Full Course: 20 slides
                </button>
              </div>
            </div>

            {/* 2. Script Complexity */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Script Depth & Dialogue Density
              </Label>
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
                      'p-2 rounded-lg border text-center transition-all',
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

            {/* 3. Primary LLM Model */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Generative AI Model
              </Label>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full text-xs font-medium p-2 rounded-lg border border-border/60 bg-background text-foreground"
              >
                {Object.values(LLM_MODELS_PRICING).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (${m.inputPerMillion}/M in, ${m.outputPerMillion}/M out)
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Visual Density & Image Provider */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Slide Illustrations</Label>
                <select
                  value={visualDensity}
                  onChange={(e) => setVisualDensity(e.target.value as VisualDensity)}
                  className="w-full text-xs font-medium p-2 rounded-lg border border-border/60 bg-background text-foreground"
                >
                  <option value="none">No Images (Text/Shapes only)</option>
                  <option value="few">Few Key Slides (~30%)</option>
                  <option value="each_slide">Illustration on Every Slide</option>
                  <option value="diagrams_and_illustrations">Heavy Visuals & Diagrams</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Image Generator</Label>
                <select
                  value={imageProviderId}
                  onChange={(e) => setImageProviderId(e.target.value)}
                  className="w-full text-xs font-medium p-2 rounded-lg border border-border/60 bg-background text-foreground"
                >
                  {Object.values(IMAGE_PRICING).map((img) => (
                    <option key={img.id} value={img.id}>
                      {img.name} (${img.costPerImage}/img)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. Voiceover & Video Export */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Speech Narration (TTS)</Label>
                <select
                  value={voiceNarrator}
                  onChange={(e) => setVoiceNarrator(e.target.value as VoiceNarrator)}
                  className="w-full text-xs font-medium p-2 rounded-lg border border-border/60 bg-background text-foreground"
                >
                  {Object.values(TTS_PRICING).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Video Export Compositor</Label>
                <select
                  value={videoExport}
                  onChange={(e) => setVideoExport(e.target.value as VideoExportQuality)}
                  className="w-full text-xs font-medium p-2 rounded-lg border border-border/60 bg-background text-foreground"
                >
                  <option value="none">No Video Render</option>
                  <option value="video-render-local">Native 1080p Canvas ($0.001/s)</option>
                  <option value="hailuo-video">MiniMax Hailuo AI ($0.05/s)</option>
                </select>
              </div>
            </div>

            {/* 6. Toggles: Web Search & PDF Pages */}
            <div className="pt-2 flex items-center justify-between border-t border-border/40">
              <div className="flex items-center gap-2">
                <Switch
                  checked={hasWebSearch}
                  onCheckedChange={setHasWebSearch}
                  id="calc-web-search"
                />
                <Label htmlFor="calc-web-search" className="text-xs font-medium cursor-pointer">
                  Include Web Research (Tavily/Brave)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="calc-pdf" className="text-xs text-muted-foreground">
                  PDF Source Pages:
                </Label>
                <input
                  id="calc-pdf"
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

          {/* Right Column: Computed Outputs & Benchmark Table (5 cols) */}
          <div className="md:col-span-5 p-6 bg-muted/20 flex flex-col justify-between space-y-6">
            {/* Top Stat Cards */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border/60 bg-background shadow-sm space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Platform Tokens</span>
                  </div>
                  <div className="text-2xl font-black text-foreground tabular-nums">
                    {estimate.totalPlatformTokens.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {estimate.totalLlmTokens.toLocaleString()} LLM + media units
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-background shadow-sm space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Estimated Cost</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ${estimate.rawProviderCostUsd}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Provider API raw rate
                  </div>
                </div>
              </div>

              {/* Time & Media stats */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-background/60 border border-border/40 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Est. Generation:</span>
                  <span className="font-bold text-foreground">
                    ~{estimate.estimatedGenerationTimeSec}s
                  </span>
                </div>
                <div className="text-muted-foreground">
                  <span>Audio: </span>
                  <span className="font-bold text-foreground">
                    {estimate.estimatedAudioMinutes}m
                  </span>
                  <span> | Images: </span>
                  <span className="font-bold text-foreground">{estimate.totalImages}</span>
                </div>
              </div>

              {/* Modality Stacked Breakdown */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Modality Breakdown</span>
                  <span className="text-muted-foreground text-[11px]">Cost Share</span>
                </div>

                <div className="space-y-1.5 text-xs">
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

              {/* Benchmark Table across models */}
              <div className="pt-2 space-y-2 border-t border-border/40">
                <div className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Model Cost Comparison</span>
                  <span className="text-[10px] text-muted-foreground">Same course</span>
                </div>
                <div className="space-y-1.5">
                  {comparisons.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        'flex items-center justify-between p-1.5 px-2 rounded text-xs transition-colors',
                        c.id === modelId
                          ? 'bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300'
                          : 'text-muted-foreground hover:bg-muted/30',
                      )}
                    >
                      <span className="truncate max-w-[160px]">{c.name}</span>
                      <span className="font-mono text-[11px] tabular-nums">
                        ${c.cost.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Tier Banner & Upgrade Trigger */}
            <div className="p-3.5 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-purple-500/5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Recommended Plan
                </div>
                <div className="text-sm font-extrabold text-foreground capitalize">
                  {estimate.recommendedPlan} Plan
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setPricingOpen(true);
                }}
                className="text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
              >
                View Plans
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
