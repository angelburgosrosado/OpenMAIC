import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { parseHTML } from 'linkedom';
import { TVNavigationProvider, useTVNavigation } from '@/components/tv/TVNavigationProvider';
import { TVFocusable } from '@/components/tv/TVFocusable';

// Setup simulated DOM environment using linkedom
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
    },
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
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.navigator,
    configurable: true,
    writable: true,
  });
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

describe('TVNavigationProvider and TVFocusable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupDOM();
  });

  afterEach(() => {
    cleanupDOM();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('provides default context and respects defaultFocusId', () => {
    let contextValue: any = null;

    function TestConsumer() {
      contextValue = useTVNavigation();
      return <div id="consumer">TV Mode: {String(contextValue.isTVMode)}</div>;
    }

    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true} defaultFocusId="btn-1">
          <TestConsumer />
        </TVNavigationProvider>,
      );
    });

    expect(contextValue).not.toBeNull();
    expect(contextValue.isTVMode).toBe(true);
    expect(contextValue.focusedId).toBe('btn-1');
    expect(contextValue.isOSDVisible).toBe(true);
  });

  it('navigates with directional arrow keys and applies dynamic focus classes', () => {
    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true}>
          <TVFocusable
            id="item-left"
            autoFocus
            rect={{ left: 100, top: 100, width: 200, height: 100 }}
          >
            <span>Left Button</span>
          </TVFocusable>
          <TVFocusable id="item-right" rect={{ left: 400, top: 100, width: 200, height: 100 }}>
            <span>Right Button</span>
          </TVFocusable>
          <TVFocusable id="item-down" rect={{ left: 100, top: 300, width: 200, height: 100 }}>
            <span>Down Button</span>
          </TVFocusable>
        </TVNavigationProvider>,
      );
    });

    const itemLeft = container.querySelector('[data-tv-focusable-id="item-left"]');
    const itemRight = container.querySelector('[data-tv-focusable-id="item-right"]');
    const itemDown = container.querySelector('[data-tv-focusable-id="item-down"]');

    // item-left has autoFocus -> initial focus
    expect(itemLeft?.getAttribute('data-focused')).toBe('true');
    expect(itemLeft?.className).toContain(
      'ring-4 ring-cyan-400 dark:ring-cyan-300 scale-105 shadow-2xl transition-all duration-200',
    );
    expect(itemRight?.getAttribute('data-focused')).toBe('false');

    // Advance time by 100ms (more than debounce 80ms) and press ArrowRight
    vi.advanceTimersByTime(100);
    act(() => {
      dispatchKey('ArrowRight');
    });

    expect(itemRight?.getAttribute('data-focused')).toBe('true');
    expect(itemRight?.className).toContain(
      'ring-4 ring-cyan-400 dark:ring-cyan-300 scale-105 shadow-2xl transition-all duration-200',
    );
    expect(itemLeft?.getAttribute('data-focused')).toBe('false');

    // Press ArrowLeft to go back to item-left
    vi.advanceTimersByTime(100);
    act(() => {
      dispatchKey('ArrowLeft');
    });
    expect(itemLeft?.getAttribute('data-focused')).toBe('true');

    // Press ArrowDown to navigate to item-down
    vi.advanceTimersByTime(100);
    act(() => {
      dispatchKey('ArrowDown');
    });
    expect(itemDown?.getAttribute('data-focused')).toBe('true');
  });

  it('triggers onSelect when Enter or Space is pressed on focused item', () => {
    const onSelectA = vi.fn();
    const onSelectB = vi.fn();

    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true}>
          <TVFocusable
            id="item-a"
            autoFocus
            onSelect={onSelectA}
            rect={{ left: 100, top: 100, width: 200, height: 100 }}
          >
            Item A
          </TVFocusable>
          <TVFocusable
            id="item-b"
            onSelect={onSelectB}
            rect={{ left: 400, top: 100, width: 200, height: 100 }}
          >
            Item B
          </TVFocusable>
        </TVNavigationProvider>,
      );
    });

    vi.advanceTimersByTime(100);
    act(() => {
      dispatchKey('Enter');
    });
    expect(onSelectA).toHaveBeenCalledTimes(1);
    expect(onSelectB).not.toHaveBeenCalled();

    // Navigate to B and press Space
    vi.advanceTimersByTime(100);
    act(() => {
      dispatchKey('ArrowRight');
    });

    vi.advanceTimersByTime(100);
    act(() => {
      dispatchKey(' ', 'Space');
    });
    expect(onSelectB).toHaveBeenCalledTimes(1);
  });

  it('debounces rapid keydown events within 80ms', () => {
    const onSelect = vi.fn();

    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true}>
          <TVFocusable
            id="btn"
            autoFocus
            onSelect={onSelect}
            rect={{ left: 0, top: 0, width: 100, height: 100 }}
          >
            Button
          </TVFocusable>
        </TVNavigationProvider>,
      );
    });

    vi.advanceTimersByTime(100);
    act(() => {
      dispatchKey('Enter'); // First press at t=100
    });
    expect(onSelect).toHaveBeenCalledTimes(1);

    // Rapid bounce after 30ms (< 80ms threshold)
    vi.advanceTimersByTime(30);
    act(() => {
      dispatchKey('Enter');
    });
    // Should be ignored by 80ms debounce
    expect(onSelect).toHaveBeenCalledTimes(1);

    // After 90ms more (total > 80ms since last allowed key)
    vi.advanceTimersByTime(90);
    act(() => {
      dispatchKey('Enter');
    });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('manages auto-hide OSD timer and wakes on key events', () => {
    let navContext: any = null;

    function Consumer() {
      navContext = useTVNavigation();
      return <div>OSD: {String(navContext.isOSDVisible)}</div>;
    }

    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={true} osdTimeoutMs={3000}>
          <Consumer />
        </TVNavigationProvider>,
      );
    });

    expect(navContext.isOSDVisible).toBe(true);

    // Advance time past 3000ms
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(navContext.isOSDVisible).toBe(false);

    // Press any remote key to wake OSD
    act(() => {
      dispatchKey('ArrowUp');
    });
    expect(navContext.isOSDVisible).toBe(true);

    // Advance past timeout again
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(navContext.isOSDVisible).toBe(false);

    // Calling wakeOSD directly wakes it
    act(() => {
      navContext.wakeOSD();
    });
    expect(navContext.isOSDVisible).toBe(true);
  });

  it('recovers focus to first registered item when focused item unmounts', () => {
    function TestApp({ showFirst }: { showFirst: boolean }) {
      return (
        <TVNavigationProvider forceTVMode={true}>
          {showFirst && (
            <TVFocusable
              id="first"
              autoFocus
              rect={{ left: 100, top: 100, width: 200, height: 100 }}
            >
              First
            </TVFocusable>
          )}
          <TVFocusable id="second" rect={{ left: 400, top: 100, width: 200, height: 100 }}>
            Second
          </TVFocusable>
        </TVNavigationProvider>
      );
    }

    act(() => {
      root.render(<TestApp showFirst={true} />);
    });

    const firstEl = container.querySelector('[data-tv-focusable-id="first"]');
    expect(firstEl?.getAttribute('data-focused')).toBe('true');

    // Unmount first item
    act(() => {
      root.render(<TestApp showFirst={false} />);
    });

    const secondEl = container.querySelector('[data-tv-focusable-id="second"]');
    // Automatic fallback to first available registered item
    expect(secondEl?.getAttribute('data-focused')).toBe('true');
  });

  it('respects immunity when isTVMode is false', () => {
    const onSelect = vi.fn();

    act(() => {
      root.render(
        <TVNavigationProvider forceTVMode={false}>
          <TVFocusable
            id="non-tv-btn"
            autoFocus
            onSelect={onSelect}
            className="base-btn"
            rect={{ left: 100, top: 100, width: 200, height: 100 }}
          >
            Standard Button
          </TVFocusable>
        </TVNavigationProvider>,
      );
    });

    const btn = container.querySelector('[data-tv-focusable-id="non-tv-btn"]');
    // In non-TV mode, TV focus ring classes must not be applied
    expect(btn?.className).not.toContain('ring-4 ring-cyan-400');
    expect(btn?.className).not.toContain('scale-105');

    // Directional keys or Enter should not trigger onSelect via global listener
    vi.advanceTimersByTime(100);
    act(() => {
      dispatchKey('Enter');
    });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
