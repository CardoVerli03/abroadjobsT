#!/usr/bin/env node
/**
 * Arbeitnow Job Scraper for Abroad JobsT
 * 
 * Scrapes jobs from Arbeitnow API, filtering for visa sponsorship
 * and relocation tagged jobs.
 * 
 * API docs: https://www.arbeitnow.com/api/job-board-api
 * No auth needed.
 * 
 * Runs on GitHub Actions every 6 hours.
 */

const {
  mapCountry, detectTags, isRemoteJob, generateUUID,
  isWithinLastNDays, toISODate, normalizeJobType,
  sendToVercel, sleep, truncate, parseSalary,
} = require('./lib/common');

// ─── Configuration ──────────────────────────────────────────────────

const ENGINE = 'arbeitnow';
const BASE_URL = 'https://www.arbeitnow.com/api/job-board-api';
const PER_PAGE = 50;
const MAX_PAGES = 10; // Browse more pages to find visa/relocation jobs

// Tags we're interested in from Arbeitnow
const TARGET_TAGS = [
  'visa sponsorship', 'visa sponsor',
  'relocation', 'relocation assistance',
  'relocation package', 'accommodation',
];

// ─── Main Scraper ───────────────────────────────────────────────────

async function fetchArbeitnowJobs(page) {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(PER_PAGE),
  });

  const url = `${BASE_URL}?${params.toString()}`;
  console.log(`[arbeitnow] Fetching page ${page}`);

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 300)}`);
  }

  return response.json();
}

function isRelevantJob(job) {
  // Check if the job has relevant tags
  const jobTags = (job.tags || []).map((t) => String(t).toLowerCase());

  // Check direct tag match
  for (const targetTag of TARGET_TAGS) {
    if (jobTags.some((t) => t.includes(targetTag) || targetTag.includes(t))) {
      return true;
    }
  }

  // Check title and description for keywords
  const text = `${job.title || ''} ${job.description || ''}`.toLowerCase();

  if (/visa\s+sponsor|skilled\s+worker\s+visa/i.test(text)) return true;
  if (/relocat/i.test(text)) return true;
  if (/accommodation|housing\s+provided/i.test(text)) return true;
  if (/lmia/i.test(text)) return true;
  if (/work\s+permit/i.test(text)) return true;

  return false;
}

function mapArbeitnowJob(raw) {
  const title = raw.title || 'Untitled';
  const company = raw.company_name || 'Unknown Company';
  const location = raw.location || '';
  const description = raw.description || '';

  // Combine our auto-detected tags with Arbeitnow's tags
  const autoTags = JSON.parse(detectTags(title, description));
  const arbeitnowTags = (raw.tags || [])
    .filter((t) => {
      const lower = String(t).toLowerCase();
      // Only include relevant tags that match our system
      if (/visa\s+sponsor/i.test(lower)) return 'Visa Sponsor';
      if (/relocat/i.test(lower)) return 'Relocation';
      if (/accommodation/i.test(lower)) return 'Accommodation';
      if (/remote/i.test(lower)) return 'Remote';
      return false;
    })
    .map((t) => {
      const lower = String(t).toLowerCase();
      if (/visa\s+sponsor/i.test(lower)) return 'Visa Sponsor';
      if (/relocat/i.test(lower)) return 'Relocation';
      if (/accommodation/i.test(lower)) return 'Accommodation';
      if (/remote/i.test(lower)) return 'Remote';
      return null;
    })
    .filter(Boolean);

  // Merge and deduplicate tags
  const mergedTags = [...new Set([...autoTags, ...arbeitnowTags])];
  const tags = JSON.stringify(mergedTags);

  const isRemote = isRemoteJob(title, description, tags) ? 1 : 0;

  // Country from location
  const country = mapCountry(raw.country || '');

  // Salary — Arbeitnow sometimes provides salary_range
  let salaryMin = '';
  let salaryMax = '';
  let currency = 'EUR'; // Arbeitnow is Europe-focused

  if (raw.salary_range) {
    if (typeof raw.salary_range === 'object') {
      salaryMin = raw.salary_range.min ? String(Math.round(raw.salary_range.min)) : '';
      salaryMax = raw.salary_range.max ? String(Math.round(raw.salary_range.max)) : '';
      if (raw.salary_range.currency) currency = raw.salary_range.currency;
    } else {
      const salaryText = String(raw.salary_range);
      const match = salaryText.match(/([\d,.]+)\s*[-–to]+\s*([\d,.]+)/);
      if (match) {
        salaryMin = parseSalary(match[1]);
        salaryMax = parseSalary(match[2]);
      }
    }
  }

  // Currency from country
  const countryCurrencyMap = { UK: 'GBP', DE: 'EUR', NL: 'EUR', AE: 'AED', US: 'USD', CA: 'CAD', AU: 'AUD', NO: 'NOK' };
  if (countryCurrencyMap[country]) currency = countryCurrencyMap[country];

  // Job type
  let jobType = 'full_time';
  if (raw.job_type) {
    const jt = String(raw.job_type).toLowerCase();
    if (jt.includes('part')) jobType = 'part_time';
    else if (jt.includes('contract') || jt.includes('temp')) jobType = 'contract';
    else if (jt.includes('remote')) jobType = 'remote';
  }
  jobType = normalizeJobType(jobType);

  const postedAt = raw.created_at ? toISODate(raw.created_at) : new Date().toISOString();

  return {
    id: generateUUID(),
    title,
    company,
    location,
    country,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_currency: currency,
    description: truncate(description, 5000),
    url: raw.url || raw.slug ? `https://www.arbeitnow.com/view/${raw.slug}` : '',
    source: ENGINE,
    source_id: raw.slug || raw.id?.toString() || generateUUID(),
    job_type: jobType,
    tags,
    is_remote: isRemote,
    priority: 0,
    posted_at: postedAt,
  };
}

