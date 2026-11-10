import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import '@openmaic/renderer/fonts.css';
import 'animate.css';
import 'katex/dist/katex.min.css';
import { ThemeProvider } from '@/lib/hooks/use-theme';
import { I18nProvider } from '@/lib/hooks/use-i18n';
import { Toaster } from '@/components/ui/sonner';
import { ServerProvidersInit } from '@/components/server-providers-init';
import { StorageHealthNotice } from '@/components/storage-health-notice';
import { AccessCodeGuard } from '@/components/access-code-guard';
import { ProSwapWatcher } from '@/components/workbench/ProSwapWatcher';
import { AuthModalsProvider } from '@/components/auth/auth-modals-provider';

// The UI font is loaded from @fontsource's stylesheet rather than next/font,
// because only the stylesheet carries the per-subset `unicode-range`
// declarations. Pointing next/font at `inter-latin-wght-normal.woff2` loaded
// exactly one subset, so every character outside Latin — Cyrillic for ru-RU,
// tone-marked letters for vi-VN — fell back to an arbitrary OS font and
// rendered in a different typeface mid-word.
//
// Declaring the other subset files as sibling faces of the same family does not
// fix it either: faces with identical descriptors and no `unicode-range` do not
// fall through per glyph, so the browser simply picks one.
//
// `--font-sans` moves to globals.css since the family no longer comes from
// next/font's generated class.
import '@/lib/utils/dom-patch';
import '@fontsource-variable/inter';

export const metadata: Metadata = {
  metadataBase: new URL('https://quewhat.com'),
  title: {
    default: 'QuéWhat — Learn it, play it, get it',
    template: '%s · QuéWhat',
  },
  description:
    'An AI classroom for families in English and Spanish: homework help step by step, family quiz games, and interactive lessons on any topic.',
  applicationName: 'QuéWhat',
  openGraph: {
    type: 'website',
    siteName: 'QuéWhat',
    url: 'https://quewhat.com',
    title: 'QuéWhat — Learn it, play it, get it',
    description:
      'An AI classroom for families in English and Spanish. Aprende, juega y crea — juntos.',
    locale: 'en_US',
    alternateLocale: ['es_MX'],
  },
  twitter: { card: 'summary_large_image' },
  other: {
    google: 'notranslate',
  },
};

export const viewport: Viewport = {
  themeColor: '#1F3B2D',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="notranslate" translate="no">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <I18nProvider>
            <ServerProvidersInit />
            <ProSwapWatcher />
            <AccessCodeGuard>{children}</AccessCodeGuard>
            <AuthModalsProvider />
            <Toaster position="top-center" />
            {/* After the Toaster: this one raises a toast on mount when
                persistence is already broken, and a toast raised before its
                host exists has nowhere to go. */}
            <StorageHealthNotice />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
