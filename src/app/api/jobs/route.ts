import { NextRequest, NextResponse } from 'next/server'
import { turso, ensureDb } from '@/lib/turso'
import { getOrCreateUser, isPremium, getDailyViewLimit } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    await ensureDb()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'abroad'
    const search = searchParams.get('search')
    const filters = searchParams.get('filters')
    const country = searchParams.get('country')
    const jobType = searchParams.get('jobType')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const telegramId = searchParams.get('telegramId')

    if (!telegramId) {
      return NextResponse.json(
        { error: 'telegramId is required' },
        { status: 400 }
      )
    }

    // Get user and check premium status
    const user = await getOrCreateUser(telegramId)
    const premium = isPremium(user)

    // Free user daily view check
    if (!premium) {
      const dailyLimit = getDailyViewLimit(user.plan_type)
      if (user.daily_views_used >= dailyLimit) {
        return NextResponse.json(
          {
            error: 'Daily view limit reached',
            userDailyViews: {
              used: user.daily_views_used,
              limit: dailyLimit,
            },
          },
          { status: 403 }
        )
      }
    }

    // Build query conditions
    const conditions: string[] = []
    const args: (string | number)[] = []

    // Type filter: abroad (is_remote=0) or remote (is_remote=1)
    if (type === 'remote') {
      conditions.push('is_remote = ?')
      args.push(1)
    } else {
      conditions.push('is_remote = ?')
      args.push(0)
    }

    // Search filter
    if (search) {
      conditions.push('(title LIKE ? OR company LIKE ? OR location LIKE ? OR description LIKE ?)')
      const searchPattern = `%${search}%`
      args.push(searchPattern, searchPattern, searchPattern, searchPattern)
    }

    // Tags filter (comma-separated, use LIKE on JSON string)
    if (filters) {
      const filterList = filters.split(',').map(f => f.trim()).filter(Boolean)
      if (filterList.length > 0) {
        const tagConditions = filterList.map(() => 'tags LIKE ?')
        conditions.push(`(${tagConditions.join(' OR ')})`)
        filterList.forEach(f => {
          args.push(`%"${f}"%`)
        })
      }
    }

    // Country filter
    if (country) {
      conditions.push('country = ?')
      args.push(country)
    }

    // Job type filter
    if (jobType) {
      conditions.push('job_type = ?')
      args.push(jobType)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count
    const countResult = await turso.execute({
      sql: `SELECT COUNT(*) as total FROM jobs ${whereClause}`,
      args,
    })
    const total = Number(countResult.rows[0]?.total ?? 0)

    // Get paginated jobs
    const offset = (page - 1) * limit
    const jobsResult = await turso.execute({
      sql: `SELECT * FROM jobs ${whereClause} ORDER BY priority DESC, posted_at DESC LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    })

    const jobs = jobsResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location,
      country: row.country,
      salary_min: row.salary_min,
      salary_max: row.salary_max,
      salary_currency: row.salary_currency,
      description: row.description,
      url: row.url,
      source: row.source,
      job_type: row.job_type,
      tags: row.tags,
      is_remote: Number(row.is_remote),
      posted_at: row.posted_at,
    }))

    return NextResponse.json({
      jobs,
      total,
      page,
      hasMore: page * limit < total,
      userDailyViews: {
        used: user.daily_views_used,
        limit: premium ? 999 : getDailyViewLimit(user.plan_type),
      },
    })
  } catch (error) {
    console.error('Error in /api/jobs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