async function run() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[arbeitnow] Scraper started at ${new Date().toISOString()}`);
  console.log(`[arbeitnow] Max pages: ${MAX_PAGES}`);
  console.log(`${'='.repeat(60)}\n`);

  const allJobs = [];
  let totalFetched = 0;
  let totalErrors = 0;
  let totalSkipped = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const data = await fetchArbeitnowJobs(page);
      const results = data.data || [];

      if (results.length === 0) {
        console.log(`[arbeitnow] No more results at page ${page}. Stopping.`);
        break;
      }

      // Filter for relevant jobs (visa sponsorship / relocation)
      const relevant = results.filter(isRelevantJob);
      const notRelevant = results.length - relevant.length;
      totalSkipped += notRelevant;

      const mapped = relevant
        .filter((job) => isWithinLastNDays(job.created_at, 14))
        .map((job) => mapArbeitnowJob(job));

      allJobs.push(...mapped);
      totalFetched += mapped.length;

      console.log(`[arbeitnow] Page ${page}: ${results.length} total, ${relevant.length} relevant, ${mapped.length} within 2 weeks`);

      // Check if there are more pages
      const meta = data.meta || {};
      if (meta.current_page && meta.last_page && meta.current_page >= meta.last_page) {
        console.log(`[arbeitnow] Reached last page (${meta.last_page}). Stopping.`);
        break;
      }

      // Check if next page exists
      if (!data.links?.next) {
        console.log(`[arbeitnow] No next page link. Stopping.`);
        break;
      }

      await sleep(300);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[arbeitnow] Error fetching page ${page}: ${msg}`);
      totalErrors++;
      await sleep(1000);
    }
  }

  console.log(`\n[arbeitnow] Total relevant (within 2 weeks): ${totalFetched}`);
  console.log(`[arbeitnow] Skipped (not relevant): ${totalSkipped}`);
  console.log(`[arbeitnow] Total errors: ${totalErrors}`);

  // Deduplicate by source_id
  const seen = new Set();
  const uniqueJobs = allJobs.filter((job) => {
    const key = job.source_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[arbeitnow] After dedup: ${uniqueJobs.length} unique jobs`);

  // Send to Vercel
  const result = await sendToVercel(ENGINE, uniqueJobs);
  console.log(`\n[arbeitnow] Scraper completed!`);
  console.log(`[arbeitnow] Fetched: ${totalFetched}, Unique: ${uniqueJobs.length}, Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
}

// Run
run().catch((err) => {
  console.error('[arbeitnow] Fatal error:', err);
  process.exit(1);
});
