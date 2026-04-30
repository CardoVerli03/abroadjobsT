#!/usr/bin/env node
/**
 * Jobicy Job Scraper for Abroad JobsT
 * 
 * Scrapes remote jobs from Jobicy API.
 * All jobs are remote (is_remote=1).
 * 
 * API docs: https://jobicy.com/api/v2/remote-jobs
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

const ENGINE = 'jobicy';
const BASE_URL = 'https://jobicy.com/api/v2/remote-jobs';
const COUNT = 50;

// Jobicy industries that are likely to have visa-friendly jobs
const INDUSTRIES = [
  'tech',
  'finance',
  'marketing',
  'design',
  'management',
  'sales',
  'engineering',
  'healthcare',
];

const JOB_TYPES = ['full-time', 'part-time', 'contract'];

// ─── Main Scraper ───────────────────────────────────────────────────

async function fetchJobicyJobs(params) {
  const urlParams = new URLSearchParams({
    count: String(COUNT),
    ...params,
  });

  const url = `${BASE_URL}?${urlParams.toString()}`;
  console.log(`[jobicy] Fetching: ${url.replace(BASE_URL, '...')}`);

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 300)}`);
  }

  return response.json();
}

function mapJobicyJob(raw) {
  const title = raw.jobTitle || raw.title || 'Untitled';
  const company = raw.companyName || raw.company || 'Unknown Company';
  const location = raw.jobGeo || raw.location || 'Remote';
  const description = raw.jobDescription || raw.description || raw.excerpt || '';

  const tags = detectTags(title, description);
  // All Jobicy jobs are remote
  const isRemote = 1;

  // Salary handling
  let salaryMin = '';
  let salaryMax = '';
  let currency = 'USD';

  if (raw.salaryMin) salaryMin = String(Math.round(Number(raw.salaryMin)));
  if (raw.salaryMax) salaryMax = String(Math.round(Number(raw.salaryMax)));
  if (raw.salaryCurrency) currency = raw.salaryCurrency;

  // Also check salary field
  if (!salaryMin && raw.salary) {
    const salaryText = String(raw.salary);
    const match = salaryText.match(/([\d,.]+)\s*[-–to]+\s*([\d,.]+)/);
    if (match) {
      salaryMin = parseSalary(match[1]);
      salaryMax = parseSalary(match[2]);
    } else {
      salaryMin = parseSalary(salaryText);
    }
  }

  // Country — try to extract from jobGeo
  const country = mapCountry(raw.jobGeo || raw.country || '');

  // Job type
  let jobType = 'remote';
  if (raw.jobType) {
    const jt = String(raw.jobType).toLowerCase();
    if (jt.includes('full')) jobType = 'full_time';
    else if (jt.includes('part')) jobType = 'part_time';
    else if (jt.includes('contract')) jobType = 'contract';
    else jobType = 'remote';
  }
  jobType = normalizeJobType(jobType);

  const postedAt = raw.pubDate ? toISODate(raw.pubDate) : new Date().toISOString();

  return {
    id: generateUUID(),
    title,
    company,
    location,
    country: country || 'REMOTE',
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_currency: currency,
    description: truncate(description, 5000),
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

function isRelevantJobicyJob(job) {
  // For Jobicy, include jobs that mention visa/relocation or
  // are from industries likely to sponsor visas
  const text = `${job.jobTitle || job.title || ''} ${job.jobDescription || job.description || ''}`.toLowerCase();

  if (/visa\s+sponsor|relocat|accommodation|lmia|work\s+permit/i.test(text)) {
    return true;
  }

  // Include jobs with relevant tags
  const jobTags = (job.tags || []).map((t) => String(t).toLowerCase());
  if (jobTags.some((t) => /visa|relocat|sponsor|international|global/i.test(t))) {
    return true;
  }

  // Accept all — Jobicy is remote-focused and users looking for abroad
  // work may be interested in remote jobs too
  return true;
}

async function run() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[jobicy] Scraper started at ${new Date().toISOString()}`);
  console.log(`[jobicy] Industries: ${INDUSTRIES.join(', ')}`);
  console.log(`[jobicy] Job types: ${JOB_TYPES.join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);

  const allJobs = [];
  let totalFetched = 0;
  let totalErrors = 0;

  // Fetch by industry
  for (const industry of INDUSTRIES) {
    try {
      const data = await fetchJobicyJobs({ industry });
      const results = data.jobs || [];

      if (results.length === 0) {
        console.log(`[jobicy] No results for industry="${industry}"`);
        await sleep(300);
        continue;
      }

      const mapped = results
        .filter((job) => isWithinLastNDays(job.pubDate, 14))
        .filter(isRelevantJobicyJob)
        .map((job) => mapJobicyJob(job));

      allJobs.push(...mapped);
      totalFetched += mapped.length;
      console.log(`[jobicy] Got ${mapped.length} jobs for industry="${industry}" (from ${results.length} total)`);

      await sleep(300);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[jobicy] Error for industry="${industry}": ${msg}`);
      totalErrors++;
      await sleep(1000);
    }
  }

  // Fetch by job type
  for (const jobType of JOB_TYPES) {
    try {
      const data = await fetchJobicyJobs({ job_type: jobType });
      const results = data.jobs || [];

      if (results.length === 0) {
        console.log(`[jobicy] No results for job_type="${jobType}"`);
        await sleep(300);
        continue;
      }

      const mapped = results
        .filter((job) => isWithinLastNDays(job.pubDate, 14))
        .filter(isRelevantJobicyJob)
        .map((job) => mapJobicyJob(job));

      allJobs.push(...mapped);
      totalFetched += mapped.length;
      console.log(`[jobicy] Got ${mapped.length} jobs for job_type="${jobType}" (from ${results.length} total)`);

      await sleep(300);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[jobicy] Error for job_type="${jobType}": ${msg}`);
      totalErrors++;
      await sleep(1000);
    }
  }

  console.log(`\n[jobicy] Total relevant (within 2 weeks): ${totalFetched}`);
  console.log(`[jobicy] Total errors: ${totalErrors}`);

  // Deduplicate by source_id
  const seen = new Set();
  const uniqueJobs = allJobs.filter((job) => {
    const key = job.source_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[jobicy] After dedup: ${uniqueJobs.length} unique jobs`);

  // Send to Vercel
  const result = await sendToVercel(ENGINE, uniqueJobs);
  console.log(`\n[jobicy] Scraper completed!`);
  console.log(`[jobicy] Fetched: ${totalFetched}, Unique: ${uniqueJobs.length}, Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
}

// Run
run().catch((err) => {
  console.error('[jobicy] Fatal error:', err);
  process.exit(1);
});
