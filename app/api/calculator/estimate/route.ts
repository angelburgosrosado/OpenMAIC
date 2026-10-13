import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  estimateCourseConsumption,
  type CourseEstimateInput,
} from '@/lib/server/calculator/token-calculator';
import {
  LLM_MODELS_PRICING,
  TTS_PRICING,
  IMAGE_PRICING,
  VIDEO_PRICING,
} from '@/lib/server/calculator/pricing-data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const input: CourseEstimateInput = {
      sceneCount: Number(body.sceneCount) || 10,
      scriptComplexity: body.scriptComplexity || 'standard',
      modelId: body.modelId || 'gpt-4o',
      visualDensity: body.visualDensity || 'few',
      imageProviderId: body.imageProviderId || 'flux-schnell',
      voiceNarrator: body.voiceNarrator || 'edge-tts',
      videoExport: body.videoExport || 'video-render-local',
      hasWebSearch: Boolean(body.hasWebSearch),
      pdfPagesCount: Number(body.pdfPagesCount) || 0,
    };

    const estimate = estimateCourseConsumption(input);

    return apiSuccess({
      estimate,
      pricingData: {
        models: LLM_MODELS_PRICING,
        tts: TTS_PRICING,
        images: IMAGE_PRICING,
        video: VIDEO_PRICING,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Calculation error';
    return apiError('INTERNAL_ERROR', 500, msg);
  }
}

export async function GET() {
  return apiSuccess({
    pricingData: {
      models: LLM_MODELS_PRICING,
      tts: TTS_PRICING,
      images: IMAGE_PRICING,
      video: VIDEO_PRICING,
    },
  });
}
