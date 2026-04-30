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

    const [totalUsersResult, premiumUsersResult, totalJobsResult, todayJobsResult, pendingPaymentsResult] = await turso.batch([
      { sql: 'SELECT COUNT(*) as count FROM users', args: [] },
      { sql: "SELECT COUNT(*) as count FROM users WHERE plan_type != 'free' AND plan_expires_at > datetime('now')", args: [] },
      { sql: 'SELECT COUNT(*) as count FROM jobs', args: [] },
      { sql: "SELECT COUNT(*) as count FROM jobs WHERE date(created_at) = date('now')", args: [] },
      { sql: "SELECT COUNT(*) as count FROM crypto_payments WHERE status = 'pending'", args: [] },
    ])

    return NextResponse.json({
      totalUsers: Number(totalUsersResult.rows[0]?.count ?? 0),
      premiumUsers: Number(premiumUsersResult.rows[0]?.count ?? 0),
      totalJobs: Number(totalJobsResult.rows[0]?.count ?? 0),
      todayJobs: Number(todayJobsResult.rows[0]?.count ?? 0),
      pendingPayments: Number(pendingPaymentsResult.rows[0]?.count ?? 0),
    })
  } catch (error) {
    console.error('Error in /api/admin/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
