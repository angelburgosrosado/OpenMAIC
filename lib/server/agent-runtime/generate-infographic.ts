import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { AgentTool } from '@earendil-works/pi-agent-core';
import { Type, type Static } from 'typebox';

import { createLogger } from '@/lib/logger';
import { CLASSROOMS_DIR } from '@/lib/server/classroom-storage';
import {
  researchTopicForPrompt,
  generateInfographicImage,
} from '@/lib/server/grounded-infographic';
import type {
  InfographicComplexityLevel,
  InfographicVisualStyle,
  InfographicLanguage,
} from '@/lib/types/infographic';
import type { CourseToolDeps } from './course-tools';
import { COURSE_STAGE_ID_DESCRIPTION } from './course-stage';
import { errorResult } from './media-tool-result';

const log = createLogger('AgentGenerateInfographic');

export const GENERATE_INFOGRAPHIC_TOOL_NAME = 'generate_infographic';

export const GenerateInfographicParams = Type.Object({
  stageId: Type.String({ description: COURSE_STAGE_ID_DESCRIPTION }),
  topic: Type.String({
    minLength: 1,
    description:
      'The educational concept, scientific mechanism, process, or historical subject to research and visualize.',
  }),
  complexityLevel: Type.Optional(
    Type.Union(
      [
        Type.Literal('Elementary'),
        Type.Literal('High School'),
        Type.Literal('College'),
        Type.Literal('Expert'),
      ],
      {
        description: 'Target learner level. Defaults to High School.',
      },
    ),
  ),
  visualStyle: Type.Optional(
    Type.Union(
      [
        Type.Literal('Default'),
        Type.Literal('Sketch'),
        Type.Literal('3D Render'),
        Type.Literal('Vintage'),
        Type.Literal('Cartoon'),
        Type.Literal('Futuristic'),
        Type.Literal('Minimalist'),
        Type.Literal('Realistic'),
      ],
      {
        description:
          'Aesthetic illustration style (e.g. Sketch = Technical Blueprint, Default = Standard Scientific).',
      },
    ),
  ),
  language: Type.Optional(
    Type.String({
      description: 'Language for diagram labels (e.g. English, Spanish, Mandarin).',
    }),
  ),
});

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error('aborted');
}

export function buildGenerateInfographicTool(
  deps: Pick<CourseToolDeps, 'sessionId' | 'abortSignal'>,
): AgentTool<typeof GenerateInfographicParams> {
  return {
    name: GENERATE_INFOGRAPHIC_TOOL_NAME,
    label: 'Generate grounded infographic',
    description:
      'Researches a topic with Google Search grounding to retrieve verified facts and citations, formulates an audience-tailored prompt, generates a high-definition 16:9 infographic diagram, and persists it to the stage media assets. Returns src, verified facts, and citations for use in slides or lesson notes.',
    parameters: GenerateInfographicParams,
    async execute(toolCallId, params: Static<typeof GenerateInfographicParams>, signal) {
      const callerSignal = signal ?? deps.abortSignal;
      throwIfAborted(callerSignal);

      const topic = params.topic.trim();
      if (!topic) {
        return errorResult('Infographic generation failed: topic must not be empty.');
      }

      const stageId = params.stageId;
      const complexityLevel: InfographicComplexityLevel =
        params.complexityLevel || 'High School';
      const visualStyle: InfographicVisualStyle =
        params.visualStyle || 'Default';
      const language: InfographicLanguage =
        (params.language as InfographicLanguage) || 'English';

      try {
        log.info(
          `[${toolCallId}] Starting grounded research for topic: ${topic} (${complexityLevel}, ${visualStyle})`,
        );

        // 1. Google search grounding research
        const research = await researchTopicForPrompt(
          topic,
          complexityLevel,
          visualStyle,
          language,
        );

        throwIfAborted(callerSignal);

        // 2. Generate 16:9 infographic diagram
        log.info(`[${toolCallId}] Synthesizing infographic image...`);
        const imageDataUrl = await generateInfographicImage(research.imagePrompt);

        throwIfAborted(callerSignal);

        // 3. Persist image to stage media folder
        let cleanBase64 = imageDataUrl;
        const ext = 'png';
        if (imageDataUrl.startsWith('data:')) {
          const commaIdx = imageDataUrl.indexOf(',');
          if (commaIdx !== -1) {
            cleanBase64 = imageDataUrl.substring(commaIdx + 1);
          }
        }

        const buffer = Buffer.from(cleanBase64, 'base64');
        const hash = createHash('sha256').update(buffer).digest('hex');
        const mediaDir = path.join(CLASSROOMS_DIR, stageId, 'media');
        const filename = `infographic-${hash}.${ext}`;

        await fs.mkdir(mediaDir, { recursive: true });
        throwIfAborted(callerSignal);
        await fs.writeFile(path.join(mediaDir, filename), buffer);
        throwIfAborted(callerSignal);

        const src = `/api/classroom-media/${stageId}/media/${filename}`;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  src,
                  width: 1344,
                  height: 768,
                  aspectRatio: '16:9',
                  topic,
                  level: complexityLevel,
                  style: visualStyle,
                  facts: research.facts,
                  citations: research.searchResults.map((r) => ({
                    title: r.title,
                    url: r.url,
                  })),
                  imagePrompt: research.imagePrompt,
                  message: `Successfully generated and persisted 16:9 infographic diagram for "${topic}". Use this src in patch_stage to display it in a slide.`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err: unknown) {
        log.error(`[${toolCallId}] Failed to generate grounded infographic: %o`, err);
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return errorResult(
          `Failed to generate grounded infographic: ${msg}`,
          { stageId, sessionId: deps.sessionId },
        );
      }
    },
  };
}
