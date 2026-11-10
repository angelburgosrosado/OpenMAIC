import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'QuéWhat',
    short_name: 'QuéWhat',
    description: 'An AI classroom for families in English and Spanish.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#1F3B2D',
    theme_color: '#1F3B2D',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
