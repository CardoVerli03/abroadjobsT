import { NextRequest, NextResponse } from 'next/server'
import { turso, ensureDb } from '@/lib/turso'
import { getOrCreateUser, isPremium } from '@/lib/api-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')

    if (!telegramId) {
      return NextResponse.json(
        { error: 'telegramId is required' },
        { status: 400 }
      )
    }

    // Get job
    const jobResult = await turso.execute({
      sql: 'SELECT * FROM jobs WHERE id = ?',
      args: [id],
    })

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const job = jobResult.rows[0]

    // Check if user is premium
    const user = await getOrCreateUser(telegramId)
    const premium = isPremium(user)

    if (premium) {
      // Return all fields for premium users
      return NextResponse.json({
        job: {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          country: job.country,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          salary_currency: job.salary_currency,
          description: job.description,
          url: job.url,
          source: job.source,
          source_id: job.source_id,
          job_type: job.job_type,
          tags: job.tags,
          is_remote: Number(job.is_remote),
          priority: Number(job.priority),
          posted_at: job.posted_at,
          created_at: job.created_at,
        },
      })
    }

    // Free users: limited fields only
    return NextResponse.json({
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        job_type: job.job_type,
        source: job.source,
        posted_at: job.posted_at,
      },
    })
  } catch (error) {
    console.error('Error in /api/jobs/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
