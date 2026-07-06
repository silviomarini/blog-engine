import { wordCount, stripHtml } from './utils'
import type { CreateArticleBody } from './types'

export interface SeoCheck {
  name: string
  status: 'green' | 'orange' | 'red'
  message: string
}

export interface SeoScoreResult {
  score: number
  maxScore: 7
  checks: SeoCheck[]
}

export interface SerpPreview {
  title: string
  url: string
  description: string
}

type ScoredArticle = Pick<
  CreateArticleBody,
  'title' | 'slug' | 'excerpt' | 'content' | 'keywords' | 'faq' | 'cover_image'
>

/**
 * Compute a real-time SEO score (0–7) for an article being edited in the admin panel.
 * All checks are pure — no DB queries required.
 */
export function computeSeoScore(article: ScoredArticle): SeoScoreResult {
  const checks: SeoCheck[] = []
  let score = 0

  // 1. Title length
  const titleLen = (article.title ?? '').length
  if (titleLen > 0 && titleLen <= 60) {
    checks.push({ name: 'Titolo', status: 'green', message: `${titleLen}/60 caratteri` })
    score++
  } else if (titleLen > 60 && titleLen <= 70) {
    checks.push({ name: 'Titolo', status: 'orange', message: `${titleLen}/60 caratteri — troppo lungo` })
  } else {
    checks.push({ name: 'Titolo', status: 'red', message: titleLen === 0 ? 'Mancante' : `${titleLen} caratteri — troppo lungo` })
  }

  // 2. Meta description (excerpt)
  const excLen = (article.excerpt ?? '').length
  if (excLen >= 120 && excLen <= 160) {
    checks.push({ name: 'Meta description', status: 'green', message: `${excLen}/160 caratteri` })
    score++
  } else if ((excLen > 0 && excLen < 120) || (excLen > 160 && excLen <= 300)) {
    checks.push({ name: 'Meta description', status: 'orange', message: `${excLen} caratteri — ottimale: 120-160` })
  } else {
    checks.push({ name: 'Meta description', status: 'red', message: excLen === 0 ? 'Mancante' : `${excLen} caratteri — troppo lunga` })
  }

  // 3. Word count
  const wc = article.content ? wordCount(article.content) : 0
  if (wc >= 1500) {
    checks.push({ name: 'Word count', status: 'green', message: `${wc} parole` })
    score++
  } else if (wc >= 800) {
    checks.push({ name: 'Word count', status: 'orange', message: `${wc} parole — obiettivo: 1500+` })
  } else {
    checks.push({ name: 'Word count', status: 'red', message: wc === 0 ? 'Contenuto mancante' : `${wc} parole — troppo corto` })
  }

  // 4. Keywords
  const hasKeywords = Boolean(article.keywords?.trim())
  checks.push({
    name: 'Keywords SEO',
    status: hasKeywords ? 'green' : 'red',
    message: hasKeywords ? 'Compilate' : 'Mancanti',
  })
  if (hasKeywords) score++

  // 5. FAQ
  const hasFaq = Array.isArray(article.faq) && article.faq.length > 0
  checks.push({
    name: 'FAQ',
    status: hasFaq ? 'green' : 'red',
    message: hasFaq ? `${article.faq!.length} domande` : 'Nessuna FAQ',
  })
  if (hasFaq) score++

  // 6. Cover image
  const hasImage = Boolean(article.cover_image?.trim())
  checks.push({
    name: 'Cover image',
    status: hasImage ? 'green' : 'red',
    message: hasImage ? 'Presente' : 'Mancante',
  })
  if (hasImage) score++

  // 7. Slug contains a word from the title
  const slug = article.slug ?? ''
  const titleWords = stripHtml(article.title ?? '')
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(w => w.length > 3)
  const slugHasTitleWord = titleWords.length > 0 && titleWords.some(w => slug.includes(w))
  if (slugHasTitleWord) {
    checks.push({ name: 'Slug', status: 'green', message: 'Contiene keyword del titolo' })
    score++
  } else {
    checks.push({ name: 'Slug', status: slug ? 'orange' : 'red', message: slug ? 'Non contiene keyword del titolo' : 'Mancante' })
  }

  return { score, maxScore: 7, checks }
}

/**
 * Build a SERP preview (how the article appears in Google search results).
 *
 * @param article   - Article fields (title + excerpt + slug)
 * @param domain    - e.g. "https://bookstack.ink"
 * @param blogPath  - e.g. "blog"
 */
export function buildSerpPreview(
  article: Pick<CreateArticleBody, 'title' | 'slug' | 'excerpt'>,
  domain: string,
  blogPath: string
): SerpPreview {
  const title = (article.title ?? '').slice(0, 70)
  const slug = article.slug ?? ''
  const url = slug ? `${domain}/${blogPath}/${slug}` : `${domain}/${blogPath}`
  const description = (article.excerpt ?? '').slice(0, 160)
  return { title, url, description }
}
