import { NextRequest, NextResponse } from 'next/server'
import { turso, ensureDb } from '@/lib/turso'
import { isAdmin } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    await ensureDb()
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    if (!telegramId || !isAdmin(telegramId)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const offset = (page - 1) * limit
    let sql = 'SELECT * FROM crypto_payments'
    const args: (string | number)[] = []

    if (status) {
      sql += ' WHERE status = ?'
      args.push(status)
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    args.push(limit, offset)

    const paymentsResult = await turso.execute({ sql, args })

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM crypto_payments'
    const countArgs: string[] = []
    if (status) {
      countSql += ' WHERE status = ?'
      countArgs.push(status)
    }
    const countResult = await turso.execute({ sql: countSql, args: countArgs })

    const payments = paymentsResult.rows.map(row => ({
      id: row.id,
      user_telegram_id: row.user_telegram_id,
      txid: row.txid,
      amount: row.amount,
      status: row.status,
      approved_at: row.approved_at,
      created_at: row.created_at,
    }))

    const total = Number(countResult.rows[0]?.total ?? 0)

    return NextResponse.json({
      payments,
      total,
      page,
      hasMore: page * limit < total,
    })
  } catch (error) {
    console.error('Error in /api/admin/payments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
