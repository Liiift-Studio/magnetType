import type { MetadataRoute } from 'next'
// lastModified: update this date when meaningful content changes are deployed
export default function sitemap(): MetadataRoute.Sitemap {
	return [{ url: 'https://magnettype.com', lastModified: new Date('2026-05-31'), changeFrequency: 'monthly', priority: 1 }]
}
