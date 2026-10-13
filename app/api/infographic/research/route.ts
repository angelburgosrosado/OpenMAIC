import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { researchTopicForPrompt } from '@/lib/server/grounded-infographic';
import type {
  InfographicComplexityLevel,
  InfographicVisualStyle,
  InfographicLanguage,
} from '@/lib/types/infographic';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, complexityLevel, visualStyle, language } = body as {
      topic?: string;
      complexityLevel?: InfographicComplexityLevel;
      visualStyle?: InfographicVisualStyle;
      language?: InfographicLanguage;
    };

    if (!topic || !topic.trim()) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Topic is required');
    }

    const clientApiKey =
      request.headers.get('x-google-api-key') ||
      request.headers.get('x-api-key') ||
      undefined;

    const result = await researchTopicForPrompt(
      topic.trim(),
      complexityLevel || 'High School',
      visualStyle || 'Default',
      language || 'English',
      clientApiKey,
    );

    return apiSuccess({ result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Research grounding failed';
    return apiError('GENERATION_FAILED', 500, message);
  }
}
