import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { getOrCreateUser, isPremium } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, jobId } = body

    if (!telegramId || !jobId) {
      return NextResponse.json(
        { error: 'telegramId and jobId are required' },
        { status: 400 }
      )
    }

    // Get user
    const user = await getOrCreateUser(telegramId)

    // Check if job exists
    const jobCheck = await turso.execute({
      sql: 'SELECT id FROM jobs WHERE id = ?',
      args: [jobId],
    })

    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Increment daily views used
    const premium = isPremium(user)
    if (!premium) {
      await turso.execute({
        sql: 'UPDATE users SET daily_views_used = daily_views_used + 1, updated_at = datetime(\'now\') WHERE telegram_id = ?',
        args: [telegramId],
      })
    }

    // Get updated user data
    const updatedUser = await getOrCreateUser(telegramId)

    return NextResponse.json({
      success: true,
      user: {
        telegram_id: updatedUser.telegram_id,
        plan_type: isPremium(updatedUser) ? updatedUser.plan_type : 'free',
        daily_views_used: updatedUser.daily_views_used,
        is_premium: isPremium(updatedUser),
      },
    })
  } catch (error) {
    console.error('Error in /api/view:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
