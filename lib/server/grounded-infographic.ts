/**
 * Grounded Infographic & Visual Knowledge Service
 *
 * Implements Google Search Grounding to research educational topics,
 * extract factual citations, formulate optimized infographic prompts,
 * and generate / iteratively edit 16:9 visual knowledge diagrams.
 */

import { createLogger } from '@/lib/logger';
import {
  InfographicComplexityLevel,
  InfographicVisualStyle,
  InfographicLanguage,
  InfographicResearchResult,
  SearchResultItem,
} from '@/lib/types/infographic';
import {
  resolveImageApiKey,
  resolveImageBaseUrl,
  resolveImageModel,
  resolveServerImageProviderId,
} from '@/lib/server/provider-config';
import { generateImage } from '@/lib/media/image-providers';
import type { ImageProviderId } from '@/lib/media/types';

const log = createLogger('GroundedInfographic');

const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';
const DEFAULT_RESEARCH_MODEL = 'gemini-2.5-flash';
const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

/**
 * Resolves Google API key from server configuration, environment, or client override.
 */
export function resolveGoogleApiKey(clientKey?: string): string {
  if (clientKey?.trim()) return clientKey.trim();

  // 1. Image provider nano-banana key
  const nanoKey = resolveImageApiKey('nano-banana');
  if (nanoKey) return nanoKey;

  // 2. Direct env vars
  return (
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.IMAGE_NANO_BANANA_API_KEY ||
    ''
  );
}

/**
 * Step 1: Research a topic using Google Search Grounding with Gemini,
 * extracting verified facts, search source citations, and a tailored 16:9 image prompt.
 */
export async function researchTopicForPrompt(
  topic: string,
  complexityLevel: InfographicComplexityLevel,
  visualStyle: InfographicVisualStyle,
  language: InfographicLanguage,
  clientApiKey?: string,
): Promise<InfographicResearchResult> {
  const apiKey = resolveGoogleApiKey(clientApiKey);
  if (!apiKey) {
    throw new Error(
      'Google API Key is required for search grounding. Please configure GOOGLE_API_KEY or select a Gemini key.',
    );
  }

  const prompt = `You are an expert scientific researcher and educational diagram designer.
Your task is to research the following topic and design an educational 16:9 infographic diagram.

Topic: "${topic}"
Target Audience / Complexity: "${complexityLevel}"
Visual Aesthetic Style: "${visualStyle}"
Language: "${language}"

First, conduct Google search grounding to find verified facts, current accurate terminology, and educational structures.
Then formulate an optimized prompt for an image generation model to produce a clear, authoritative, beautiful 16:9 infographic visual aid.

You MUST respond strictly with a valid JSON object in the following format, with NO Markdown backticks:
{
  "facts": [
    "Verified fact 1 about ${topic} tailored to ${complexityLevel} audience",
    "Verified fact 2",
    "Verified fact 3",
    "Verified fact 4"
  ],
  "imagePrompt": "A comprehensive 16:9 educational infographic diagram of ${topic}, aesthetic style: ${visualStyle}, designed for ${complexityLevel} level, featuring clear diagrams, scientific illustration, clean layout, labeled components in ${language}, vibrant high-definition educational visuals"
}`;

  const url = `${DEFAULT_GEMINI_BASE_URL}/v1beta/models/${DEFAULT_RESEARCH_MODEL}:generateContent`;

  log.info('Conducting search grounding research for topic: %s', topic);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('Gemini research API error: %d - %s', response.status, errorText);
    throw new Error(`Google Search Grounding failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const responseText = candidate?.content?.parts?.[0]?.text || '';

  // Extract grounding search results / citations
  const searchResults: SearchResultItem[] = [];
  const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
  for (const chunk of groundingChunks) {
    if (chunk.web?.uri) {
      searchResults.push({
        title: chunk.web.title || chunk.web.uri,
        url: chunk.web.uri,
        snippet: chunk.web.title,
      });
    }
  }

  // Parse structured facts and imagePrompt from responseText
  let parsed: { facts?: string[]; imagePrompt?: string } = {};
  try {
    const cleanJson = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    parsed = JSON.parse(cleanJson);
  } catch (_err) {
    log.warn('Could not parse strict JSON from Gemini response, attempting regex recovery');
    const factsMatch = responseText.match(/"facts"\s*:\s*\[(.*?)\]/s);
    const promptMatch = responseText.match(/"imagePrompt"\s*:\s*"([^"]+)"/);

    const facts: string[] = [];
    if (factsMatch) {
      const items = factsMatch[1].split(/",\s*"/);
      for (const item of items) {
        facts.push(item.replace(/[\[\]"']/g, '').trim());
      }
    }
    parsed = {
      facts: facts.length > 0 ? facts : [topic],
      imagePrompt: promptMatch ? promptMatch[1] : `Educational 16:9 infographic explaining ${topic}`,
    };
  }

  const facts = Array.isArray(parsed.facts) && parsed.facts.length > 0 ? parsed.facts : [topic];
  const imagePrompt =
    parsed.imagePrompt ||
    `Educational 16:9 infographic of ${topic}, ${visualStyle} style, tailored for ${complexityLevel}`;

  return {
    facts,
    searchResults,
    imagePrompt,
  };
}

/**
 * Step 2: Generate the 16:9 infographic image using Gemini or configured image provider.
 */
export async function generateInfographicImage(
  imagePrompt: string,
  clientApiKey?: string,
): Promise<string> {
  const googleApiKey = resolveGoogleApiKey(clientApiKey);

  // If Google API key is available, use Gemini native image generation
  if (googleApiKey) {
    try {
      const model = resolveImageModel('nano-banana') || DEFAULT_IMAGE_MODEL;
      const url = `${DEFAULT_GEMINI_BASE_URL}/v1beta/models/${model}:generateContent`;

      log.info('Generating infographic with Gemini model: %s', model);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': googleApiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${imagePrompt}. 16:9 wide landscape format infographic diagram.` }],
            },
          ],
          generationConfig: {
            responseModalities: ['IMAGE'],
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const parts: GeminiPart[] = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p) => p.inlineData);
        if (imagePart?.inlineData?.data) {
          const mime = imagePart.inlineData.mimeType || 'image/png';
          return `data:${mime};base64,${imagePart.inlineData.data}`;
        }
      } else {
        const errText = await response.text();
        log.warn('Gemini image generation returned %d: %s. Attempting fallback.', response.status, errText);
      }
    } catch (geminiErr) {
      log.warn('Gemini direct image generation failed, checking OpenMAIC providers: %o', geminiErr);
    }
  }

  // Fallback to OpenMAIC's configured image provider (OpenAI, Seedream, etc.)
  const defaultProvider = resolveServerImageProviderId() as ImageProviderId | undefined;
  if (defaultProvider) {
    log.info('Falling back to OpenMAIC configured image provider: %s', defaultProvider);
    const result = await generateImage(
      defaultProvider,
      {
        apiKey: resolveImageApiKey(defaultProvider, clientApiKey),
        baseUrl: resolveImageBaseUrl(defaultProvider),
        model: resolveImageModel(defaultProvider),
      },
      {
        prompt: `${imagePrompt}. 16:9 aspect ratio educational infographic diagram.`,
        aspectRatio: '16:9',
        width: 1344,
        height: 768,
      },
    );

    if (result.base64) {
      return `data:image/png;base64,${result.base64}`;
    }
    if (result.url) {
      return result.url;
    }
  }

  throw new Error('Image generation failed. Please configure a valid Gemini or Image provider API key.');
}

