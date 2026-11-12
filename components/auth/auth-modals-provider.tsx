'use client';

import { AuthModal } from './auth-modal';
import { OnboardingModal } from './onboarding-modal';
import { TermsUpdateNotice } from './terms-update-notice';
import { PricingModal } from '@/components/monetization/pricing-modal';
import { TokenCalculatorModal } from '@/components/calculator/token-calculator-modal';

export function AuthModalsProvider() {
  return (
    <>
      <AuthModal />
      <OnboardingModal />
      <TermsUpdateNotice />
      <PricingModal />
      <TokenCalculatorModal />
    </>
  );
}
