import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUser, isPremium } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')

    if (!telegramId) {
      return NextResponse.json(
        { error: 'telegramId is required' },
        { status: 400 }
      )
    }

    const user = await getOrCreateUser(telegramId)
    const premium = isPremium(user)

    return NextResponse.json({
      user: {
        telegram_id: user.telegram_id,
        plan_type: premium ? user.plan_type : 'free',
        plan_expires_at: user.plan_expires_at,
        daily_views_used: user.daily_views_used,
        last_view_reset: user.last_view_reset,
        is_premium: premium,
        created_at: user.created_at,
      },
    })
  } catch (error) {
    console.error('Error in /api/user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
