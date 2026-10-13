import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  researchTopicForPrompt,
  generateInfographicImage,
  editInfographicImage,
  resolveGoogleApiKey,
} from '@/lib/server/grounded-infographic';

describe('Grounded Infographic Service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('resolves Google API key from client or environment', () => {
    const key = resolveGoogleApiKey('test-client-key');
    expect(key).toBe('test-client-key');
  });

  it('researches a topic using search grounding and extracts facts and prompt', async () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  facts: ['Photosynthesis converts light to glucose', 'Chloroplasts absorb photons'],
                  imagePrompt: 'A 16:9 infographic of plant photosynthesis',
                }),
              },
            ],
          },
          groundingMetadata: {
            groundingChunks: [
              {
                web: {
                  uri: 'https://example.edu/photosynthesis',
                  title: 'Photosynthesis Overview',
                },
              },
            ],
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGeminiResponse,
    } as Response);

    const result = await researchTopicForPrompt(
      'Photosynthesis',
      'High School',
      'Default',
      'English',
      'fake-api-key',
    );

    expect(result.facts).toHaveLength(2);
    expect(result.facts[0]).toContain('Photosynthesis');
    expect(result.searchResults).toHaveLength(1);
    expect(result.searchResults[0].url).toBe('https://example.edu/photosynthesis');
    expect(result.imagePrompt).toBe('A 16:9 infographic of plant photosynthesis');
  });

  it('generates an infographic image using Gemini native image endpoint', async () => {
    const mockImageResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                },
              },
            ],
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockImageResponse,
    } as Response);

    const dataUrl = await generateInfographicImage('A 16:9 infographic', 'fake-api-key');
    expect(dataUrl).toContain('data:image/png;base64,');
  });

  it('iteratively edits an infographic using multimodal prompt', async () => {
    const mockEditResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: 'MODIFIED_BASE64_PAYLOAD',
                },
              },
            ],
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockEditResponse,
    } as Response);

    const result = await editInfographicImage(
      'data:image/png;base64,OLD_IMAGE_DATA',
      'Highlight chloroplast in yellow',
      'fake-api-key',
    );

    expect(result).toBe('data:image/png;base64,MODIFIED_BASE64_PAYLOAD');
  });
});
