import { wordCount } from './utils'
import type { PublicArticleFull, PublicArticle, FAQ } from './types'

export interface BlogConfig {
  /** Human-readable platform name, e.g. "Bookstack" */
  platformName: string
  /** Full origin with protocol, e.g. "https://bookstack.ink" */
  domain: string
  /** URL path segment for the blog, e.g. "blog" */
  blogPath: string
  /** Short description of the platform (1-2 sentences) */
  description: string
  /** Absolute URL of the logo / og.png, e.g. "https://bookstack.ink/og.png" */
  logoUrl?: string
  twitterUrl?: string
  instagramUrl?: string
  githubUrl?: string
  foundingYear?: string
  /** Topics the platform covers — used in Organization.knowsAbout */
  knowsAbout?: string[]
}

/** Canonical URL for an article */
function articleUrl(domain: string, blogPath: string, slug: string): string {
  return `${domain}/${blogPath}/${slug}`
}

/** BCP-47 locale tag from our two-char lang code */
function toLang(lang: 'it' | 'en'): string {
  return lang === 'en' ? 'en-US' : 'it-IT'
}

/**
 * Article JSON-LD schema (Schema.org Article type).
 * Includes wordCount, speakable, about (tags as Thing), and isPartOf for GEO.
 */
export function buildArticleSchema(
  article: PublicArticleFull,
  config: BlogConfig
): Record<string, unknown> {
  const { domain, blogPath, platformName, logoUrl } = config
  const url = articleUrl(domain, blogPath, article.slug)
  const blogUrl = `${domain}/${blogPath}`
  const wc = article.content ? wordCount(article.content) : 0

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt ?? undefined,
    datePublished: article.published_at ?? article.created_at,
    dateModified: article.updated_at,
    author: {
      '@type': 'Person',
      name: article.author || platformName,
      url: blogUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: platformName,
      url: domain,
      ...(logoUrl ? { logo: { '@type': 'ImageObject', url: logoUrl } } : {}),
    },
    ...(article.cover_image
      ? { image: { '@type': 'ImageObject', url: article.cover_image, caption: article.title } }
      : {}),
    ...(article.keywords ? { keywords: article.keywords } : {}),
    ...(article.category ? { articleSection: article.category } : {}),
    inLanguage: toLang(article.lang),
    isAccessibleForFree: true,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    wordCount: wc,
    isPartOf: { '@type': 'Blog', name: `${platformName} Blog`, url: blogUrl },
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', 'h2', '.article-excerpt'] },
  }

  if (article.tags && article.tags.length > 0) {
    schema.about = article.tags.map(tag => ({ '@type': 'Thing', name: tag }))
  }

  return schema
}

/**
 * BreadcrumbList JSON-LD schema.
 * Home → Blog index → Article
 */
export function buildBreadcrumbSchema(
  article: { title: string; slug: string },
  config: BlogConfig
): Record<string, unknown> {
  const { domain, blogPath, platformName } = config
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: domain },
      { '@type': 'ListItem', position: 2, name: `${platformName} Blog`, item: `${domain}/${blogPath}` },
      { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl(domain, blogPath, article.slug) },
    ],
  }
}

/**
 * FAQPage JSON-LD schema.
 * Returns null when the article has no FAQ entries (safe to use: skip rendering if null).
 */
export function buildFaqSchema(article: { faq: FAQ[] }): Record<string, unknown> | null {
  if (!article.faq || article.faq.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faq.map(item => ({
      '@type': 'Question',
      name: item.domanda,
      acceptedAnswer: { '@type': 'Answer', text: item.risposta },
    })),
  }
}

/**
 * ItemList JSON-LD schema for the blog index page.
 */
export function buildItemListSchema(
  articles: Array<Pick<PublicArticle, 'title' | 'slug'>>,
  config: BlogConfig
): Record<string, unknown> {
  const { domain, blogPath, platformName } = config
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${platformName} Blog`,
    numberOfItems: articles.length,
    itemListElement: articles.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: a.title,
      url: articleUrl(domain, blogPath, a.slug),
    })),
  }
}

/**
 * WebSite JSON-LD schema with SearchAction pointing at the blog index.
 * Place once in the root layout.
 */
export function buildWebsiteSchema(config: BlogConfig): Record<string, unknown> {
  const { domain, blogPath, platformName } = config
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: platformName,
    url: domain,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${domain}/${blogPath}?category={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * Organization JSON-LD schema.
 * Place once in the root layout alongside buildWebsiteSchema.
 */
export function buildOrganizationSchema(config: BlogConfig): Record<string, unknown> {
  const {
    domain, platformName, description, logoUrl,
    twitterUrl, instagramUrl, githubUrl,
    foundingYear, knowsAbout,
  } = config

  const sameAs = [twitterUrl, instagramUrl, githubUrl].filter(Boolean) as string[]

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: platformName,
    url: domain,
    description,
    ...(logoUrl
      ? { logo: { '@type': 'ImageObject', url: logoUrl, width: 1200, height: 630 } }
      : {}),
    ...(foundingYear ? { foundingDate: foundingYear } : {}),
    inLanguage: ['it', 'en'],
    ...(knowsAbout && knowsAbout.length > 0 ? { knowsAbout } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  }
}
