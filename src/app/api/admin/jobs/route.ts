import { NextRequest, NextResponse } from 'next/server'
import { turso, ensureDb } from '@/lib/turso'
import { isAdmin } from '@/lib/api-helpers'

// GET - List all jobs with pagination
export async function GET(request: NextRequest) {
  try {
    await ensureDb()
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    if (!telegramId || !isAdmin(telegramId)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const offset = (page - 1) * limit

    const [jobsResult, countResult] = await turso.batch([
      { sql: 'SELECT * FROM jobs ORDER BY created_at DESC LIMIT ? OFFSET ?', args: [limit, offset] },
      { sql: 'SELECT COUNT(*) as total FROM jobs', args: [] },
    ])

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
      source_id: row.source_id,
      job_type: row.job_type,
      tags: row.tags,
      is_remote: Number(row.is_remote),
      priority: Number(row.priority),
      posted_at: row.posted_at,
      created_at: row.created_at,
    }))

    const total = Number(countResult.rows[0]?.total ?? 0)

    return NextResponse.json({
      jobs,
      total,
      page,
      hasMore: page * limit < total,
    })
  } catch (error) {
    console.error('Error in GET /api/admin/jobs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a job by ID
export async function DELETE(request: NextRequest) {
  try {
    await ensureDb()
    const body = await request.json()
    const { telegramId, jobId } = body

    if (!telegramId || !isAdmin(telegramId)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      )
    }

    // Delete saved_jobs references first
    await turso.execute({
      sql: 'DELETE FROM saved_jobs WHERE job_id = ?',
      args: [jobId],
    })

    // Delete the job
    const result = await turso.execute({
      sql: 'DELETE FROM jobs WHERE id = ?',
      args: [jobId],
    })

    if ((result as { rowsAffected?: number }).rowsAffected === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/jobs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
