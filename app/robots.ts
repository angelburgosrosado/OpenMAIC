import type { MetadataRoute } from 'next';

const SITE = 'https://www.quewhat.com';

export default function robots(): MetadataRoute.Robots {
  // Only the production site should be indexed; previews and local builds stay hidden.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin',
        '/classroom/',
        '/workspace',
        '/workbench',
        '/eval',
        '/generation-preview',
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
