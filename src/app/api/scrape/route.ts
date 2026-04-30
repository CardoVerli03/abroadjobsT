import { NextRequest, NextResponse } from 'next/server'
import { turso, ensureDb } from '@/lib/turso'
import { generateId } from '@/lib/api-helpers'

interface ScrapeJob {
  title: string
  company: string
  location?: string
  country?: string
  salary_min?: string
  salary_max?: string
  salary_currency?: string
  description?: string
  url: string
  source: string
  source_id?: string
  job_type?: string
  tags?: string
  is_remote?: number
  priority?: number
  posted_at?: string
}

export async function POST(request: NextRequest) {
  try {
    await ensureDb()
    const body = await request.json()
    const { engine, jobs, secret } = body as {
      engine?: string
      jobs?: ScrapeJob[]
      secret?: string
    }

    if (!secret || secret !== process.env.SCRAPE_SECRET) {
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 403 }
      )
    }

    if (!engine) {
      return NextResponse.json(
        { error: 'engine is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json(
        { error: 'jobs must be a non-empty array' },
        { status: 400 }
      )
    }

    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (const job of jobs) {
      try {
        // Validate required fields
        if (!job.title || !job.company || !job.url || !job.source) {
          errors.push(`Missing required fields for job: ${job.title || 'unknown'}`)
          continue
        }

        const jobId = generateId()
        const result = await turso.execute({
          sql: `INSERT OR IGNORE INTO jobs
            (id, title, company, location, country, salary_min, salary_max, salary_currency, description, url, source, source_id, job_type, tags, is_remote, priority, posted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            jobId,
            job.title,
            job.company,
            job.location || null,
            job.country || null,
            job.salary_min || null,
            job.salary_max || null,
            job.salary_currency || 'USD',
            job.description || null,
            job.url,
            job.source,
            job.source_id || null,
            job.job_type || null,
            job.tags || null,
            job.is_remote ?? 0,
            job.priority ?? 0,
            job.posted_at || null,
          ],
        })

        if ((result as { rowsAffected?: number }).rowsAffected === 0) {
          // Duplicate - skipped due to INSERT OR IGNORE
          skipped++
        } else {
          inserted++
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Error inserting "${job.title}": ${errorMsg}`)
      }
    }

    // Log scrape run
    const logId = generateId()
    await turso.execute({
      sql: 'INSERT INTO scrape_logs (id, engine, jobs_fetched, jobs_inserted, status, error) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        logId,
        engine,
        jobs.length,
        inserted,
        errors.length > 0 ? 'partial' : 'success',
        errors.length > 0 ? errors.join('; ') : null,
      ],
    })

    return NextResponse.json({ inserted, skipped, errors })
  } catch (error) {
    // Log the error
    const logId = generateId()
    try {
      await turso.execute({
        sql: 'INSERT INTO scrape_logs (id, engine, jobs_fetched, jobs_inserted, status, error) VALUES (?, ?, ?, ?, ?, ?)',
        args: [logId, 'unknown', 0, 0, 'error', error instanceof Error ? error.message : 'Unknown error'],
      })
    } catch {
      // Ignore logging errors
    }

    console.error('Error in /api/scrape:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
