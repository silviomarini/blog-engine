import { NextRequest, NextResponse } from 'next/server'
import {
  listArticles,
  createArticle,
  getArticleById,
  updateArticle,
  deleteArticle,
  getArticleBySlug,
} from '../articles'
import type { CreateArticleBody, UpdateArticleBody } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any }

export interface RouteHandlerConfig {
  /** Supabase client, already instantiated by the consumer. */
  db: Db
  /**
   * Called by every write handler (POST/PATCH/DELETE) and admin-only GET handlers.
   * The consumer implements this using their own auth system — blog-engine has no
   * knowledge of any specific auth library.
   */
  getAuthContext: (req: NextRequest) => Promise<{ isAdmin: boolean }>
  /**
   * If provided, category values in write requests are validated against this list.
   * Leave undefined to allow any value (validation handled by the consumer project).
   */
  allowedCategories?: string[]
}

type IdContext = { params: Promise<{ id: string }> }
type SlugContext = { params: Promise<{ slug: string }> }

function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

function err(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

function checkCategory(category: unknown, allowed: string[] | undefined): boolean {
  if (!allowed || !category) return true
  return allowed.includes(String(category))
}

/**
 * Generates { GET, POST } handlers for the articles list/create endpoint.
 *
 * GET  — public, returns published articles. Query params: category, lang, limit, offset.
 * POST — admin only (403 if isAdmin is false). Creates a new article.
 *
 * Usage in app/api/v1/articles/route.ts:
 *   export const { GET, POST } = createArticlesRouteHandlers({ db, getAuthContext })
 */
export function createArticlesRouteHandlers(config: RouteHandlerConfig) {
  const { db, getAuthContext, allowedCategories } = config

  async function GET(req: NextRequest): Promise<NextResponse> {
    try {
      const url = new URL(req.url)
      const category = url.searchParams.get('category') ?? undefined
      const langParam = url.searchParams.get('lang')
      const lang = langParam === 'it' || langParam === 'en' ? langParam : undefined
      const limit = Number(url.searchParams.get('limit') ?? 20)
      const offset = Number(url.searchParams.get('offset') ?? 0)

      const data = await listArticles(db, { category, lang, limit, offset })
      return ok(data)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Internal error', 500)
    }
  }

  async function POST(req: NextRequest): Promise<NextResponse> {
    try {
      const { isAdmin } = await getAuthContext(req)
      if (!isAdmin) return err('Forbidden', 403)

      const body = await req.json() as Record<string, unknown>
      if (!checkCategory(body.category, allowedCategories)) {
        return err(`Invalid category. Allowed: ${allowedCategories!.join(', ')}`, 400)
      }

      const data = await createArticle(db, body as unknown as CreateArticleBody)
      return ok(data, 201)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Internal error', 500)
    }
  }

  return { GET, POST }
}

/**
 * Generates { GET, PATCH, DELETE } handlers for the single-article-by-ID endpoint.
 * All three handlers require admin access (403 if isAdmin is false).
 *
 * Usage in app/api/v1/articles/[id]/route.ts:
 *   export const { GET, PATCH, DELETE } = createArticleByIdRouteHandlers({ db, getAuthContext })
 */
export function createArticleByIdRouteHandlers(config: RouteHandlerConfig) {
  const { db, getAuthContext, allowedCategories } = config

  async function GET(req: NextRequest, context: IdContext): Promise<NextResponse> {
    try {
      const { isAdmin } = await getAuthContext(req)
      if (!isAdmin) return err('Forbidden', 403)

      const { id } = await context.params
      const data = await getArticleById(db, id)
      if (!data) return err('Not found', 404)
      return ok(data)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Internal error', 500)
    }
  }

  async function PATCH(req: NextRequest, context: IdContext): Promise<NextResponse> {
    try {
      const { isAdmin } = await getAuthContext(req)
      if (!isAdmin) return err('Forbidden', 403)

      const { id } = await context.params
      const body = await req.json() as Record<string, unknown>
      if (!checkCategory(body.category, allowedCategories)) {
        return err(`Invalid category. Allowed: ${allowedCategories!.join(', ')}`, 400)
      }

      const data = await updateArticle(db, id, body as unknown as UpdateArticleBody)
      return ok(data)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Internal error', 500)
    }
  }

  async function DELETE(req: NextRequest, context: IdContext): Promise<NextResponse> {
    try {
      const { isAdmin } = await getAuthContext(req)
      if (!isAdmin) return err('Forbidden', 403)

      const { id } = await context.params
      const data = await deleteArticle(db, id)
      return ok(data)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Internal error', 500)
    }
  }

  return { GET, PATCH, DELETE }
}

/**
 * Generates { GET } handler for the public single-article-by-slug endpoint.
 * No auth required. Increments view count on each request.
 *
 * Usage in app/api/v1/articles/slug/[slug]/route.ts:
 *   export const { GET } = createArticleBySlugRouteHandlers({ db, getAuthContext })
 */
export function createArticleBySlugRouteHandlers(config: RouteHandlerConfig) {
  const { db } = config

  async function GET(req: NextRequest, context: SlugContext): Promise<NextResponse> {
    try {
      const { slug } = await context.params
      const url = new URL(req.url)
      const langParam = url.searchParams.get('lang')
      const lang = langParam === 'it' || langParam === 'en' ? langParam : undefined

      const data = await getArticleBySlug(db, slug, { lang })
      if (!data) return err('Article not found', 404)
      return ok(data)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Internal error', 500)
    }
  }

  return { GET }
}
