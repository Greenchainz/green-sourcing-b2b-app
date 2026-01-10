import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://greenchainz.com'
  const lastModified = new Date()

  // Static pages with priority
  const staticPages = [
    { url: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { url: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
    { url: '/how-it-works', priority: 0.8, changeFrequency: 'monthly' as const },
    { url: '/catalog', priority: 0.9, changeFrequency: 'daily' as const },
    { url: '/pricing', priority: 0.8, changeFrequency: 'weekly' as const },
    { url: '/partners', priority: 0.7, changeFrequency: 'monthly' as const },
    { url: '/developers', priority: 0.6, changeFrequency: 'monthly' as const },
    { url: '/integrations', priority: 0.7, changeFrequency: 'monthly' as const },
    { url: '/blog', priority: 0.7, changeFrequency: 'weekly' as const },
    { url: '/contact', priority: 0.6, changeFrequency: 'monthly' as const },
    { url: '/careers', priority: 0.6, changeFrequency: 'monthly' as const },
    { url: '/legal/terms', priority: 0.3, changeFrequency: 'yearly' as const },
    { url: '/legal/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
    { url: '/help', priority: 0.5, changeFrequency: 'monthly' as const },
  ]

  return staticPages.map(({ url, priority, changeFrequency }) => ({
    url: `${baseUrl}${url}`,
    lastModified,
    changeFrequency,
    priority,
  }))
}