/**
 * Step 3: Iteratively edit an existing infographic diagram using Gemini multimodal image-to-image.
 */
export async function editInfographicImage(
  currentImageData: string,
  editPrompt: string,
  clientApiKey?: string,
): Promise<string> {
  const apiKey = resolveGoogleApiKey(clientApiKey);
  if (!apiKey) {
    throw new Error('Google API Key is required for image editing.');
  }

  // Clean data URL to extract base64
  let cleanBase64 = currentImageData;
  let mimeType = 'image/png';
  if (currentImageData.startsWith('data:')) {
    const commaIdx = currentImageData.indexOf(',');
    if (commaIdx !== -1) {
      const prefix = currentImageData.substring(0, commaIdx);
      cleanBase64 = currentImageData.substring(commaIdx + 1);
      const mimeMatch = prefix.match(/data:([^;]+)/);
      if (mimeMatch) mimeType = mimeMatch[1];
    }
  }

  const model = resolveImageModel('nano-banana') || DEFAULT_IMAGE_MODEL;
  const url = `${DEFAULT_GEMINI_BASE_URL}/v1beta/models/${model}:generateContent`;

  log.info('Iteratively editing infographic diagram with prompt: %s', editPrompt);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `Modify this educational infographic diagram according to instruction: "${editPrompt}". Maintain high visual clarity, 16:9 aspect ratio, clean typography and educational layout.`,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('Gemini edit image failed: %d - %s', response.status, errorText);
    throw new Error(`Infographic modification failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const parts: GeminiPart[] = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error('Image modification did not return updated visual data.');
  }

  const outMime = imagePart.inlineData.mimeType || 'image/png';
  return `data:${outMime};base64,${imagePart.inlineData.data}`;
}
