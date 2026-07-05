import { slugify } from './slugify'
import type {
  Article,
  PublicArticle,
  PublicArticleFull,
  AdminArticleListItem,
  CreateArticleBody,
  UpdateArticleBody,
} from './types'

// Structural type — callers pass their own SupabaseClient; TypeScript structural
// typing ensures compatibility without forcing a peer dep version on consumers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any }

const PUBLIC_FIELDS =
  'id, title, slug, lang, group_id, category, author, excerpt, cover_image, tags, reading_time, views, published_at, created_at'

const PUBLIC_FULL_FIELDS =
  'id, title, slug, lang, group_id, category, author, content, excerpt, cover_image, tags, keywords, faq, reading_time, views, published_at, created_at, updated_at'

const ADMIN_FIELDS =
  'id, title, slug, lang, group_id, category, author, content, excerpt, cover_image, tags, keywords, faq, reading_time, views, published, published_at, created_at, updated_at'

const ADMIN_LIST_FIELDS =
  'id, title, slug, lang, group_id, category, author, excerpt, cover_image, reading_time, views, published, published_at, created_at, updated_at'

export interface ListArticlesOptions {
  category?: string
  lang?: 'it' | 'en'
  limit?: number
  offset?: number
}

/** Public list of published articles, optionally filtered by category and lang. */
export async function listArticles(
  db: Db,
  options: ListArticlesOptions = {}
): Promise<PublicArticle[]> {
  const { category, lang, limit = 20, offset = 0 } = options
  const safeLimit = Math.min(50, Math.max(1, limit))
  const safeOffset = Math.max(0, offset)

  const now = new Date().toISOString()
  let query = db
    .from('articles')
    .select(PUBLIC_FIELDS)
    .eq('published', true)
    .or(`published_at.lte.${now},published_at.is.null`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(safeOffset, safeOffset + safeLimit - 1)

  if (category) query = query.eq('category', category)
  if (lang) query = query.eq('lang', lang)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch articles: ${error.message}`)
  return data ?? []
}

/** All articles including drafts — call only when the consumer has verified admin access. */
export async function getAdminArticles(db: Db): Promise<AdminArticleListItem[]> {
  const { data, error } = await db
    .from('articles')
    .select(ADMIN_LIST_FIELDS)
    .order('published_at', { ascending: false, nullsFirst: false })

  if (error) throw new Error(`Failed to fetch admin articles: ${error.message}`)
  return data ?? []
}

/** Fetch a single article by ID with all fields — call only when the consumer has verified admin access. */
export async function getArticleById(db: Db, id: string): Promise<Article | null> {
  const { data } = await db.from('articles').select(ADMIN_FIELDS).eq('id', id).single()
  return (data as Article) ?? null
}

export interface GetBySlugOptions {
  lang?: 'it' | 'en'
  /** Default: true — fire-and-forget view count increment */
  incrementViews?: boolean
}

/** Public single-article fetch by slug. Increments view count by default. */
export async function getArticleBySlug(
  db: Db,
  slug: string,
  options: GetBySlugOptions = {}
): Promise<PublicArticleFull | null> {
  const { lang, incrementViews = true } = options
  const now = new Date().toISOString()

  let query = db
    .from('articles')
    .select(PUBLIC_FULL_FIELDS)
    .eq('slug', slug)
    .eq('published', true)
    .or(`published_at.lte.${now},published_at.is.null`)

  if (lang) query = query.eq('lang', lang)

  const { data } = await query.single()
  if (!data) return null

  if (incrementViews) {
    db.from('articles')
      .update({ views: (data.views ?? 0) + 1 })
      .eq('id', data.id)
      .then(() => {})
  }

  return data as PublicArticleFull
}

function buildInsertPayload(body: CreateArticleBody, slug: string) {
  const published = Boolean(body.published)
  return {
    title: String(body.title ?? '').trim(),
    slug,
    lang: body.lang === 'en' ? 'en' : 'it',
    category: body.category ? String(body.category).trim() : null,
    author: body.author ? String(body.author).trim() : '',
    content: body.content ? String(body.content).trim() : null,
    cover_image: body.cover_image ? String(body.cover_image).trim() : null,
    excerpt: body.excerpt ? String(body.excerpt).slice(0, 300).trim() : null,
    tags: Array.isArray(body.tags) ? body.tags : null,
    keywords: body.keywords ? String(body.keywords).trim() : null,
    faq: Array.isArray(body.faq) ? body.faq : [],
    reading_time: body.reading_time ? Number(body.reading_time) : 5,
    published,
    published_at: body.published_at
      ? String(body.published_at)
      : published
        ? new Date().toISOString()
        : null,
    updated_at: new Date().toISOString(),
  }
}

/** Create a new article — call only when the consumer has verified admin access. */
export async function createArticle(db: Db, body: CreateArticleBody): Promise<Article> {
  const title = body.title?.trim()
  if (!title) throw new Error('title is required')

  const slug = body.slug?.trim() || slugify(title)
  const insert = buildInsertPayload(body, slug)

  const { data, error } = await db.from('articles').insert(insert).select(ADMIN_FIELDS).single()
  if (error) throw new Error(error.message)
  return data as Article
}

/** Partial update of an article — call only when the consumer has verified admin access. */
export async function updateArticle(
  db: Db,
  id: string,
  body: UpdateArticleBody
): Promise<Article> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if ('lang' in body && (body.lang === 'it' || body.lang === 'en')) update.lang = body.lang

  const textFields = ['title', 'slug', 'category', 'author', 'content', 'cover_image', 'keywords'] as const
  for (const f of textFields) {
    if (f in body) update[f] = body[f] ? String(body[f]).trim() : null
  }

  if ('excerpt' in body) update.excerpt = body.excerpt ? String(body.excerpt).slice(0, 300).trim() : null
  if ('tags' in body) update.tags = Array.isArray(body.tags) ? body.tags : null
  if ('faq' in body) update.faq = Array.isArray(body.faq) ? body.faq : []
  if ('reading_time' in body) update.reading_time = Number(body.reading_time) || 5
  if ('published' in body) update.published = Boolean(body.published)

  if ('published_at' in body) {
    update.published_at = body.published_at ? String(body.published_at) : null
  } else if ('published' in body && Boolean(body.published)) {
    // publishing without an explicit date → set to now
    update.published_at = new Date().toISOString()
  }

  const { data, error } = await db.from('articles').update(update).eq('id', id).select(ADMIN_FIELDS).single()
  if (error) throw new Error(error.message)
  return data as Article
}

/** Delete an article by ID — call only when the consumer has verified admin access. */
export async function deleteArticle(db: Db, id: string): Promise<{ deleted: true }> {
  const { error } = await db.from('articles').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { deleted: true }
}
