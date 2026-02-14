import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://jobrun.app', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://jobrun.app/privacy', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: 'https://jobrun.app/terms', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];
}
