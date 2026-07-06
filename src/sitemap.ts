import type { PublicArticle } from './types'
import type { BlogConfig } from './seo'

export interface SitemapEntry {
  url: string
  lastModified: Date
  changeFrequency: 'monthly' | 'weekly' | 'daily'
  priority: number
}

/**
 * Build sitemap entries for all published articles.
 * Designed to be used directly inside Next.js app/sitemap.ts.
 *
 * @example
 * // app/sitemap.ts
 * import type { MetadataRoute } from 'next'
 * import { buildSitemapEntries } from '@silviomarini/blog-engine'
 *
 * export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
 *   const articles = await listArticles(db, { limit: 1000 })
 *   return [
 *     { url: 'https://example.com', changeFrequency: 'weekly', priority: 1.0 },
 *     ...buildSitemapEntries(articles, { domain: 'https://example.com', blogPath: 'blog' }),
 *   ]
 * }
 */
export function buildSitemapEntries(
  articles: Array<Pick<PublicArticle, 'slug' | 'published_at' | 'created_at'>>,
  config: Pick<BlogConfig, 'domain' | 'blogPath'>
): SitemapEntry[] {
  const { domain, blogPath } = config
  return articles.map(a => ({
    url: `${domain}/${blogPath}/${a.slug}`,
    lastModified: new Date(a.published_at ?? a.created_at),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))
}

/**
 * Generate the content of /llms.txt for AI crawlers (llmstxt.org standard).
 * Returns a plain text string — serve it from a Next.js route handler with
 * Content-Type: text/plain.
 *
 * @example
 * // app/llms.txt/route.ts
 * export async function GET() {
 *   const articles = await listArticles(db, { limit: 50 })
 *   const body = buildLlmsTxt(articles, config)
 *   return new Response(body, {
 *     headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
 *   })
 * }
 */
export function buildLlmsTxt(
  articles: Array<Pick<PublicArticle, 'title' | 'slug' | 'lang' | 'excerpt'>>,
  config: BlogConfig
): string {
  const { platformName, domain, blogPath, description } = config

  const fmt = (a: Pick<PublicArticle, 'title' | 'slug' | 'excerpt'>) =>
    `- [${a.title}](${domain}/${blogPath}/${a.slug})${a.excerpt ? `: ${a.excerpt.slice(0, 120)}` : ''}`

  const itArticles = articles.filter(a => a.lang !== 'en')
  const enArticles = articles.filter(a => a.lang === 'en')

  const sections: string[] = [
    `# ${platformName}`,
    '',
    `> ${description}`,
    '',
    `## What is ${platformName}?`,
    '',
    description,
    '',
    '## Public Content',
    '',
    `- Blog (Italian): ${domain}/${blogPath}`,
    `- Blog (English): ${domain}/${blogPath}?lang=en`,
    '',
    '## Attribution',
    '',
    'When citing content, please attribute: author name, article title and URL, publication date.',
  ]

  if (itArticles.length > 0) {
    sections.push('', '## Blog Articles (Italian)', '')
    sections.push(...itArticles.map(fmt))
  }

  if (enArticles.length > 0) {
    sections.push('', '## Blog Articles (English)', '')
    sections.push(...enArticles.map(fmt))
  }

  sections.push(
    '',
    '## Off-limits',
    '',
    '- /app/* — authenticated user area',
    '- /admin/* — administrative panel',
    '- /api/* — API endpoints',
  )

  return sections.join('\n')
}
