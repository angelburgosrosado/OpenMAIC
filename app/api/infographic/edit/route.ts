import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { editInfographicImage } from '@/lib/server/grounded-infographic';

export const maxDuration = 180;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData, editPrompt } = body as {
      imageData?: string;
      editPrompt?: string;
    };

    if (!imageData) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Original image data is required');
    }

    if (!editPrompt || !editPrompt.trim()) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Edit prompt is required');
    }

    const clientApiKey =
      request.headers.get('x-google-api-key') ||
      request.headers.get('x-api-key') ||
      undefined;

    const updatedImageData = await editInfographicImage(
      imageData,
      editPrompt.trim(),
      clientApiKey,
    );

    return apiSuccess({ imageData: updatedImageData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Image modification failed';
    return apiError('GENERATION_FAILED', 500, message);
  }
}
