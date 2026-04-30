import { NextRequest, NextResponse } from 'next/server'
import { turso, ensureDb } from '@/lib/turso'
import { generateId } from '@/lib/api-helpers'

// GET - GG Agency postback verification
export async function GET(request: NextRequest) {
  try {
    await ensureDb()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const status = searchParams.get('status')
    const profit = searchParams.get('profit')

    // Log the postback
    const logId = generateId()
    await turso.execute({
      sql: 'INSERT INTO postback_logs (id, user_id, status, profit, raw_data, processed) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        logId,
        userId || '',
        status || '',
        profit || '',
        JSON.stringify({ method: 'GET', user_id: userId, status, profit }),
        0,
      ],
    })

    // Process if status is subs or redeem
    if ((status === 'subs' || status === 'redeem') && userId) {
      // Check if already processed (prevent double-granting)
      const existingPostback = await turso.execute({
        sql: 'SELECT id FROM postback_logs WHERE user_id = ? AND status = ? AND profit = ? AND processed = 1',
        args: [userId, status, profit || ''],
      })

      if (existingPostback.rows.length === 0) {
        // Find user by telegram_id
        const userResult = await turso.execute({
          sql: 'SELECT telegram_id FROM users WHERE telegram_id = ?',
          args: [userId],
        })

        if (userResult.rows.length > 0) {
          // Grant 7 days premium
          await turso.execute({
            sql: `UPDATE users SET plan_type = 'cpa', plan_expires_at = datetime('now', '+7 days'), updated_at = datetime('now') WHERE telegram_id = ?`,
            args: [userId],
          })

          // Mark postback as processed
          await turso.execute({
            sql: 'UPDATE postback_logs SET processed = 1 WHERE id = ?',
            args: [logId],
          })
        }
      }
    }

    // GG requires 200 OK always
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error in GET /api/webhook/gg:', error)
    // GG requires 200 OK always
    return NextResponse.json({ ok: true })
  }
}

// POST - GG Agency postback
export async function POST(request: NextRequest) {
  try {
    await ensureDb()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const status = searchParams.get('status')
    const profit = searchParams.get('profit')

    // Also try to get from body
    let bodyData: Record<string, string> = {}
    try {
      bodyData = await request.json()
    } catch {
      // Body might be empty or not JSON
    }

    const effectiveUserId = userId || bodyData.user_id
    const effectiveStatus = status || bodyData.status
    const effectiveProfit = profit || bodyData.profit

    // Log the postback
    const logId = generateId()
    await turso.execute({
      sql: 'INSERT INTO postback_logs (id, user_id, status, profit, raw_data, processed) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        logId,
        effectiveUserId || '',
        effectiveStatus || '',
        effectiveProfit || '',
        JSON.stringify({
          method: 'POST',
          user_id: effectiveUserId,
          status: effectiveStatus,
          profit: effectiveProfit,
          body: bodyData,
        }),
        0,
      ],
    })

    // Process if status is subs or redeem
    if ((effectiveStatus === 'subs' || effectiveStatus === 'redeem') && effectiveUserId) {
      // Check if already processed (prevent double-granting)
      const existingPostback = await turso.execute({
        sql: 'SELECT id FROM postback_logs WHERE user_id = ? AND status = ? AND profit = ? AND processed = 1',
        args: [effectiveUserId, effectiveStatus, effectiveProfit || ''],
      })

      if (existingPostback.rows.length === 0) {
        // Find user by telegram_id
        const userResult = await turso.execute({
          sql: 'SELECT telegram_id FROM users WHERE telegram_id = ?',
          args: [effectiveUserId],
        })

        if (userResult.rows.length > 0) {
          // Grant 7 days premium
          await turso.execute({
            sql: `UPDATE users SET plan_type = 'cpa', plan_expires_at = datetime('now', '+7 days'), updated_at = datetime('now') WHERE telegram_id = ?`,
            args: [effectiveUserId],
          })

          // Mark postback as processed
          await turso.execute({
            sql: 'UPDATE postback_logs SET processed = 1 WHERE id = ?',
            args: [logId],
          })
        }
      }
    }

    // GG requires 200 OK always
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error in POST /api/webhook/gg:', error)
    // GG requires 200 OK always
    return NextResponse.json({ ok: true })
  }
}
