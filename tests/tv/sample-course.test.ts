import { describe, it, expect } from 'vitest';
import { validateScene, validateStage } from '@openmaic/dsl';
import {
  SAMPLE_STAGE,
  SAMPLE_SCENES,
  SAMPLE_CLASSROOM_PAYLOAD,
  isSampleClassroomId,
} from '@/lib/classroom/sample-course';

describe('Sample Course Payload', () => {
  it('has a valid stage structure according to DSL validator', () => {
    const stageValidation = validateStage(SAMPLE_STAGE);
    expect(stageValidation.valid).toBe(true);
    expect(SAMPLE_STAGE.id).toBe('sample');
  });

  it('contains valid scenes including slide and quiz scenes', () => {
    expect(SAMPLE_SCENES.length).toBeGreaterThanOrEqual(3);

    for (const scene of SAMPLE_SCENES) {
      const sceneValidation = validateScene(scene);
      expect(sceneValidation.valid).toBe(true);
    }
  });

  it('includes an interactive quiz question in the quiz scene', () => {
    const quizScene = SAMPLE_SCENES.find((s) => s.type === 'quiz');
    expect(quizScene).toBeDefined();
    if (quizScene && quizScene.content.type === 'quiz') {
      expect(quizScene.content.questions.length).toBeGreaterThanOrEqual(1);
      const q = quizScene.content.questions[0];
      expect(q.options?.length).toBe(4);
      expect(q.answer).toEqual(['A']);
    }
  });

  it('identifies sample and demo route aliases properly', () => {
    expect(isSampleClassroomId('sample')).toBe(true);
    expect(isSampleClassroomId('demo')).toBe(true);
    expect(isSampleClassroomId('preview')).toBe(true);
    expect(isSampleClassroomId('living-room')).toBe(true);
    expect(isSampleClassroomId('tv')).toBe(true);
    expect(isSampleClassroomId('')).toBe(true);
    expect(isSampleClassroomId(null)).toBe(true);
    expect(isSampleClassroomId('random-user-course-123')).toBe(false);
  });
});
