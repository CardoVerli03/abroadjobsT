import { NextRequest, NextResponse } from 'next/server'
import { turso, ensureDb } from '@/lib/turso'
import { isAdmin } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    await ensureDb()
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    if (!telegramId || !isAdmin(telegramId)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const offset = (page - 1) * limit

    const [usersResult, countResult] = await turso.batch([
      { sql: 'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?', args: [limit, offset] },
      { sql: 'SELECT COUNT(*) as total FROM users', args: [] },
    ])

    const users = usersResult.rows.map(row => ({
      telegram_id: row.telegram_id,
      plan_type: row.plan_type,
      plan_expires_at: row.plan_expires_at,
      daily_views_used: Number(row.daily_views_used),
      last_view_reset: row.last_view_reset,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))

    const total = Number(countResult.rows[0]?.total ?? 0)

    return NextResponse.json({
      users,
      total,
      page,
      hasMore: page * limit < total,
    })
  } catch (error) {
    console.error('Error in /api/admin/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
