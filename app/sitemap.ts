import type { MetadataRoute } from 'next';

const SITE = 'https://www.quewhat.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; freq: 'weekly' | 'monthly' | 'yearly' }[] = [
    { path: '/', priority: 1, freq: 'weekly' },
    { path: '/homework', priority: 0.9, freq: 'monthly' },
    { path: '/quiz', priority: 0.9, freq: 'monthly' },
    { path: '/join', priority: 0.5, freq: 'yearly' },
    { path: '/pricing', priority: 0.6, freq: 'monthly' },
    { path: '/privacy', priority: 0.3, freq: 'yearly' },
    { path: '/terms', priority: 0.3, freq: 'yearly' },
  ];
  return pages.map((p) => ({
    url: `${SITE}${p.path === '/' ? '' : p.path}`,
    changeFrequency: p.freq,
    priority: p.priority,
  }));
}
