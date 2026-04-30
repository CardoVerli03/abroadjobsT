import { NextRequest, NextResponse } from 'next/server'
import { turso, ensureDb } from '@/lib/turso'
import { isAdmin } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  try {
    await ensureDb()
    const body = await request.json()
    const { telegramId } = body

    if (!telegramId || !isAdmin(telegramId)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete jobs older than 14 days
    // First delete saved_jobs references to those old jobs
    await turso.execute({
      sql: "DELETE FROM saved_jobs WHERE job_id IN (SELECT id FROM jobs WHERE date(COALESCE(posted_at, created_at)) < date('now', '-14 days'))",
      args: [],
    })

    const result = await turso.execute({
      sql: "DELETE FROM jobs WHERE date(COALESCE(posted_at, created_at)) < date('now', '-14 days')",
      args: [],
    })

    const deleted = (result as { rowsAffected?: number }).rowsAffected ?? 0

    return NextResponse.json({ deleted })
  } catch (error) {
    console.error('Error in /api/admin/cleanup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
