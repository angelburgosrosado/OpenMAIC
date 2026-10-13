import { afterEach, describe, expect, it, vi } from 'vitest';
import { Check } from 'typebox/value';

const mocks = vi.hoisted(() => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  researchTopicForPrompt: vi.fn(),
  generateInfographicImage: vi.fn(),
}));

vi.mock('node:fs', () => ({ promises: { mkdir: mocks.mkdir, writeFile: mocks.writeFile } }));
vi.mock('@/lib/server/grounded-infographic', () => ({
  researchTopicForPrompt: mocks.researchTopicForPrompt,
  generateInfographicImage: mocks.generateInfographicImage,
}));

import {
  buildGenerateInfographicTool,
  GenerateInfographicParams,
  GENERATE_INFOGRAPHIC_TOOL_NAME,
} from '@/lib/server/agent-runtime/generate-infographic';

describe('generate_infographic agent runtime tool', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('validates required parameters and schema constraints', () => {
    expect(
      Check(GenerateInfographicParams, {
        stageId: 'stage-1',
        topic: 'Mitochondrial ATP production',
      }),
    ).toBe(true);

    expect(
      Check(GenerateInfographicParams, {
        stageId: 'stage-1',
        topic: 'Quantum Computing',
        complexityLevel: 'College',
        visualStyle: 'Sketch',
        language: 'English',
      }),
    ).toBe(true);

    // Empty topic should fail
    expect(
      Check(GenerateInfographicParams, {
        stageId: 'stage-1',
        topic: '',
      }),
    ).toBe(false);

    // Missing stageId should fail
    expect(
      Check(GenerateInfographicParams, {
        topic: 'Physics',
      }),
    ).toBe(false);
  });

  it('executes grounded research and image generation successfully', async () => {
    mocks.researchTopicForPrompt.mockResolvedValue({
      facts: ['Mitochondria have double membranes', 'ATP is produced via ATP synthase'],
      searchResults: [
        {
          title: 'Cellular Respiration Guide',
          url: 'https://example.com/respiration',
        },
      ],
      imagePrompt: 'A detailed 16:9 diagram of ATP synthase and mitochondria',
    });

    mocks.generateInfographicImage.mockResolvedValue(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    );

    const tool = buildGenerateInfographicTool({ sessionId: 'session-test' });
    expect(tool.name).toBe(GENERATE_INFOGRAPHIC_TOOL_NAME);

    const result = await tool.execute('call-1', {
      stageId: 'stage-123',
      topic: 'Cellular Respiration',
      complexityLevel: 'College',
      visualStyle: 'Default',
    });

    expect(mocks.researchTopicForPrompt).toHaveBeenCalledWith(
      'Cellular Respiration',
      'College',
      'Default',
      'English',
    );
    expect(mocks.generateInfographicImage).toHaveBeenCalledWith(
      'A detailed 16:9 diagram of ATP synthase and mitochondria',
    );
    expect(mocks.mkdir).toHaveBeenCalled();
    expect(mocks.writeFile).toHaveBeenCalled();

    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.src).toContain('/api/classroom-media/stage-123/media/infographic-');
    expect(parsed.facts).toHaveLength(2);
    expect(parsed.citations[0].url).toBe('https://example.com/respiration');
  });
});
