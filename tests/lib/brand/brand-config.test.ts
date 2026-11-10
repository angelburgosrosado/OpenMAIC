import { describe, expect, it } from 'vitest';
import { DEFAULT_BRAND } from '@/lib/brand/brand-config';

describe('DEFAULT_BRAND (single-brand build)', () => {
  it('uses the QuéWhat identity for full chrome', () => {
    expect(DEFAULT_BRAND.productName).toBe('QuéWhat');
    expect(DEFAULT_BRAND.shortName).toBe('QuéWhat');
    expect(DEFAULT_BRAND.markSrc).toBe('/quewhat-mark.png');
    expect(DEFAULT_BRAND.themeColor).toBe('#1F3B2D');
  });

  it('marks its horizontal logo as already containing the wordmark', () => {
    expect(DEFAULT_BRAND.logoHasWordmark).toBe(true);
    expect(DEFAULT_BRAND.logoSrc).toBe('/quewhat-logo.png');
  });
});
