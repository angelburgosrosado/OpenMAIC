import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, signPayload, verifySignedPayload } from '@/lib/server/auth/crypto';
import { createSessionToken, parseSessionToken } from '@/lib/server/auth/session';
import { estimateCourseConsumption } from '@/lib/server/calculator/token-calculator';
import { PRICING_PLANS, CREDIT_PACKS } from '@/lib/server/monetization/plans';
import { LLM_MODELS_PRICING, TTS_PRICING, IMAGE_PRICING } from '@/lib/server/calculator/pricing-data';

describe('Auth & Cryptography', () => {
  it('correctly hashes and verifies passwords using scrypt', () => {
    const rawPassword = 'superSecretPassword2026!';
    const { hash, salt } = hashPassword(rawPassword);

    expect(hash).toBeDefined();
    expect(salt).toBeDefined();
    expect(hash.length).toBe(128); // 64 bytes hex
    expect(salt.length).toBe(32); // 16 bytes hex

    // Correct password matches
    const isValid = verifyPassword(rawPassword, hash, salt);
    expect(isValid).toBe(true);

    // Incorrect password fails
    const isInvalid = verifyPassword('wrongPassword', hash, salt);
    expect(isInvalid).toBe(false);
  });

  it('generates tamper-proof HMAC signed tokens', () => {
    const data = 'usr_123456789:session_abc';
    const signed = signPayload(data, 'test-secret');

    expect(signed).toContain('.');
    const verified = verifySignedPayload(signed, 'test-secret');
    expect(verified).toBe(data);

    // Tampered payload fails verification
    const tampered = signed.replace('usr_123456789', 'usr_hacked');
    const failed = verifySignedPayload(tampered, 'test-secret');
    expect(failed).toBeNull();
  });

  it('creates and parses valid session tokens', () => {
    const userId = 'usr_testuser99';
    const sessionToken = createSessionToken(userId);

    const parsedUserId = parseSessionToken(sessionToken);
    expect(parsedUserId).toBe(userId);
  });
});

describe('Monetization Plans & Credit Packs', () => {
  it('exposes valid pricing plans with required tiers and features', () => {
    expect(PRICING_PLANS.length).toBeGreaterThanOrEqual(3);

    const freePlan = PRICING_PLANS.find((p) => p.tier === 'free');
    const proPlan = PRICING_PLANS.find((p) => p.tier === 'pro');
    const enterprisePlan = PRICING_PLANS.find((p) => p.tier === 'enterprise');

    expect(freePlan).toBeDefined();
    expect(freePlan?.priceMonthly).toBe(0);
    expect(freePlan?.monthlyTokens).toBeGreaterThan(0);

    expect(proPlan).toBeDefined();
    expect(proPlan?.priceMonthly).toBe(29);
    expect(proPlan?.monthlyTokens).toBe(3_000_000);

    expect(enterprisePlan).toBeDefined();
    expect(enterprisePlan?.priceMonthly).toBe(99);
    expect(enterprisePlan?.monthlyTokens).toBe(15_000_000);
  });

  it('exposes credit packs with bonus token incentives', () => {
    expect(CREDIT_PACKS.length).toBe(3);
    for (const pack of CREDIT_PACKS) {
      expect(pack.tokens).toBeGreaterThan(0);
      expect(pack.priceUsd).toBeGreaterThan(0);
      expect(pack.bonusTokens).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Token Consumption Calculator', () => {
  it('estimates token consumption and costs for a standard 10-slide classroom', () => {
    const result = estimateCourseConsumption({
      sceneCount: 10,
      scriptComplexity: 'standard',
      modelId: 'gpt-4o',
      visualDensity: 'each_slide',
      imageProviderId: 'flux-schnell',
      voiceNarrator: 'edge-tts',
      videoExport: 'video-render-local',
      hasWebSearch: true,
      pdfPagesCount: 5,
    });

    expect(result.totalInputTokens).toBeGreaterThan(10_000);
    expect(result.totalOutputTokens).toBeGreaterThan(5_000);
    expect(result.totalLlmTokens).toBe(result.totalInputTokens + result.totalOutputTokens);
    expect(result.totalPlatformTokens).toBeGreaterThan(result.totalLlmTokens);
    expect(result.rawProviderCostUsd).toBeGreaterThan(0);
    expect(result.totalImages).toBe(10);
    expect(result.estimatedAudioMinutes).toBeGreaterThan(0);
    expect(result.estimatedGenerationTimeSec).toBeGreaterThan(10);
    expect(['free', 'pro', 'enterprise']).toContain(result.recommendedPlan);

    // Sum of percentages should be approximately 100%
    const breakdownTotalPercent =
      result.breakdown.llm.percentage +
      result.breakdown.tts.percentage +
      result.breakdown.image.percentage +
      result.breakdown.video.percentage +
      result.breakdown.search.percentage +
      result.breakdown.pdf.percentage;

    expect(breakdownTotalPercent).toBeGreaterThanOrEqual(95);
    expect(breakdownTotalPercent).toBeLessThanOrEqual(105);
  });

  it('adjusts costs appropriately between cheap and premium models', () => {
    const gpt4oMiniResult = estimateCourseConsumption({
      sceneCount: 10,
      scriptComplexity: 'standard',
      modelId: 'gpt-4o-mini',
      visualDensity: 'none',
      imageProviderId: 'flux-schnell',
      voiceNarrator: 'none',
      videoExport: 'none',
      hasWebSearch: false,
      pdfPagesCount: 0,
    });

    const claudeSonnetResult = estimateCourseConsumption({
      sceneCount: 10,
      scriptComplexity: 'standard',
      modelId: 'claude-3-7-sonnet',
      visualDensity: 'none',
      imageProviderId: 'flux-schnell',
      voiceNarrator: 'none',
      videoExport: 'none',
      hasWebSearch: false,
      pdfPagesCount: 0,
    });

    // Claude 3.7 Sonnet is significantly more expensive than GPT-4o mini
    expect(claudeSonnetResult.rawProviderCostUsd).toBeGreaterThan(
      gpt4oMiniResult.rawProviderCostUsd * 5,
    );
  });
});
