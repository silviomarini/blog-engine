export type {
  FAQ,
  BlogCategory,
  Article,
  PublicArticle,
  PublicArticleFull,
  AdminArticleListItem,
  CreateArticleBody,
  UpdateArticleBody,
} from './types'

export { slugify } from './slugify'

export { detectLang, stripHtml, wordCount } from './utils'

export type { ListArticlesOptions, GetBySlugOptions, ArticleSibling } from './articles'
export {
  listArticles,
  getAdminArticles,
  getArticleById,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  buildSiblingMap,
  getArticleSiblings,
} from './articles'

export { linkArticles, unlinkArticle } from './link'

// translateArticle and createArticleTranslateRouteHandlers live in the "./translate"
// subpath export to keep openai out of the dependency graph for consumers who don't
// need translation.

export type { BlogConfig } from './seo'
export {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildItemListSchema,
  buildWebsiteSchema,
  buildOrganizationSchema,
} from './seo'

export type { SeoCheck, SeoScoreResult, SerpPreview } from './seo-score'
export { computeSeoScore, buildSerpPreview } from './seo-score'

export type { SitemapEntry } from './sitemap'
export { buildSitemapEntries, buildLlmsTxt } from './sitemap'

export type { RouteHandlerConfig } from './adapters/nextjs'
export {
  createArticlesRouteHandlers,
  createArticleByIdRouteHandlers,
  createArticleBySlugRouteHandlers,
  createAdminArticlesRouteHandlers,
  createArticleLinkRouteHandlers,
} from './adapters/nextjs'
