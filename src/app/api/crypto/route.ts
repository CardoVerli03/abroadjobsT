import { NextRequest, NextResponse } from 'next/server'
import { turso, ensureDb } from '@/lib/turso'
import { generateId } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  try {
    await ensureDb()
    const body = await request.json()
    const { telegramId, txid, amount } = body

    if (!telegramId || !txid) {
      return NextResponse.json(
        { error: 'telegramId and txid are required' },
        { status: 400 }
      )
    }

    const paymentId = generateId()
    await turso.execute({
      sql: 'INSERT INTO crypto_payments (id, user_telegram_id, txid, amount, status) VALUES (?, ?, ?, ?, ?)',
      args: [paymentId, telegramId, txid, amount || null, 'pending'],
    })

    return NextResponse.json({
      success: true,
      paymentId,
    })
  } catch (error) {
    console.error('Error in /api/crypto:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
