import {
  InfographicComplexityLevel,
  InfographicVisualStyle,
  InfographicLanguage,
  InfographicResearchResult,
} from '@/lib/types/infographic';

function getAuthHeaders(apiKey?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey?.trim()) {
    headers['x-google-api-key'] = apiKey.trim();
  }
  return headers;
}

export async function researchTopic(
  topic: string,
  complexityLevel: InfographicComplexityLevel,
  visualStyle: InfographicVisualStyle,
  language: InfographicLanguage,
  apiKey?: string,
): Promise<InfographicResearchResult> {
  const response = await fetch('/api/infographic/research', {
    method: 'POST',
    headers: getAuthHeaders(apiKey),
    body: JSON.stringify({
      topic,
      complexityLevel,
      visualStyle,
      language,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to research topic');
  }

  return data.result;
}

export async function generateInfographic(
  imagePrompt: string,
  apiKey?: string,
): Promise<string> {
  const response = await fetch('/api/infographic/generate', {
    method: 'POST',
    headers: getAuthHeaders(apiKey),
    body: JSON.stringify({ imagePrompt }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to generate infographic');
  }

  return data.imageData;
}

export async function editInfographic(
  imageData: string,
  editPrompt: string,
  apiKey?: string,
): Promise<string> {
  const response = await fetch('/api/infographic/edit', {
    method: 'POST',
    headers: getAuthHeaders(apiKey),
    body: JSON.stringify({ imageData, editPrompt }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to edit infographic');
  }

  return data.imageData;
}
