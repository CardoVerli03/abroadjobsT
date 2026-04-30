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

    // Check payment exists
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

    // Update payment status
    await turso.execute({
      sql: "UPDATE crypto_payments SET status = 'rejected' WHERE id = ?",
      args: [paymentId],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in /api/admin/payments/reject:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
