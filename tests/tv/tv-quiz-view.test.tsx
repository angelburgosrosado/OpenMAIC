import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { parseHTML } from 'linkedom';

vi.mock('@/lib/hooks/use-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'en' }),
}));
vi.mock('@/components/slide-renderer/Editor', () => ({
  SlideEditor: () => React.createElement('div', null, 'MockSlideEditor'),
}));
vi.mock('@/components/scene-renderers/interactive-renderer', () => ({
  InteractiveRenderer: () => React.createElement('div', null, 'MockInteractiveRenderer'),
}));
vi.mock('@/components/scene-renderers/pbl-renderer', () => ({
  PBLRenderer: () => React.createElement('div', null, 'MockPBLRenderer'),
}));

import { TVNavigationProvider } from '@/components/tv/TVNavigationProvider';
import { TVQuizView } from '@/components/scene-renderers/tv-quiz-view';
import { SceneRenderer } from '@/components/stage/scene-renderer';
import type { QuizQuestion, Scene } from '@/lib/types/stage';

let dom: any;
let container: HTMLElement;
let root: ReactDOM.Root;

class MockKeyboardEvent {
  type: string;
  key: string;
  code: string;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented: boolean = false;

  constructor(
    type: string,
    init?: {
      key?: string;
      code?: string;
      bubbles?: boolean;
      cancelable?: boolean;
    }
  ) {
    this.type = type;
    this.key = init?.key || '';
    this.code = init?.code || this.key;
    this.bubbles = init?.bubbles ?? true;
    this.cancelable = init?.cancelable ?? true;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

function setupDOM() {
  dom = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>');
  (global as any).window = dom.window;
  (global as any).document = dom.document;
  (global as any).navigator = dom.navigator;
  (global as any).KeyboardEvent = MockKeyboardEvent;
  dom.window.KeyboardEvent = MockKeyboardEvent;
  (global as any).HTMLElement = dom.HTMLElement;
  (global as any).Element = dom.Element;
  (global as any).Node = dom.Node;
  (global as any).IS_REACT_ACT_ENVIRONMENT = true;

  const mockStorage: Record<string, string> = {};
  const localStorageMock = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      for (const k of Object.keys(mockStorage)) delete mockStorage[k];
    },
  };
  (global as any).localStorage = localStorageMock;
  dom.window.localStorage = localStorageMock;

  container = dom.document.getElementById('root');
  root = ReactDOM.createRoot(container);
}

function cleanupDOM() {
  if (root) {
    act(() => {
      root.unmount();
    });
  }
}

