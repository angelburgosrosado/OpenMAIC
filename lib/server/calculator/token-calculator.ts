import {
  LLM_MODELS_PRICING,
  TTS_PRICING,
  IMAGE_PRICING,
  VIDEO_PRICING,
  OTHER_PRICING,
  type ModelPricing,
} from './pricing-data';

export type ScriptComplexity = 'concise' | 'standard' | 'in_depth' | 'academic';
export type VisualDensity = 'none' | 'few' | 'each_slide' | 'diagrams_and_illustrations';
export type VoiceNarrator = 'none' | 'edge-tts' | 'openai-tts' | 'elevenlabs-multilingual' | 'azure-neural';
export type VideoExportQuality = 'none' | 'video-render-local' | 'hailuo-video';

export interface CourseEstimateInput {
  sceneCount: number; // e.g. 5, 10, 15, 25
  scriptComplexity: ScriptComplexity;
  modelId: string;
  visualDensity: VisualDensity;
  imageProviderId: string;
  voiceNarrator: VoiceNarrator;
  videoExport: VideoExportQuality;
  hasWebSearch: boolean;
  pdfPagesCount: number;
}

export interface ModalityBreakdown {
  label: string;
  tokens: number;
  costUsd: number;
  percentage: number;
}

export interface CourseEstimateResult {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalLlmTokens: number;
  totalAudioCharacters: number;
  estimatedAudioMinutes: number;
  totalImages: number;
  videoSeconds: number;
  webSearchQueries: number;
  totalPlatformTokens: number;
  rawProviderCostUsd: number;
  breakdown: {
    llm: ModalityBreakdown;
    tts: ModalityBreakdown;
    image: ModalityBreakdown;
    video: ModalityBreakdown;
    search: ModalityBreakdown;
    pdf: ModalityBreakdown;
  };
  recommendedPlan: 'free' | 'pro' | 'enterprise';
  estimatedGenerationTimeSec: number;
}

// Words & character multipliers based on complexity
const COMPLEXITY_SCRIPT_CHARS: Record<ScriptComplexity, number> = {
  concise: 250, // ~40 words per slide (~15 sec)
  standard: 600, // ~90 words per slide (~35 sec)
  in_depth: 1200, // ~180 words per slide (~75 sec)
  academic: 2000, // ~300 words per slide (~120 sec)
};

