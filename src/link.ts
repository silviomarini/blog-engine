import { randomUUID } from 'crypto'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any }

/**
 * Link two articles as language versions of the same content.
 * Merges any existing group_id — if both already have different groups, all
 * articles in the partner's group are migrated to the primary article's group.
 * Call only when the consumer has verified admin access.
 */
export async function linkArticles(
  db: Db,
  id: string,
  partnerId: string
): Promise<{ group_id: string }> {
  if (!partnerId || partnerId === id) {
    throw new Error('partner_id is required and must differ from id')
  }

  const [{ data: a }, { data: b }] = await Promise.all([
    db.from('articles').select('id, group_id').eq('id', id).single(),
    db.from('articles').select('id, group_id').eq('id', partnerId).single(),
  ])

  if (!a || !b) throw new Error('One or both articles not found')

  const groupId: string =
    (a as { group_id: string | null }).group_id ??
    (b as { group_id: string | null }).group_id ??
    randomUUID()

  const partnerGroupId = (b as { group_id: string | null }).group_id
  if (partnerGroupId && partnerGroupId !== groupId) {
    await db.from('articles').update({ group_id: groupId }).eq('group_id', partnerGroupId)
  }

  await Promise.all([
    db.from('articles').update({ group_id: groupId }).eq('id', id),
    db.from('articles').update({ group_id: groupId }).eq('id', partnerId),
  ])

  return { group_id: groupId }
}

/**
 * Remove an article from its language group (set group_id to null).
 * Call only when the consumer has verified admin access.
 */
export async function unlinkArticle(db: Db, id: string): Promise<{ unlinked: true }> {
  const { error } = await db.from('articles').update({ group_id: null }).eq('id', id)
  if (error) throw new Error(error.message)
  return { unlinked: true }
}
