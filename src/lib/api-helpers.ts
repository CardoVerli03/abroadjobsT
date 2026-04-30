import { turso, ensureDb } from '@/lib/turso'

const ADMIN_TELEGRAM_ID = '8262090447'

export function isAdmin(telegramId: string | null): boolean {
  return telegramId === ADMIN_TELEGRAM_ID
}

export function isPremium(user: Record<string, unknown>): boolean {
  if (user.plan_type === 'owner') return true
  if (user.plan_type === 'free') return false
  if (!user.plan_expires_at) return false
  return new Date(user.plan_expires_at as string) > new Date()
}

export function getDailyViewLimit(planType: string): number {
  if (planType === 'free') return 2
  return 999
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`
}

export async function getOrCreateUser(telegramId: string): Promise<Record<string, unknown>> {
  await ensureDb()

  // Try to find existing user
  const result = await turso.execute({
    sql: 'SELECT * FROM users WHERE telegram_id = ?',
    args: [telegramId],
  })

  if (result.rows.length > 0) {
    const row = result.rows[0]

    // Reset daily views if it's a new day
    const lastReset = row.last_view_reset as string | null
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const resetDate = lastReset ? new Date(lastReset).toISOString().split('T')[0] : null

    if (resetDate !== today) {
      await turso.execute({
        sql: "UPDATE users SET daily_views_used = 0, last_view_reset = datetime('now'), updated_at = datetime('now') WHERE telegram_id = ?",
        args: [telegramId],
      })
      return {
        ...row,
        daily_views_used: 0,
        last_view_reset: new Date().toISOString(),
      }
    }

    return row as Record<string, unknown>
  }

  // Create new user
  const now = new Date().toISOString()
  await turso.execute({
    sql: 'INSERT INTO users (telegram_id, plan_type, daily_views_used, last_view_reset, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)',
    args: [telegramId, 'free', now, now, now],
  })

  return {
    telegram_id: telegramId,
    plan_type: 'free',
    plan_expires_at: null,
    daily_views_used: 0,
    last_view_reset: now,
    created_at: now,
    updated_at: now,
  }
}
