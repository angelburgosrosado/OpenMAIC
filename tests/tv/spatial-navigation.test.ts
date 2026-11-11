import { describe, it, expect } from 'vitest';
import { isTVEnvironment } from '@/lib/tv/tv-detection';
import { findNextSpatialCandidate, type SpatialItem } from '@/lib/tv/spatial-navigation';

describe('isTVEnvironment', () => {
  it('detects tv query parameter', () => {
    expect(isTVEnvironment('?tv=1', '')).toBe(true);
    expect(isTVEnvironment('?tv=true', '')).toBe(true);
    expect(isTVEnvironment('?other=1', '')).toBe(false);
    expect(isTVEnvironment('', '')).toBe(false);
  });

  it('detects Android TV and Fire TV user agents', () => {
    expect(isTVEnvironment('', 'Mozilla/5.0 (Linux; Android 12; BRAVIA 4K Build/...)')).toBe(true);
    expect(isTVEnvironment('', 'Mozilla/5.0 (Linux; Android 9; AFTMM Build/...)')).toBe(true); // Fire TV Stick
    expect(isTVEnvironment('', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false);
  });

  it('detects common Smart TV platforms by UA keywords', () => {
    expect(isTVEnvironment('', 'Mozilla/5.0 (SMART-TV; Linux; Tizen 5.0) AppleWebKit/537.36')).toBe(
      true,
    );
    expect(isTVEnvironment('', 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36')).toBe(true);
    expect(isTVEnvironment('', 'AppleTV11,1/11.1')).toBe(true);
    expect(isTVEnvironment('', 'Roku/DVP-9.10 (519.10E04111A)')).toBe(true);
  });
});

describe('findNextSpatialCandidate', () => {
  const grid: SpatialItem[] = [
    { id: 'optA', rect: { left: 100, top: 100, width: 200, height: 100 } },
    { id: 'optB', rect: { left: 400, top: 100, width: 200, height: 100 } },
    { id: 'optC', rect: { left: 100, top: 300, width: 200, height: 100 } },
    { id: 'optD', rect: { left: 400, top: 300, width: 200, height: 100 } },
    { id: 'submit', rect: { left: 250, top: 500, width: 200, height: 80 } },
  ];

  it('navigates right from A to B', () => {
    expect(findNextSpatialCandidate('optA', 'right', grid)).toBe('optB');
  });

  it('navigates down from A to C', () => {
    expect(findNextSpatialCandidate('optA', 'down', grid)).toBe('optC');
  });

  it('navigates down from C to submit', () => {
    expect(findNextSpatialCandidate('optC', 'down', grid)).toBe('submit');
  });

  it('navigates left from B to A', () => {
    expect(findNextSpatialCandidate('optB', 'left', grid)).toBe('optA');
  });

  it('returns null when moving into a boundary with no candidates', () => {
    expect(findNextSpatialCandidate('optA', 'up', grid)).toBeNull();
    expect(findNextSpatialCandidate('optA', 'left', grid)).toBeNull();
  });

  it('skips disabled items', () => {
    const gridWithDisabled: SpatialItem[] = [
      { id: 'optA', rect: { left: 100, top: 100, width: 200, height: 100 } },
      { id: 'optB', rect: { left: 400, top: 100, width: 200, height: 100 }, disabled: true },
      { id: 'optFarRight', rect: { left: 700, top: 100, width: 200, height: 100 } },
    ];
    expect(findNextSpatialCandidate('optA', 'right', gridWithDisabled)).toBe('optFarRight');
  });

  it('returns null if currentId is not found', () => {
    expect(findNextSpatialCandidate('nonexistent', 'down', grid)).toBeNull();
  });
});
