import { NextRequest, NextResponse } from 'next/server'
import { turso, ensureDb } from '@/lib/turso'
import { generateId } from '@/lib/api-helpers'

// GET - Get all saved jobs for a user
export async function GET(request: NextRequest) {
  try {
    await ensureDb()
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')

    if (!telegramId) {
      return NextResponse.json(
        { error: 'telegramId is required' },
        { status: 400 }
      )
    }

    const result = await turso.execute({
      sql: `
        SELECT j.*, sj.id as saved_id, sj.created_at as saved_at
        FROM saved_jobs sj
        JOIN jobs j ON sj.job_id = j.id
        WHERE sj.user_telegram_id = ?
        ORDER BY sj.created_at DESC
      `,
      args: [telegramId],
    })

    const savedJobs = result.rows.map(row => ({
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
      saved_id: row.saved_id,
      saved_at: row.saved_at,
    }))

    return NextResponse.json({ savedJobs })
  } catch (error) {
    console.error('Error in GET /api/saved:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Save a job
export async function POST(request: NextRequest) {
  try {
    await ensureDb()
    const body = await request.json()
    const { telegramId, jobId } = body

    if (!telegramId || !jobId) {
      return NextResponse.json(
        { error: 'telegramId and jobId are required' },
        { status: 400 }
      )
    }

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

    // Check if already saved
    const existingCheck = await turso.execute({
      sql: 'SELECT id FROM saved_jobs WHERE user_telegram_id = ? AND job_id = ?',
      args: [telegramId, jobId],
    })

    if (existingCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'Job already saved' },
        { status: 409 }
      )
    }

    // Save the job
    const savedId = generateId()
    await turso.execute({
      sql: 'INSERT INTO saved_jobs (id, user_telegram_id, job_id) VALUES (?, ?, ?)',
      args: [savedId, telegramId, jobId],
    })

    return NextResponse.json({ success: true, savedId })
  } catch (error) {
    console.error('Error in POST /api/saved:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a saved job
export async function DELETE(request: NextRequest) {
  try {
    await ensureDb()
    const body = await request.json()
    const { telegramId, jobId } = body

    if (!telegramId || !jobId) {
      return NextResponse.json(
        { error: 'telegramId and jobId are required' },
        { status: 400 }
      )
    }

    const result = await turso.execute({
      sql: 'DELETE FROM saved_jobs WHERE user_telegram_id = ? AND job_id = ?',
      args: [telegramId, jobId],
    })

    if ((result as { rowsAffected?: number }).rowsAffected === 0) {
      return NextResponse.json(
        { error: 'Saved job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/saved:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
