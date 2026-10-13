import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUser,
  getUserByEmail,
  getUserById,
  adjustUserTokenBalance,
  listUsers,
  ensureDefaultAdmin,
} from '@/lib/server/auth/user-store';
import {
  createPromoCode,
  listPromoCodes,
  redeemPromoCode,
  processCheckoutPlan,
  processBuyCreditPack,
  getRevenueMetrics,
} from '@/lib/server/monetization/monetization-store';
import {
  getAppSettings,
  updateAppSettings,
  logAuditEvent,
  listAuditLogs,
} from '@/lib/server/admin/admin-store';

describe('Admin, Users & Monetization Store Integration', () => {
  it('seeds default admin user with valid credentials and enterprise tier', async () => {
    const admin = await ensureDefaultAdmin();
    expect(admin).toBeDefined();
    expect(admin.role).toBe('admin');
    expect(admin.tier).toBe('enterprise');
    expect(admin.tokenBalance).toBeGreaterThanOrEqual(10_000_000);
    expect(admin.email).toBe('admin@openmaic.io');
  });

  it('creates new user and adjusts token balances accurately', async () => {
    const testEmail = `test_${Date.now()}@test.io`;
    const user = await createUser(
      {
        email: testEmail,
        password: 'password123',
        name: 'Test Learner',
      },
      { initialTokens: 250_000 },
    );

    expect(user.id).toBeDefined();
    expect(user.email).toBe(testEmail);
    expect(user.tokenBalance).toBe(250_000);

    // Adjust balance (+50,000)
    const updated = await adjustUserTokenBalance(user.id, 50_000, false);
    expect(updated.tokenBalance).toBe(300_000);

    // Consume balance (-20,000)
    const consumed = await adjustUserTokenBalance(user.id, -20_000, true);
    expect(consumed.tokenBalance).toBe(280_000);
    expect(consumed.tokensUsedThisMonth).toBe(20_000);
  });

  it('creates and redeems promo codes successfully', async () => {
    const codeStr = `TESTPROMO_${Date.now()}`;
    await createPromoCode({
      code: codeStr,
      bonusTokens: 75_000,
      maxUses: 10,
      active: true,
    });

    const promoCodes = await listPromoCodes();
    expect(promoCodes.some((c) => c.code === codeStr)).toBe(true);

    // Create user to redeem
    const testEmail = `redeemer_${Date.now()}@test.io`;
    const user = await createUser(
      {
        email: testEmail,
        password: 'password123',
        name: 'Redeemer',
      },
      { initialTokens: 100_000 },
    );

    const result = await redeemPromoCode(user.id, codeStr);
    expect(result.success).toBe(true);
    expect(result.bonusTokens).toBe(75_000);

    const updatedUser = await getUserById(user.id);
    expect(updatedUser?.tokenBalance).toBe(175_000);
  });

  it('updates platform settings and logs audit events', async () => {
    const original = await getAppSettings();
    expect(original.allowRegistrations).toBeDefined();

    await updateAppSettings({ defaultTokensOnSignup: 300_000 }, 'admin@openmaic.io');
    const updated = await getAppSettings();
    expect(updated.defaultTokensOnSignup).toBe(300_000);

    // Restore
    await updateAppSettings({ defaultTokensOnSignup: 250_000 });

    // Test Audit log
    await logAuditEvent({
      adminId: 'usr_admin',
      adminEmail: 'admin@openmaic.io',
      action: 'TEST_AUDIT',
      targetType: 'system',
      details: 'Audit log testing entry',
    });

    const logs = await listAuditLogs(5);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe('TEST_AUDIT');
  });
});
