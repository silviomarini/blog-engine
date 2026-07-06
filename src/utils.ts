/**
 * Detect the preferred language from URL query params or Accept-Language header.
 * Pure function — no Next.js dependency. The consuming app calls next/headers
 * and passes the result here.
 *
 * @param params          - URL search params object (e.g. { lang: 'en' })
 * @param acceptLanguage  - Value of the Accept-Language request header (optional)
 */
export function detectLang(
  params: Record<string, string | undefined | null>,
  acceptLanguage?: string | null
): 'it' | 'en' {
  const q = params.lang
  if (q === 'en') return 'en'
  if (q === 'it') return 'it'

  if (acceptLanguage) {
    // Primary language tag is en and NOT it → return 'en', otherwise default 'it'
    if (/^en\b/.test(acceptLanguage) && !/^it\b/.test(acceptLanguage)) return 'en'
  }

  return 'it'
}

/** Strip all HTML tags from a string, collapsing whitespace. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Count words in an HTML string (ignores tags, counts visible words). */
export function wordCount(html: string): number {
  return stripHtml(html).split(/\s+/).filter(Boolean).length
}
