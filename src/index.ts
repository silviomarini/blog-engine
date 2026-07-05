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

export type { ListArticlesOptions, GetBySlugOptions } from './articles'
export {
  listArticles,
  getAdminArticles,
  getArticleById,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
} from './articles'

export { linkArticles, unlinkArticle } from './link'

// translateArticle lives in the "./translate" subpath export to keep openai
// out of the dependency graph for consumers who don't need translation.

export type { RouteHandlerConfig } from './adapters/nextjs'
export {
  createArticlesRouteHandlers,
  createArticleByIdRouteHandlers,
  createArticleBySlugRouteHandlers,
} from './adapters/nextjs'
