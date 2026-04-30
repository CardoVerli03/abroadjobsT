import { createClient, type Client } from '@libsql/client'

const globalForTurso = globalThis as unknown as {
  turso: Client | undefined
}

export const turso = globalForTurso.turso ?? createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!,
})

if (process.env.NODE_ENV !== 'production') globalForTurso.turso = turso

// Track initialization state
const globalForInit = globalThis as unknown as {
  tursoInitialized: boolean | undefined
}

let initPromise: Promise<void> | null = null

// Initialize database schema (idempotent, safe to call multiple times)
export async function initDatabase() {
  if (globalForInit.tursoInitialized) return

  if (!initPromise) {
    initPromise = (async () => {
      await turso.execute(`
        CREATE TABLE IF NOT EXISTS users (
          telegram_id TEXT PRIMARY KEY,
          plan_type TEXT DEFAULT 'free',
          plan_expires_at TEXT,
          daily_views_used INTEGER DEFAULT 0,
          last_view_reset TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `)

      await turso.execute(`
        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          company TEXT NOT NULL,
          location TEXT,
          country TEXT,
          salary_min TEXT,
          salary_max TEXT,
          salary_currency TEXT DEFAULT 'USD',
          description TEXT,
          url TEXT NOT NULL,
          source TEXT NOT NULL,
          source_id TEXT,
          job_type TEXT,
          tags TEXT,
          is_remote INTEGER DEFAULT 0,
          priority INTEGER DEFAULT 0,
          posted_at TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `)

      await turso.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_unique ON jobs(title, company, location)
      `)

      await turso.execute(`
        CREATE TABLE IF NOT EXISTS saved_jobs (
          id TEXT PRIMARY KEY,
          user_telegram_id TEXT NOT NULL,
          job_id TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          UNIQUE(user_telegram_id, job_id)
        )
      `)

      await turso.execute(`
        CREATE TABLE IF NOT EXISTS postback_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          status TEXT NOT NULL,
          profit TEXT,
          raw_data TEXT,
          processed INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `)

      await turso.execute(`
        CREATE TABLE IF NOT EXISTS crypto_payments (
          id TEXT PRIMARY KEY,
          user_telegram_id TEXT NOT NULL,
          txid TEXT NOT NULL,
          amount TEXT,
          status TEXT DEFAULT 'pending',
          approved_at TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `)

      await turso.execute(`
        CREATE TABLE IF NOT EXISTS scrape_logs (
          id TEXT PRIMARY KEY,
          engine TEXT NOT NULL,
          jobs_fetched INTEGER DEFAULT 0,
          jobs_inserted INTEGER DEFAULT 0,
          status TEXT,
          error TEXT,
          ran_at TEXT DEFAULT (datetime('now'))
        )
      `)

      await turso.execute(`
        CREATE TABLE IF NOT EXISTS keyword_suggestions (
          id TEXT PRIMARY KEY,
          user_telegram_id TEXT NOT NULL,
          keyword TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `)

      globalForInit.tursoInitialized = true
    })()
  }

  await initPromise
}

// Ensure database is initialized before any operation
export async function ensureDb() {
  await initDatabase()
}

// Auto-initialize on first import in development
if (process.env.NODE_ENV !== 'production') {
  initDatabase().catch(console.error)
}
