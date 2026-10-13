import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { generateInfographicImage } from '@/lib/server/grounded-infographic';

export const maxDuration = 180;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imagePrompt } = body as { imagePrompt?: string };

    if (!imagePrompt || !imagePrompt.trim()) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Image prompt is required');
    }

    const clientApiKey =
      request.headers.get('x-google-api-key') ||
      request.headers.get('x-api-key') ||
      undefined;

    const imageData = await generateInfographicImage(imagePrompt.trim(), clientApiKey);

    return apiSuccess({ imageData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Image generation failed';
    return apiError('GENERATION_FAILED', 500, message);
  }
}
