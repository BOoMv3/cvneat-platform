import { MetadataRoute } from 'next';

const BASE_URL = 'https://www.cvneat.fr';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/maintenance'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  } satisfies MetadataRoute.Robots;
}

