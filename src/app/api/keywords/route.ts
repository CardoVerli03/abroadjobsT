import { NextRequest, NextResponse } from 'next/server'
import { turso, ensureDb } from '@/lib/turso'
import { generateId, isAdmin } from '@/lib/api-helpers'

// POST - Submit a keyword suggestion
export async function POST(request: NextRequest) {
  try {
    await ensureDb()
    const body = await request.json()
    const { telegramId, keyword } = body

    if (!telegramId || !keyword) {
      return NextResponse.json(
        { error: 'telegramId and keyword are required' },
        { status: 400 }
      )
    }

    if (typeof keyword !== 'string' || keyword.trim().length === 0) {
      return NextResponse.json(
        { error: 'keyword must be a non-empty string' },
        { status: 400 }
      )
    }

    if (keyword.length > 200) {
      return NextResponse.json(
        { error: 'keyword must be 200 characters or less' },
        { status: 400 }
      )
    }

    const suggestionId = generateId()
    await turso.execute({
      sql: 'INSERT INTO keyword_suggestions (id, user_telegram_id, keyword) VALUES (?, ?, ?)',
      args: [suggestionId, telegramId, keyword.trim()],
    })

    return NextResponse.json({ success: true, suggestionId })
  } catch (error) {
    console.error('Error in /api/keywords:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - List keyword suggestions (admin only)
export async function GET(request: NextRequest) {
  try {
    await ensureDb()
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')
    const isAdminRequest = searchParams.get('admin') === 'true'

    if (isAdminRequest && (!telegramId || !isAdmin(telegramId))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const result = await turso.execute({
      sql: 'SELECT * FROM keyword_suggestions ORDER BY created_at DESC',
      args: [],
    })

    const keywords = result.rows.map(row => ({
      id: row.id,
      user_telegram_id: row.user_telegram_id,
      keyword: row.keyword,
      created_at: row.created_at,
    }))

    return NextResponse.json({ keywords })
  } catch (error) {
    console.error('Error in GET /api/keywords:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
