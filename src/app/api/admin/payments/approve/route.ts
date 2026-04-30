import { NextRequest, NextResponse } from 'next/server'
import { turso, ensureDb } from '@/lib/turso'
import { isAdmin } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  try {
    await ensureDb()
    const body = await request.json()
    const { telegramId, paymentId } = body

    if (!telegramId || !isAdmin(telegramId)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (!paymentId) {
      return NextResponse.json(
        { error: 'paymentId is required' },
        { status: 400 }
      )
    }

    // Get the payment
    const paymentResult = await turso.execute({
      sql: 'SELECT * FROM crypto_payments WHERE id = ?',
      args: [paymentId],
    })

    if (paymentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    const payment = paymentResult.rows[0]

    if (payment.status !== 'pending') {
      return NextResponse.json(
        { error: `Payment already ${payment.status}` },
        { status: 400 }
      )
    }

    // Update payment status and grant user 30 days premium
    await turso.batch([
      {
        sql: "UPDATE crypto_payments SET status = 'approved', approved_at = datetime('now') WHERE id = ?",
        args: [paymentId],
      },
      {
        sql: "UPDATE users SET plan_type = 'crypto', plan_expires_at = datetime('now', '+30 days'), updated_at = datetime('now') WHERE telegram_id = ?",
        args: [payment.user_telegram_id],
      },
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in /api/admin/payments/approve:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
