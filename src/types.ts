export interface FAQ {
  domanda: string
  risposta: string
}

/** Generic category shape — consumers define their own list, not this package */
export interface BlogCategory {
  slug: string
  [lang: string]: string
}

export interface Article {
  id: string
  title: string
  slug: string
  category: string | null
  author: string
  content: string | null
  cover_image: string | null
  excerpt: string | null
  tags: string[] | null
  keywords: string | null
  faq: FAQ[]
  reading_time: number
  views: number
  lang: 'it' | 'en'
  group_id: string | null
  published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

/** Returned by the public list endpoint — no content/keywords/faq/published flag */
export type PublicArticle = Pick<Article,
  | 'id' | 'title' | 'slug' | 'lang' | 'group_id' | 'category' | 'author'
  | 'excerpt' | 'cover_image' | 'tags' | 'reading_time' | 'views'
  | 'published_at' | 'created_at'
>

/** Returned by the public single-article endpoint — includes content, no published flag */
export type PublicArticleFull = Pick<Article,
  | 'id' | 'title' | 'slug' | 'lang' | 'group_id' | 'category' | 'author'
  | 'content' | 'excerpt' | 'cover_image' | 'tags' | 'keywords' | 'faq'
  | 'reading_time' | 'views' | 'published_at' | 'created_at' | 'updated_at'
>

/** Returned by the admin list endpoint — no content, but includes published flag */
export type AdminArticleListItem = Pick<Article,
  | 'id' | 'title' | 'slug' | 'lang' | 'group_id' | 'category' | 'author'
  | 'excerpt' | 'cover_image' | 'reading_time' | 'views' | 'published'
  | 'published_at' | 'created_at' | 'updated_at'
>

export interface CreateArticleBody {
  title: string
  slug?: string
  lang?: 'it' | 'en'
  category?: string
  author?: string
  content?: string
  cover_image?: string
  excerpt?: string
  tags?: string[]
  keywords?: string
  faq?: FAQ[]
  reading_time?: number
  published?: boolean
  published_at?: string
}

export type UpdateArticleBody = Partial<CreateArticleBody>
