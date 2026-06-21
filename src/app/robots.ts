import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow:    ['/', '/explore', '/t/', '/u/', '/privacy', '/terms'],
        disallow: ['/my/', '/room/', '/api/', '/login', '/signup'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
