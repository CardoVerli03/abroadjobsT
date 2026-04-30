#!/usr/bin/env node
/**
 * Adzuna Job Scraper for Abroad JobsT
 * 
 * Scrapes jobs from Adzuna API across multiple countries with
 * visa sponsorship / relocation / work permit keywords.
 * 
 * API docs: https://developer.adzuna.com/
 * 
 * Runs on GitHub Actions every 6 hours.
 */

const {
  mapCountry, detectTags, isRemoteJob, generateUUID,
  isWithinLastNDays, toISODate, normalizeJobType,
  sendToVercel, sleep, truncate, parseSalary,
} = require('./lib/common');

// ─── Configuration ──────────────────────────────────────────────────

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY;
const ENGINE = 'adzuna';

const COUNTRIES = ['gb', 'de', 'nl', 'ae', 'us', 'au', 'qa'];

const SEARCH_KEYWORDS = [
  'visa sponsorship',
  'relocation package',
  'accommodation provided',
  'LMIA',
  'work permit',
  'skilled worker visa',
];

const RESULTS_PER_PAGE = 50;
const MAX_PAGES = 3; // Max pages per keyword per country

// Currency mapping by Adzuna country code
const CURRENCY_MAP = {
  gb: 'GBP', de: 'EUR', nl: 'EUR', ae: 'AED',
  us: 'USD', au: 'AUD', qa: 'QAR',
};

// ─── Main Scraper ───────────────────────────────────────────────────

async function fetchAdzunaJobs(country, keyword, page) {
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`;
  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_API_KEY,
    results_per_page: String(RESULTS_PER_PAGE),
    what: keyword,
    'content-type': 'application/json',
    sort_by: 'date',
  });

  const fullUrl = `${url}?${params.toString()}`;
  console.log(`[adzuna] Fetching: country=${country}, keyword="${keyword}", page=${page}`);

  const response = await fetch(fullUrl);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 300)}`);
  }

  return response.json();
}

function mapAdzunaJob(raw, country) {
  const title = raw.title || 'Untitled';
  const company = raw.company?.display_name || 'Unknown Company';
  const location = raw.location?.display_name || '';
  const description = raw.description || '';
  const tags = detectTags(title, description);
  const isRemote = isRemoteJob(title, description, tags) ? 1 : 0;
  const countryCode = mapCountry(country);
  const currency = CURRENCY_MAP[country] || 'USD';

  // Salary handling — Adzuna provides salary_min, salary_max
  const salaryMin = raw.salary_min ? String(Math.round(raw.salary_min)) : '';
  const salaryMax = raw.salary_max ? String(Math.round(raw.salary_max)) : '';

  // Job type mapping
  let jobType = 'full_time';
  if (raw.contract_time === 'part_time') jobType = 'part_time';
  else if (raw.contract_type === 'contract') jobType = 'contract';
  jobType = normalizeJobType(raw.contract_time || raw.contract_type || jobType);

  // Posted date
  const postedAt = raw.created ? toISODate(raw.created) : new Date().toISOString();

  return {
    id: generateUUID(),
    title,
    company,
    location,
    country: countryCode,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_currency: currency,
    description: truncate(description, 5000),
    url: raw.redirect_url || '',
    source: ENGINE,
    source_id: raw.id ? String(raw.id) : generateUUID(),
    job_type: jobType,
    tags,
    is_remote: isRemote,
    priority: 0,
    posted_at: postedAt,
  };
}

async function run() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[adzuna] Scraper started at ${new Date().toISOString()}`);
  console.log(`[adzuna] Countries: ${COUNTRIES.join(', ')}`);
  console.log(`[adzuna] Keywords: ${SEARCH_KEYWORDS.join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);

  if (!ADZUNA_APP_ID || !ADZUNA_API_KEY) {
    console.error('[adzuna] ERROR: ADZUNA_APP_ID and ADZUNA_API_KEY must be set');
    process.exit(1);
  }

  const allJobs = [];
  let totalFetched = 0;
  let totalErrors = 0;

  for (const country of COUNTRIES) {
    for (const keyword of SEARCH_KEYWORDS) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        try {
          const data = await fetchAdzunaJobs(country, keyword, page);
          const results = data.results || [];

          if (results.length === 0) {
            console.log(`[adzuna] No results for country=${country}, keyword="${keyword}", page=${page}. Stopping pagination.`);
            break;
          }

          const mapped = results
            .filter((job) => isWithinLastNDays(job.created, 14))
            .map((job) => mapAdzunaJob(job, country));

          allJobs.push(...mapped);
          totalFetched += mapped.length;
          console.log(`[adzuna] Got ${mapped.length} jobs (filtered to 2 weeks) from country=${country}, keyword="${keyword}", page=${page}`);

          // Check if more pages exist
          const totalCount = data.count || 0;
          if (page * RESULTS_PER_PAGE >= totalCount) {
            break;
          }

          // Rate limiting — 200ms between requests
          await sleep(200);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[adzuna] Error fetching country=${country}, keyword="${keyword}", page=${page}: ${msg}`);
          totalErrors++;
          // Continue with next request
          await sleep(1000);
        }
      }

      // Delay between keywords
      await sleep(300);
    }

    // Delay between countries
    await sleep(500);
  }

  console.log(`\n[adzuna] Total fetched (within 2 weeks): ${totalFetched}`);
  console.log(`[adzuna] Total errors: ${totalErrors}`);

  // Deduplicate by source_id before sending
  const seen = new Set();
  const uniqueJobs = allJobs.filter((job) => {
    const key = job.source_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[adzuna] After dedup: ${uniqueJobs.length} unique jobs`);

  // Send to Vercel
  const result = await sendToVercel(ENGINE, uniqueJobs);
  console.log(`\n[adzuna] Scraper completed!`);
  console.log(`[adzuna] Fetched: ${totalFetched}, Unique: ${uniqueJobs.length}, Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
}

// Run
run().catch((err) => {
  console.error('[adzuna] Fatal error:', err);
  process.exit(1);
});
