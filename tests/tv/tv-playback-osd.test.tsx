import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { parseHTML } from 'linkedom';
import { TVNavigationProvider } from '@/components/tv/TVNavigationProvider';
import { TVPlaybackOSD } from '@/components/tv/TVPlaybackOSD';

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

describe('TVPlaybackOSD', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupDOM();
  });

  afterEach(() => {
    cleanupDOM();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders HUD container, titles, progress bar, and 5 TVFocusable buttons', () => {
    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true}>
          <TVPlaybackOSD
            currentSceneIndex={2}
            totalScenes={10}
            isPlaying={true}
            onTogglePlay={vi.fn()}
            onPrev={vi.fn()}
            onNext={vi.fn()}
            onReplay={vi.fn()}
            courseTitle="Introduction to Quantum Mechanics"
            sceneTitle="Schrödinger Equation & Wavefunctions"
          />
        </TVNavigationProvider>
      );
    });

    const osd = container.querySelector('[data-testid="tv-playback-osd"]');
    expect(osd).not.toBeNull();
    expect(osd?.className).toContain('bg-black/85');
    expect(osd?.className).toContain('backdrop-blur-md');
    expect(osd?.className).toContain('rounded-2xl');

    // Typography check
    expect(container.textContent).toContain('Introduction to Quantum Mechanics');
    expect(container.textContent).toContain('Schrödinger Equation & Wavefunctions');
    expect(container.textContent).toContain('3 / 10');

    // 5 buttons present
    const prevBtn = container.querySelector('[data-tv-focusable-id="tv-osd-prev"]');
    const playPauseBtn = container.querySelector('[data-tv-focusable-id="tv-osd-play-pause"]');
    const nextBtn = container.querySelector('[data-tv-focusable-id="tv-osd-next"]');
    const replayBtn = container.querySelector('[data-tv-focusable-id="tv-osd-replay"]');
    const subtitlesBtn = container.querySelector('[data-tv-focusable-id="tv-osd-subtitles"]');

    expect(prevBtn).not.toBeNull();
    expect(playPauseBtn).not.toBeNull();
    expect(nextBtn).not.toBeNull();
    expect(replayBtn).not.toBeNull();
    expect(subtitlesBtn).not.toBeNull();
  });

  it('autoFocuses the play-pause button by default', () => {
    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true}>
          <TVPlaybackOSD
            currentSceneIndex={1}
            totalScenes={5}
            isPlaying={false}
            onTogglePlay={vi.fn()}
            onPrev={vi.fn()}
            onNext={vi.fn()}
            onReplay={vi.fn()}
          />
        </TVNavigationProvider>
      );
    });

    const playPauseBtn = container.querySelector('[data-tv-focusable-id="tv-osd-play-pause"]');
    expect(playPauseBtn?.getAttribute('data-focused')).toBe('true');
  });

  it('disables prev button at index 0 and enables it at index > 0', () => {
    const onPrev = vi.fn();

    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true} defaultFocusId="tv-osd-prev">
          <TVPlaybackOSD
            currentSceneIndex={0}
            totalScenes={5}
            isPlaying={false}
            onTogglePlay={vi.fn()}
            onPrev={onPrev}
            onNext={vi.fn()}
            onReplay={vi.fn()}
          />
        </TVNavigationProvider>
      );
    });

    const prevBtn = container.querySelector('[data-tv-focusable-id="tv-osd-prev"]');
    expect(prevBtn?.getAttribute('aria-disabled')).toBe('true');

    // Try clicking when disabled
    act(() => {
      dispatchClick(prevBtn);
    });
    expect(onPrev).not.toHaveBeenCalled();

    // Re-render with index > 0
    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true} defaultFocusId="tv-osd-prev">
          <TVPlaybackOSD
            currentSceneIndex={1}
            totalScenes={5}
            isPlaying={false}
            onTogglePlay={vi.fn()}
            onPrev={onPrev}
            onNext={vi.fn()}
            onReplay={vi.fn()}
          />
        </TVNavigationProvider>
      );
    });

    const enabledPrevBtn = container.querySelector('[data-tv-focusable-id="tv-osd-prev"]');
    expect(enabledPrevBtn?.getAttribute('aria-disabled')).toBe('false');

    act(() => {
      dispatchClick(enabledPrevBtn);
    });
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('disables next button on the last scene and enables it otherwise', () => {
    const onNext = vi.fn();

    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true} defaultFocusId="tv-osd-next">
          <TVPlaybackOSD
            currentSceneIndex={4}
            totalScenes={5}
            isPlaying={false}
            onTogglePlay={vi.fn()}
            onPrev={vi.fn()}
            onNext={onNext}
            onReplay={vi.fn()}
          />
        </TVNavigationProvider>
      );
    });

    const nextBtn = container.querySelector('[data-tv-focusable-id="tv-osd-next"]');
    expect(nextBtn?.getAttribute('aria-disabled')).toBe('true');

    act(() => {
      dispatchClick(nextBtn);
    });
    expect(onNext).not.toHaveBeenCalled();

    // Re-render with earlier index
    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true} defaultFocusId="tv-osd-next">
          <TVPlaybackOSD
            currentSceneIndex={3}
            totalScenes={5}
            isPlaying={false}
            onTogglePlay={vi.fn()}
            onPrev={vi.fn()}
            onNext={onNext}
            onReplay={vi.fn()}
          />
        </TVNavigationProvider>
      );
    });

    const enabledNextBtn = container.querySelector('[data-tv-focusable-id="tv-osd-next"]');
    expect(enabledNextBtn?.getAttribute('aria-disabled')).toBe('false');

    act(() => {
      dispatchClick(enabledNextBtn);
    });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('handles play/pause toggle and replay actions', () => {
    const onTogglePlay = vi.fn();
    const onReplay = vi.fn();
    const onToggleSubtitles = vi.fn();

    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true}>
          <TVPlaybackOSD
            currentSceneIndex={1}
            totalScenes={5}
            isPlaying={false}
            onTogglePlay={onTogglePlay}
            onPrev={vi.fn()}
            onNext={vi.fn()}
            onReplay={onReplay}
            onToggleSubtitles={onToggleSubtitles}
          />
        </TVNavigationProvider>
      );
    });

    const playPauseBtn = container.querySelector('[data-tv-focusable-id="tv-osd-play-pause"]');
    expect(playPauseBtn?.getAttribute('aria-label')).toBe('Play');

    act(() => {
      dispatchClick(playPauseBtn);
    });
    expect(onTogglePlay).toHaveBeenCalledTimes(1);

    const replayBtn = container.querySelector('[data-tv-focusable-id="tv-osd-replay"]');
    act(() => {
      dispatchClick(replayBtn);
    });
    expect(onReplay).toHaveBeenCalledTimes(1);

    const subtitlesBtn = container.querySelector('[data-tv-focusable-id="tv-osd-subtitles"]');
    act(() => {
      dispatchClick(subtitlesBtn);
    });
    expect(onToggleSubtitles).toHaveBeenCalledTimes(1);
  });

  it('manages auto-hide: hides after timeout when playing, stays visible when paused', () => {
    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true} osdTimeoutMs={3000}>
          <TVPlaybackOSD
            currentSceneIndex={1}
            totalScenes={5}
            isPlaying={true}
            onTogglePlay={vi.fn()}
            onPrev={vi.fn()}
            onNext={vi.fn()}
            onReplay={vi.fn()}
          />
        </TVNavigationProvider>
      );
    });

    const osd = container.querySelector('[data-testid="tv-playback-osd"]');
    expect(osd?.getAttribute('data-visible')).toBe('true');
    expect(osd?.className).toContain('opacity-100');

    // Advance time past OSD timeout while playing -> should hide
    act(() => {
      vi.advanceTimersByTime(3100);
    });

    expect(osd?.getAttribute('data-visible')).toBe('false');
    expect(osd?.className).toContain('opacity-0');

    // Press any key to wake OSD up
    act(() => {
      dispatchKey('ArrowRight');
    });

    expect(osd?.getAttribute('data-visible')).toBe('true');
    expect(osd?.className).toContain('opacity-100');

    // When paused, OSD should NEVER hide even after timeout
    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true} osdTimeoutMs={3000}>
          <TVPlaybackOSD
            currentSceneIndex={1}
            totalScenes={5}
            isPlaying={false}
            onTogglePlay={vi.fn()}
            onPrev={vi.fn()}
            onNext={vi.fn()}
            onReplay={vi.fn()}
          />
        </TVNavigationProvider>
      );
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(osd?.getAttribute('data-visible')).toBe('true');
    expect(osd?.className).toContain('opacity-100');
  });

  it('supports D-pad spatial navigation between OSD controls', () => {
    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true} debounceMs={50}>
          <TVPlaybackOSD
            currentSceneIndex={1}
            totalScenes={5}
            isPlaying={true}
            onTogglePlay={vi.fn()}
            onPrev={vi.fn()}
            onNext={vi.fn()}
            onReplay={vi.fn()}
          />
        </TVNavigationProvider>
      );
    });

    const ids = [
      'tv-osd-prev',
      'tv-osd-play-pause',
      'tv-osd-next',
      'tv-osd-replay',
      'tv-osd-subtitles',
    ];
    ids.forEach((id, index) => {
      const el = container.querySelector(`[data-tv-focusable-id="${id}"]`);
      if (el) {
        el.getBoundingClientRect = () =>
        ({
          left: 150 * index,
          top: 200,
          width: 100,
          height: 60,
          right: 150 * index + 100,
          bottom: 260,
        } as any);
      }
    });

    // Initial focus on play-pause
    const playPauseBtn = container.querySelector('[data-tv-focusable-id="tv-osd-play-pause"]');
    expect(playPauseBtn?.getAttribute('data-focused')).toBe('true');

    // Navigate left to prev button
    vi.advanceTimersByTime(100);
    act(() => {
      dispatchKey('ArrowLeft');
    });

    const prevBtn = container.querySelector('[data-tv-focusable-id="tv-osd-prev"]');
    expect(prevBtn?.getAttribute('data-focused')).toBe('true');

    // Navigate right back to play-pause
    vi.advanceTimersByTime(100);
    act(() => {
      dispatchKey('ArrowRight');
    });
    expect(playPauseBtn?.getAttribute('data-focused')).toBe('true');

    // Navigate right to next button
    vi.advanceTimersByTime(100);
    act(() => {
      dispatchKey('ArrowRight');
    });
    const nextBtn = container.querySelector('[data-tv-focusable-id="tv-osd-next"]');
    expect(nextBtn?.getAttribute('data-focused')).toBe('true');
  });
});