export function estimateCourseConsumption(input: CourseEstimateInput): CourseEstimateResult {
  const model = LLM_MODELS_PRICING[input.modelId] || LLM_MODELS_PRICING['gpt-4o'];
  const tts = TTS_PRICING[input.voiceNarrator] || TTS_PRICING['edge-tts'];
  const image = IMAGE_PRICING[input.imageProviderId] || IMAGE_PRICING['flux-schnell'];
  const video = VIDEO_PRICING[input.videoExport] || VIDEO_PRICING['video-render-local'];

  const scenes = Math.max(1, input.sceneCount);
  const charsPerScene = COMPLEXITY_SCRIPT_CHARS[input.scriptComplexity];

  // 1. LLM Tokens Calculation
  // Planning phase: system prompt (~2k) + requirements (~1k) + outline generation (~1.5k)
  const planningInputTokens = 3000 + (input.pdfPagesCount * 400); // ~400 tokens extracted per PDF page
  const planningOutputTokens = 1500 + scenes * 120;

  // Scene generation phase: each scene prompt includes context, theme, previous scenes (~4k tokens)
  // Scene output: DSL JSON (layout, widgets, speech script, visual prompt) (~800-1500 tokens)
  const sceneInputTokensPerScene = 3500 + (input.hasWebSearch ? 1000 : 0);
  const sceneOutputTokensPerScene = 400 + Math.round(charsPerScene * 0.7);

  const totalInputTokens = planningInputTokens + (scenes * sceneInputTokensPerScene);
  const totalOutputTokens = planningOutputTokens + (scenes * sceneOutputTokensPerScene);
  const totalLlmTokens = totalInputTokens + totalOutputTokens;

  // LLM Cost
  const llmCostUsd =
    (totalInputTokens / 1_000_000) * model.inputPerMillion +
    (totalOutputTokens / 1_000_000) * model.outputPerMillion;

  // 2. Audio TTS Calculation
  let totalAudioChars = 0;
  let estimatedAudioMinutes = 0;
  let ttsCostUsd = 0;

  if (input.voiceNarrator !== 'none') {
    totalAudioChars = scenes * charsPerScene;
    // Average speech rate: ~900 characters per minute (~150 words/min)
    estimatedAudioMinutes = +(totalAudioChars / 900).toFixed(1);
    ttsCostUsd = (totalAudioChars / 1_000_000) * tts.costPerMillionChars;
  }

  // 3. Image Generation
  let totalImages = 0;
  if (input.visualDensity === 'few') {
    totalImages = Math.max(1, Math.round(scenes * 0.3));
  } else if (input.visualDensity === 'each_slide') {
    totalImages = scenes;
  } else if (input.visualDensity === 'diagrams_and_illustrations') {
    totalImages = Math.round(scenes * 1.5);
  }
  const imageCostUsd = totalImages * image.costPerImage;

  // 4. Video Rendering
  let videoSeconds = 0;
  let videoCostUsd = 0;
  if (input.videoExport !== 'none') {
    videoSeconds = Math.round(estimatedAudioMinutes * 60) || scenes * 30;
    videoCostUsd = videoSeconds * video.costPerSecond;
  }

  // 5. Web Search
  const webSearchQueries = input.hasWebSearch ? Math.max(2, Math.round(scenes * 0.5)) : 0;
  const searchCostUsd = (webSearchQueries / 1000) * OTHER_PRICING.webSearchPer1kQueries;

  // 6. PDF Extraction
  const pdfCostUsd = (input.pdfPagesCount / 1000) * OTHER_PRICING.pdfParsePer1kPages;

  // Total raw provider cost
  const rawProviderCostUsd = +(
    llmCostUsd +
    ttsCostUsd +
    imageCostUsd +
    videoCostUsd +
    searchCostUsd +
    pdfCostUsd
  ).toFixed(4);

  // Platform token conversion:
  // Standard pricing conversion base: 1 USD ≈ 100,000 OpenMAIC platform tokens
  const nonLlmCost = ttsCostUsd + imageCostUsd + videoCostUsd + searchCostUsd + pdfCostUsd;
  const convertedMediaTokens = Math.round(nonLlmCost * 100_000);
  const totalPlatformTokens = totalLlmTokens + convertedMediaTokens;

  // Percentages breakdown
  const totalSafe = rawProviderCostUsd > 0 ? rawProviderCostUsd : 0.0001;
  const breakdown = {
    llm: {
      label: `LLM (${model.name})`,
      tokens: totalLlmTokens,
      costUsd: +llmCostUsd.toFixed(4),
      percentage: Math.round((llmCostUsd / totalSafe) * 100),
    },
    tts: {
      label: `Audio TTS (${tts.name})`,
      tokens: Math.round(ttsCostUsd * 100_000),
      costUsd: +ttsCostUsd.toFixed(4),
      percentage: Math.round((ttsCostUsd / totalSafe) * 100),
    },
    image: {
      label: `Illustrations (${image.name})`,
      tokens: Math.round(imageCostUsd * 100_000),
      costUsd: +imageCostUsd.toFixed(4),
      percentage: Math.round((imageCostUsd / totalSafe) * 100),
    },
    video: {
      label: `Video (${video.name})`,
      tokens: Math.round(videoCostUsd * 100_000),
      costUsd: +videoCostUsd.toFixed(4),
      percentage: Math.round((videoCostUsd / totalSafe) * 100),
    },
    search: {
      label: `Web Research (${webSearchQueries} queries)`,
      tokens: Math.round(searchCostUsd * 100_000),
      costUsd: +searchCostUsd.toFixed(4),
      percentage: Math.round((searchCostUsd / totalSafe) * 100),
    },
    pdf: {
      label: `PDF Parsing (${input.pdfPagesCount} pages)`,
      tokens: Math.round(pdfCostUsd * 100_000),
      costUsd: +pdfCostUsd.toFixed(4),
      percentage: Math.round((pdfCostUsd / totalSafe) * 100),
    },
  };

  // Recommended plan
  let recommendedPlan: 'free' | 'pro' | 'enterprise' = 'free';
  if (totalPlatformTokens > 1_500_000 || totalImages > 20 || videoSeconds > 600 || model.recommendedRole === 'flagship') {
    recommendedPlan = 'pro';
  }
  if (totalPlatformTokens > 5_000_000 || scenes > 30 || videoSeconds > 1800) {
    recommendedPlan = 'enterprise';
  }

  // Generation time in seconds:
  // Outline ~6s + scene generations ~2s per scene (concurrent batches) + images ~3s + TTS ~1.5s
  const estimatedGenerationTimeSec = Math.round(
    6 + (scenes * 2.5) + (totalImages * 3.2) + (estimatedAudioMinutes * 1.5)
  );

  return {
    totalInputTokens,
    totalOutputTokens,
    totalLlmTokens,
    totalAudioCharacters: totalAudioChars,
    estimatedAudioMinutes,
    totalImages,
    videoSeconds,
    webSearchQueries,
    totalPlatformTokens,
    rawProviderCostUsd,
    breakdown,
    recommendedPlan,
    estimatedGenerationTimeSec,
  };
}