function dispatchKey(key: string, code?: string) {
  const event = new dom.window.CustomEvent('keydown', {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'key', { value: key, configurable: true });
  Object.defineProperty(event, 'code', {
    value: code || key,
    configurable: true,
  });
  dom.window.dispatchEvent(event);
}

function dispatchClick(element: any) {
  if (!element) return;
  element.dispatchEvent(new dom.window.CustomEvent('click', { bubbles: true, cancelable: true }));
}

const mockQuestions: QuizQuestion[] = [
  {
    id: 'q-1',
    type: 'single',
    question: 'What is the primary function of mitochondria?',
    options: [
      { value: 'A', label: 'Cellular respiration and ATP generation' },
      { value: 'B', label: 'Protein synthesis via translation' },
      { value: 'C', label: 'Lipid degradation and waste disposal' },
      { value: 'D', label: 'DNA replication and transcription' },
    ],
    answer: ['A'],
    analysis: 'Mitochondria generate most of the chemical energy needed to power the cell’s biochemical reactions (ATP).',
    points: 1,
  },
  {
    id: 'q-2',
    type: 'single',
    question: 'Which planet is known as the Red Planet?',
    options: [
      { value: 'A', label: 'Venus' },
      { value: 'B', label: 'Mars' },
      { value: 'C', label: 'Jupiter' },
      { value: 'D', label: 'Mercury' },
    ],
    answer: ['B'],
    analysis: 'Mars appears reddish because of widespread iron oxide on its surface.',
    points: 1,
  },
];

describe('TVQuizView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupDOM();
  });

  afterEach(() => {
    cleanupDOM();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders 10-foot scale layout: header, counter, large question text, and option cards', () => {
    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true}>
          <TVQuizView
            questions={mockQuestions}
            sceneId="scene-quiz-1"
            stageId="stage-1"
          />
        </TVNavigationProvider>
      );
    });

    const quizView = container.querySelector('[data-testid="tv-quiz-view"]');
    expect(quizView).not.toBeNull();

    // Check Question counter
    expect(container.textContent).toContain('Question 1 of 2');

    // Check Large Question Text
    expect(container.textContent).toContain('What is the primary function of mitochondria?');

    // Check Option cards & letter chips
    const opt0 = container.querySelector('[data-tv-focusable-id="tv-quiz-opt-0"]');
    const opt1 = container.querySelector('[data-tv-focusable-id="tv-quiz-opt-1"]');
    const opt2 = container.querySelector('[data-tv-focusable-id="tv-quiz-opt-2"]');
    const opt3 = container.querySelector('[data-tv-focusable-id="tv-quiz-opt-3"]');

    expect(opt0).not.toBeNull();
    expect(opt1).not.toBeNull();
    expect(opt2).not.toBeNull();
    expect(opt3).not.toBeNull();

    expect(opt0?.textContent).toContain('A');
    expect(opt0?.textContent).toContain('Cellular respiration and ATP generation');
    expect(opt1?.textContent).toContain('B');
    expect(opt2?.textContent).toContain('C');
    expect(opt3?.textContent).toContain('D');

    // Submit button present
    const submitBtn = container.querySelector('[data-tv-focusable-id="tv-quiz-submit"]');
    expect(submitBtn).not.toBeNull();
    expect(submitBtn?.textContent).toContain('Submit Answer');
  });

  it('autoFocuses option A (tv-quiz-opt-0) by default', () => {
    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true}>
          <TVQuizView
            questions={mockQuestions}
            sceneId="scene-quiz-1"
            stageId="stage-1"
          />
        </TVNavigationProvider>
      );
    });

    const opt0 = container.querySelector('[data-tv-focusable-id="tv-quiz-opt-0"]');
    expect(opt0?.getAttribute('data-focused')).toBe('true');
  });

  it('supports 2D D-Pad directional navigation between option cards and submit button', () => {
    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true} debounceMs={0}>
          <TVQuizView
            questions={mockQuestions}
            sceneId="scene-quiz-1"
            stageId="stage-1"
          />
        </TVNavigationProvider>
      );
    });

    const opt0 = container.querySelector('[data-tv-focusable-id="tv-quiz-opt-0"]');
    const opt1 = container.querySelector('[data-tv-focusable-id="tv-quiz-opt-1"]');
    const opt2 = container.querySelector('[data-tv-focusable-id="tv-quiz-opt-2"]');
    const submitBtn = container.querySelector('[data-tv-focusable-id="tv-quiz-submit"]');

    expect(opt0?.getAttribute('data-focused')).toBe('true');

    // Move Right: opt-0 -> opt-1
    act(() => {
      dispatchKey('ArrowRight');
    });
    expect(opt1?.getAttribute('data-focused')).toBe('true');

    // Move Left: opt-1 -> opt-0
    act(() => {
      dispatchKey('ArrowLeft');
    });
    expect(opt0?.getAttribute('data-focused')).toBe('true');

    // Move Down: opt-0 -> opt-2
    act(() => {
      dispatchKey('ArrowDown');
    });
    expect(opt2?.getAttribute('data-focused')).toBe('true');

    // Move Down from row 1 to submit
    act(() => {
      dispatchKey('ArrowDown');
    });
    expect(submitBtn?.getAttribute('data-focused')).toBe('true');
  });

  it('allows selecting an option with Enter / Space / Click with visual indicator', () => {
    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true} debounceMs={0}>
          <TVQuizView
            questions={mockQuestions}
            sceneId="scene-quiz-1"
            stageId="stage-1"
          />
        </TVNavigationProvider>
      );
    });

    const opt1 = container.querySelector('[data-tv-focusable-id="tv-quiz-opt-1"]') as HTMLElement;
    expect(opt1?.getAttribute('data-selected')).toBe('false');

    // Click opt-1
    act(() => {
      dispatchClick(opt1);
    });
    expect(opt1?.getAttribute('data-selected')).toBe('true');

    // Move left to opt-0 and select with Enter
    act(() => {
      dispatchKey('ArrowLeft');
    });
    act(() => {
      dispatchKey('Enter');
    });

    const opt0 = container.querySelector('[data-tv-focusable-id="tv-quiz-opt-0"]');
    expect(opt0?.getAttribute('data-selected')).toBe('true');
    expect(opt1?.getAttribute('data-selected')).toBe('false');
  });

  it('evaluates submitted answer and displays celebration banner, explanation, and Continue button', () => {
    const onComplete = vi.fn();

    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true} debounceMs={0}>
          <TVQuizView
            questions={mockQuestions}
            sceneId="scene-quiz-1"
            stageId="stage-1"
            onComplete={onComplete}
          />
        </TVNavigationProvider>
      );
    });

    // Select Option A (which is correct)
    const opt0 = container.querySelector('[data-tv-focusable-id="tv-quiz-opt-0"]') as HTMLElement;
    act(() => {
      dispatchClick(opt0);
    });

    // Submit answer
    const submitBtn = container.querySelector('[data-tv-focusable-id="tv-quiz-submit"]') as HTMLElement;
    act(() => {
      dispatchClick(submitBtn);
    });

    // Check celebration banner & explanation
    expect(container.textContent).toMatch(/Correct!|Outstanding|Great job/i);
    expect(container.textContent).toContain('Mitochondria generate most of the chemical energy');

    // Check that Continue button appears and is focused
    const nextBtn = container.querySelector('[data-tv-focusable-id="tv-quiz-next"]');
    expect(nextBtn).not.toBeNull();
    expect(nextBtn?.getAttribute('data-focused')).toBe('true');
    expect(nextBtn?.textContent).toContain('Continue');
  });

  it('advances to next question when Continue is pressed, then completes on last question', () => {
    const onComplete = vi.fn();

    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true} debounceMs={0}>
          <TVQuizView
            questions={mockQuestions}
            sceneId="scene-quiz-1"
            stageId="stage-1"
            onComplete={onComplete}
          />
        </TVNavigationProvider>
      );
    });

    // Q1: Select A and submit
    const opt0 = container.querySelector('[data-tv-focusable-id="tv-quiz-opt-0"]') as HTMLElement;
    act(() => {
      dispatchClick(opt0);
    });
    const submitBtn1 = container.querySelector('[data-tv-focusable-id="tv-quiz-submit"]') as HTMLElement;
    act(() => {
      dispatchClick(submitBtn1);
    });

    // Continue to Q2
    const nextBtn = container.querySelector('[data-tv-focusable-id="tv-quiz-next"]') as HTMLElement;
    act(() => {
      dispatchClick(nextBtn);
    });

    // Question 2 should now be visible
    expect(container.textContent).toContain('Question 2 of 2');
    expect(container.textContent).toContain('Which planet is known as the Red Planet?');

    // Option A is autoFocused on new question
    const q2Opt0 = container.querySelector('[data-tv-focusable-id="tv-quiz-opt-0"]');
    expect(q2Opt0?.getAttribute('data-focused')).toBe('true');

    // Select Option B (Mars)
    const q2Opt1 = container.querySelector('[data-tv-focusable-id="tv-quiz-opt-1"]') as HTMLElement;
    act(() => {
      dispatchClick(q2Opt1);
    });

    // Submit Q2
    const submitBtn2 = container.querySelector('[data-tv-focusable-id="tv-quiz-submit"]') as HTMLElement;
    act(() => {
      dispatchClick(submitBtn2);
    });

    expect(container.textContent).toContain('Mars appears reddish');

    // Click Continue on final question -> onComplete called
    const nextBtn2 = container.querySelector('[data-tv-focusable-id="tv-quiz-next"]') as HTMLElement;
    act(() => {
      dispatchClick(nextBtn2);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('SceneRenderer TV mode integration', () => {
  beforeEach(() => {
    setupDOM();
  });

  afterEach(() => {
    cleanupDOM();
  });

  const quizScene: Scene = {
    id: 'scene-quiz-int',
    stageId: 'stage-int',
    type: 'quiz',
    order: 0,
    content: {
      type: 'quiz',
      questions: mockQuestions,
    },
  };

  it('renders TVQuizView when isTVMode is active', () => {
    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true}>
          <SceneRenderer scene={quizScene} mode="playback" />
        </TVNavigationProvider>
      );
    });

    expect(container.querySelector('[data-testid="tv-quiz-view"]')).not.toBeNull();
  });

  it('renders standard QuizView when isTVMode is false', () => {
    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={false}>
          <SceneRenderer scene={quizScene} mode="playback" />
        </TVNavigationProvider>
      );
    });

    expect(container.querySelector('[data-testid="tv-quiz-view"]')).toBeNull();
  });
});
