'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/auth-store';
import { useI18n } from '@/lib/hooks/use-i18n';

/**
 * We promise in the Privacy Policy ("10. Changes" / "10. Cambios") to let
 * account holders know when the Terms/Privacy Policy change. This is that
 * notice: shown once a session to a signed-in user whose account hasn't
 * accepted the current LEGAL_VERSION yet (GET /api/auth/me sets
 * needsTermsReconsent). Dismissing without clicking the acknowledge button
 * leaves the account's stored version unchanged, so it reappears next
 * session until the person acknowledges it.
 */
export function TermsUpdateNotice() {
  const { t } = useI18n();
  const authenticated = useAuthStore((s) => s.authenticated);
  const open = useAuthStore((s) => s.termsNoticeOpen);
  const setOpen = useAuthStore((s) => s.setTermsNoticeOpen);
  const acceptUpdatedTerms = useAuthStore((s) => s.acceptUpdatedTerms);

  if (!authenticated) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <FileText className="h-5 w-5" />
          </div>
          <DialogTitle>{t('legal.updatedTitle')}</DialogTitle>
          <DialogDescription>{t('legal.updatedBody')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/privacy" target="_blank" className="underline font-semibold">
            {t('legal.reviewPrivacy')}
          </Link>
          <Link href="/terms" target="_blank" className="underline font-semibold">
            {t('legal.reviewTerms')}
          </Link>
        </div>

        <DialogFooter>
          <Button
            onClick={acceptUpdatedTerms}
            className="bg-violet-600 hover:bg-violet-700 text-white font-medium"
          >
            {t('legal.accept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
