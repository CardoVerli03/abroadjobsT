#!/usr/bin/env node
/**
 * Remotive Job Scraper for Abroad JobsT
 * 
 * Scrapes remote jobs from Remotive API.
 * All jobs from Remotive are remote (is_remote=1).
 * Must include attribution per their TOS.
 * 
 * API docs: https://remotive.com/api/remote-jobs
 * No auth needed. Max 4 requests per day (respect rate limit).
 * 
 * Runs on GitHub Actions every 6 hours.
 */

const {
  mapCountry, detectTags, isRemoteJob, generateUUID,
  isWithinLastNDays, toISODate, normalizeJobType,
  sendToVercel, sleep, truncate, parseSalary,
} = require('./lib/common');

// ─── Configuration ──────────────────────────────────────────────────

const ENGINE = 'remotive';
const BASE_URL = 'https://remotive.com/api/remote-jobs';
const LIMIT = 50;

// Search keywords for visa/relocation relevant remote jobs
const SEARCH_KEYWORDS = [
  'visa sponsorship',
  'relocation',
  'work permit',
  'international',
];

// Categories that often have abroad/visa-friendly jobs
const CATEGORIES = [
  'software-dev',
  'design',
  'product',
  'customer-support',
  'finance-legal',
  'sales',
  'marketing',
];

// Rate limit: max 4 requests per day
// We'll make at most 4 requests (1 per keyword), or 4 categories
const MAX_REQUESTS = 4;

// ─── Main Scraper ───────────────────────────────────────────────────

async function fetchRemotiveJobs(params) {
  const urlParams = new URLSearchParams({
    limit: String(LIMIT),
    ...params,
  });

  const url = `${BASE_URL}?${urlParams.toString()}`;
  console.log(`[remotive] Fetching: ${url.replace(BASE_URL, '...')}`);

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 300)}`);
  }

  return response.json();
}

function mapRemotiveJob(raw) {
  const title = raw.title || 'Untitled';
  const company = raw.company_name || 'Unknown Company';
  const location = raw.candidate_required_location || 'Remote';
  const description = raw.description || '';

  // Remotive attribution — required by their TOS
  const attribution = `\n\n---\nVia [Remotive](${raw.url || 'https://remotive.com'})`;
  const fullDescription = description + attribution;

  const tags = detectTags(title, description);
  // All Remotive jobs are remote
  const isRemote = 1;

  // Remotive doesn't provide salary data typically
  const salaryMin = raw.salary ? parseSalary(raw.salary) : '';
  const salaryMax = '';
  const currency = 'USD';

  // Try to detect country from candidate_required_location
  const country = mapCountry(raw.candidate_required_location || '');

  // Job type
  let jobType = 'remote';
  if (raw.job_type) {
    const jt = String(raw.job_type).toLowerCase();
    if (jt.includes('full')) jobType = 'full_time';
    else if (jt.includes('part')) jobType = 'part_time';
    else if (jt.includes('contract')) jobType = 'contract';
    else jobType = 'remote';
  }
  jobType = normalizeJobType(jobType);

  const postedAt = raw.publication_date ? toISODate(raw.publication_date) : new Date().toISOString();

  return {
    id: generateUUID(),
    title,
    company,
    location,
    country: country || 'REMOTE',
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_currency: currency,
    description: truncate(fullDescription, 5000),
    url: raw.url || '',
    source: ENGINE,
    source_id: raw.id ? String(raw.id) : generateUUID(),
    job_type: jobType,
    tags,
    is_remote: isRemote,
    priority: 0,
    posted_at: postedAt,
  };
}

function isRelevantRemotiveJob(job) {
  // For Remotive, we accept all remote jobs but prioritize those with
  // visa/relocation mentions
  const text = `${job.title || ''} ${job.description || ''}`.toLowerCase();

  // Always include jobs that mention visa/relocation/accommodation
  if (/visa\s+sponsor|relocat|accommodation|lmia|work\s+permit/i.test(text)) {
    return true;
  }

  // Include jobs from tags
  const jobTags = (job.tags || []).map((t) => String(t).toLowerCase());
  if (jobTags.some((t) => /visa|relocat|sponsor/i.test(t))) {
    return true;
  }

  // For category-based fetches, include all (they're already filtered by category)
  return false;
}

async function run() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[remotive] Scraper started at ${new Date().toISOString()}`);
  console.log(`[remotive] Rate limit: max ${MAX_REQUESTS} requests`);
  console.log(`${'='.repeat(60)}\n`);

  const allJobs = [];
  let totalFetched = 0;
  let totalErrors = 0;
  let requestCount = 0;

  // Strategy: Use search keywords first (up to MAX_REQUESTS)
  for (const keyword of SEARCH_KEYWORDS) {
    if (requestCount >= MAX_REQUESTS) {
      console.log(`[remotive] Reached max ${MAX_REQUESTS} requests. Stopping.`);
      break;
    }

    try {
      const data = await fetchRemotiveJobs({ search: keyword });
      requestCount++;

      const results = data.jobs || [];

      if (results.length === 0) {
        console.log(`[remotive] No results for keyword="${keyword}"`);
        continue;
      }

      const mapped = results
        .filter((job) => isWithinLastNDays(job.publication_date, 14))
        .filter(isRelevantRemotiveJob)
        .map((job) => mapRemotiveJob(job));

      allJobs.push(...mapped);
      totalFetched += mapped.length;
      console.log(`[remotive] Got ${mapped.length} relevant jobs for keyword="${keyword}" (from ${results.length} total)`);

      await sleep(500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[remotive] Error for keyword="${keyword}": ${msg}`);
      totalErrors++;
      await sleep(1000);
    }
  }

  // If we have requests left, try category-based fetches
  if (requestCount < MAX_REQUESTS) {
    for (const category of CATEGORIES) {
      if (requestCount >= MAX_REQUESTS) break;

      try {
        const data = await fetchRemotiveJobs({ category });
        requestCount++;

        const results = data.jobs || [];
        if (results.length === 0) continue;

        // For category fetches, only include jobs with visa/relocation mentions
        const mapped = results
          .filter((job) => isWithinLastNDays(job.publication_date, 14))
          .filter(isRelevantRemotiveJob)
          .map((job) => mapRemotiveJob(job));

        allJobs.push(...mapped);
        totalFetched += mapped.length;
        console.log(`[remotive] Got ${mapped.length} relevant jobs for category="${category}"`);

        await sleep(500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[remotive] Error for category="${category}": ${msg}`);
        totalErrors++;
      }
    }
  }

  console.log(`\n[remotive] Total relevant (within 2 weeks): ${totalFetched}`);
  console.log(`[remotive] API requests made: ${requestCount}/${MAX_REQUESTS}`);
  console.log(`[remotive] Total errors: ${totalErrors}`);

  // Deduplicate by source_id
  const seen = new Set();
  const uniqueJobs = allJobs.filter((job) => {
    const key = job.source_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[remotive] After dedup: ${uniqueJobs.length} unique jobs`);

  // Send to Vercel
  const result = await sendToVercel(ENGINE, uniqueJobs);
  console.log(`\n[remotive] Scraper completed!`);
  console.log(`[remotive] Fetched: ${totalFetched}, Unique: ${uniqueJobs.length}, Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
}

// Run
run().catch((err) => {
  console.error('[remotive] Fatal error:', err);
  process.exit(1);
});
