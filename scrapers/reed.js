#!/usr/bin/env node
/**
 * Reed Job Scraper for Abroad JobsT
 * 
 * Scrapes jobs from Reed.co.uk API (UK-focused).
 * Uses visa sponsorship / relocation / accommodation keywords.
 * 
 * API docs: https://www.reed.co.uk/developers/v2
 * 
 * Runs on GitHub Actions every 6 hours.
 */

const {
  mapCountry, detectTags, isRemoteJob, generateUUID,
  isWithinLastNDays, toISODate, normalizeJobType,
  sendToVercel, sleep, truncate, parseSalary,
} = require('./lib/common');

// ─── Configuration ──────────────────────────────────────────────────

const REED_API_KEY = process.env.REED_API_KEY;
const ENGINE = 'reed';

const BASE_URL = 'https://www.reed.co.uk/api/1.0/search';

// Reed is UK-focused — search across UK locations
const LOCATIONS = [
  { name: 'London', region: '' },
  { name: 'Manchester', region: '' },
  { name: 'Birmingham', region: '' },
  { name: 'Edinburgh', region: '' },
  { name: 'Leeds', region: '' },
  { name: 'Bristol', region: '' },
  { name: '', region: '' }, // UK-wide (no location filter)
];

const SEARCH_KEYWORDS = [
  'visa sponsorship',
  'relocation',
  'accommodation provided',
  'skilled worker',
];

const RESULTS_PER_REQUEST = 100;

// ─── Main Scraper ───────────────────────────────────────────────────

async function fetchReedJobs(keyword, locationName) {
  const params = new URLSearchParams({
    keywords: keyword,
    resultsToTake: String(RESULTS_PER_REQUEST),
  });

  if (locationName) {
    params.set('locationName', locationName);
  }

  const url = `${BASE_URL}?${params.toString()}`;
  console.log(`[reed] Fetching: keyword="${keyword}", location="${locationName || 'UK-wide'}"`);

  // Reed uses Basic auth with API key as username, empty password
  const authHeader = 'Basic ' + Buffer.from(`${REED_API_KEY}:`).toString('base64');

  const response = await fetch(url, {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 300)}`);
  }

  return response.json();
}

async function fetchReedJobDetail(jobId) {
  const url = `https://www.reed.co.uk/api/1.0/jobs/${jobId}`;
  const authHeader = 'Basic ' + Buffer.from(`${REED_API_KEY}:`).toString('base64');

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

function mapReedJob(raw) {
  const title = raw.jobTitle || 'Untitled';
  const company = raw.employerName || 'Unknown Company';
  const location = raw.locationName || '';
  const description = raw.jobDescription || '';
  const tags = detectTags(title, description);
  const isRemote = isRemoteJob(title, description, tags) ? 1 : 0;

  // Salary handling
  const salaryMin = raw.minimumSalary ? String(Math.round(raw.minimumSalary)) : '';
  const salaryMax = raw.maximumSalary ? String(Math.round(raw.maximumSalary)) : '';

  // Reed salaries are always in GBP
  const currency = 'GBP';

  // Job type — Reed provides this
  let jobType = 'full_time';
  if (raw.contractType === 'Contract') jobType = 'contract';
  else if (raw.contractType === 'Part-time') jobType = 'part_time';
  else if (raw.contractType === 'Temporary') jobType = 'contract';
  jobType = normalizeJobType(jobType);

  const postedAt = raw.datePosted ? toISODate(raw.datePosted) : new Date().toISOString();

  return {
    id: generateUUID(),
    title,
    company,
    location,
    country: 'UK',
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_currency: currency,
    description: truncate(description, 5000),
    url: raw.jobUrl || '',
    source: ENGINE,
    source_id: raw.jobId ? String(raw.jobId) : generateUUID(),
    job_type: jobType,
    tags,
    is_remote: isRemote,
    priority: 0,
    posted_at: postedAt,
  };
}

async function run() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[reed] Scraper started at ${new Date().toISOString()}`);
  console.log(`[reed] Keywords: ${SEARCH_KEYWORDS.join(', ')}`);
  console.log(`[reed] Locations: ${LOCATIONS.map((l) => l.name || 'UK-wide').join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);

  if (!REED_API_KEY) {
    console.error('[reed] ERROR: REED_API_KEY must be set');
    process.exit(1);
  }

  const allJobs = [];
  let totalFetched = 0;
  let totalErrors = 0;

  for (const keyword of SEARCH_KEYWORDS) {
    for (const loc of LOCATIONS) {
      try {
        const data = await fetchReedJobs(keyword, loc.name);
        const results = data.results || [];

        if (results.length === 0) {
          console.log(`[reed] No results for keyword="${keyword}", location="${loc.name || 'UK-wide'}"`);
          await sleep(200);
          continue;
        }

        const mapped = results
          .filter((job) => isWithinLastNDays(job.datePosted, 14))
          .map((job) => mapReedJob(job));

        allJobs.push(...mapped);
        totalFetched += mapped.length;
        console.log(`[reed] Got ${mapped.length} jobs for keyword="${keyword}", location="${loc.name || 'UK-wide'}"`);

        // Rate limiting
        await sleep(300);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[reed] Error fetching keyword="${keyword}", location="${loc.name}": ${msg}`);
        totalErrors++;
        await sleep(1000);
      }
    }

    // Delay between keywords
    await sleep(500);
  }

  console.log(`\n[reed] Total fetched (within 2 weeks): ${totalFetched}`);
  console.log(`[reed] Total errors: ${totalErrors}`);

  // Deduplicate by source_id
  const seen = new Set();
  const uniqueJobs = allJobs.filter((job) => {
    const key = job.source_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[reed] After dedup: ${uniqueJobs.length} unique jobs`);

  // Send to Vercel
  const result = await sendToVercel(ENGINE, uniqueJobs);
  console.log(`\n[reed] Scraper completed!`);
  console.log(`[reed] Fetched: ${totalFetched}, Unique: ${uniqueJobs.length}, Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
}

// Run
run().catch((err) => {
  console.error('[reed] Fatal error:', err);
  process.exit(1);
});
