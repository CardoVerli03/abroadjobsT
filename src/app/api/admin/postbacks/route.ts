import { NextRequest, NextResponse } from 'next/server'
import { turso, ensureDb } from '@/lib/turso'
import { isAdmin } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    await ensureDb()
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')

    if (!telegramId || !isAdmin(telegramId)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const result = await turso.execute({
      sql: 'SELECT * FROM postback_logs ORDER BY created_at DESC',
      args: [],
    })

    const postbacks = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      status: row.status,
      profit: row.profit,
      raw_data: row.raw_data,
      processed: Number(row.processed),
      created_at: row.created_at,
    }))

    return NextResponse.json({ postbacks })
  } catch (error) {
    console.error('Error in /api/admin/postbacks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
