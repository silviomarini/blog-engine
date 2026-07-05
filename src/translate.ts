import OpenAI from 'openai'
import { randomUUID } from 'crypto'
import { slugify } from './slugify'
import type { Article, FAQ } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any }

const ADMIN_FIELDS =
  'id, title, slug, lang, group_id, category, author, content, excerpt, cover_image, tags, keywords, faq, reading_time, views, published, published_at, created_at, updated_at'

interface SourceArticle {
  title: string
  slug: string
  lang: string
  group_id: string | null
  category: string | null
  author: string
  content: string | null
  excerpt: string | null
  cover_image: string | null
  tags: string[] | null
  keywords: string | null
  faq: FAQ[]
  reading_time: number
  published: boolean
  published_at: string | null
}

interface TranslatedPayload {
  title: string
  slug?: string
  excerpt?: string
  content?: string
  keywords?: string
  tags?: string[]
  faq?: FAQ[]
}

export interface TranslateArticleOptions {
  /** Target language. Defaults to 'en'. */
  targetLang?: 'it' | 'en'
  /** OpenAI model to use. Defaults to 'gpt-4o-mini'. */
  model?: string
}

/**
 * Translate an article to a target language using the OpenAI API.
 * Creates a new article row with the target lang, linked via group_id to the source.
 * The new article is created as a draft (published: false).
 * Call only when the consumer has verified admin access.
 *
 * @param db          - Supabase client (already instantiated by the consumer)
 * @param id          - ID of the source article to translate
 * @param openaiApiKey - OpenAI API key (openai peer dependency must be installed)
 * @param options.targetLang - Language to translate into. Defaults to 'en'.
 * @param options.model      - OpenAI model. Defaults to 'gpt-4o-mini'.
 */
export async function translateArticle(
  db: Db,
  id: string,
  openaiApiKey: string,
  options: TranslateArticleOptions = {}
): Promise<Article> {
  const { targetLang = 'en', model = 'gpt-4o-mini' } = options

  const { data: article } = await db.from('articles').select(ADMIN_FIELDS).eq('id', id).single()
  if (!article) throw new Error('Article not found')

  const a = article as SourceArticle

  if (a.lang === targetLang) throw new Error(`Article is already in '${targetLang}'`)

  const fromLang = a.lang
  const toTranslate = {
    title: a.title,
    excerpt: a.excerpt ?? '',
    content: a.content ?? '',
    keywords: a.keywords ?? '',
    tags: a.tags ?? [],
    faq: a.faq ?? [],
  }

  const prompt = `Translate the following JSON fields from ${fromLang.toUpperCase()} to ${targetLang.toUpperCase()} for a blog. Rules:
- "title": translate naturally for the target audience
- "excerpt": translate naturally (max 300 chars)
- "content": this is HTML. Translate ONLY the visible text content. Preserve ALL HTML tags, attributes, classes, href values, src values, and structure exactly as-is. Never alter tags, only their text content.
- "keywords": translate the comma-separated SEO keywords
- "tags": translate each tag in the array
- "faq": translate each item's "domanda" (question) and "risposta" (answer) fields
- "slug": generate a URL-safe ${targetLang} slug from the translated title (lowercase, hyphens, no special chars, max 60 chars)

Return ONLY valid JSON with these exact keys: title, slug, excerpt, content, keywords, tags, faq

Input:
${JSON.stringify(toTranslate, null, 2)}`

  const client = new OpenAI({ apiKey: openaiApiKey })

  const aiRes = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You are a professional translator. Always return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  })

  let translated: TranslatedPayload
  try {
    translated = JSON.parse(aiRes.choices[0]?.message?.content ?? 'null') as TranslatedPayload
  } catch {
    throw new Error('AI returned invalid JSON')
  }
  if (!translated?.title) throw new Error('AI returned an invalid translation payload')

  // Ensure slug uniqueness — append '-{targetLang}' suffix on collision
  let slug = slugify(translated.slug ?? translated.title)
  const { data: existing } = await db.from('articles').select('id').eq('slug', slug).maybeSingle()
  if (existing) slug = `${slug}-${targetLang}`

  // Resolve or create a group_id to link the two language versions
  const groupId = a.group_id ?? randomUUID()

  const newArticle = {
    title: String(translated.title).trim(),
    slug,
    lang: targetLang,
    group_id: groupId,
    category: a.category,
    author: a.author,
    cover_image: a.cover_image,
    content: translated.content ? String(translated.content).trim() : null,
    excerpt: translated.excerpt ? String(translated.excerpt).slice(0, 300).trim() : null,
    keywords: translated.keywords ? String(translated.keywords).trim() : null,
    tags: Array.isArray(translated.tags) ? translated.tags : null,
    faq: Array.isArray(translated.faq) ? translated.faq : [],
    reading_time: a.reading_time,
    published: false,
    published_at: null,
    updated_at: new Date().toISOString(),
  }

  const { data: created, error } = await db
    .from('articles')
    .insert(newArticle)
    .select(ADMIN_FIELDS)
    .single()
  if (error) throw new Error(error.message)

  // Ensure the source article also carries the group_id if it didn't have one
  if (!a.group_id) {
    await db.from('articles').update({ group_id: groupId }).eq('id', id)
  }

  return created as Article
}
