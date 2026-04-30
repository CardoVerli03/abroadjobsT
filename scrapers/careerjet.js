#!/usr/bin/env node
/**
 * CareerJet Job Scraper for Abroad JobsT
 * 
 * Scrapes jobs from CareerJet API across multiple countries.
 * Uses visa sponsorship / relocation / work permit keywords.
 * 
 * API docs: https://www.careerjet.com/partners/api/
 * 
 * Runs on GitHub Actions every 6 hours.
 */

const {
  mapCountry, detectTags, isRemoteJob, generateUUID,
  isWithinLastNDays, toISODate, normalizeJobType,
  sendToVercel, sleep, truncate, parseSalary,
} = require('./lib/common');

// ─── Configuration ──────────────────────────────────────────────────

const CAREERJET_API_KEY = process.env.CAREERJET_API_KEY;
const ENGINE = 'careerjet';

const BASE_URL = 'https://public.api.careerjet.net/v1/search';

// CareerJet locale mapping
const COUNTRY_LOCALES = [
  { code: 'UK', locale: 'en_GB', country: 'UK' },
  { code: 'DE', locale: 'de_DE', country: 'DE' },
  { code: 'NL', locale: 'nl_NL', country: 'NL' },
  { code: 'AE', locale: 'en_AE', country: 'AE' },
  { code: 'US', locale: 'en_US', country: 'US' },
  { code: 'CA', locale: 'en_CA', country: 'CA' },
  { code: 'AU', locale: 'en_AU', country: 'AU' },
];

const SEARCH_KEYWORDS = [
  'visa sponsorship',
  'relocation',
  'work permit',
  'LMIA',
];

const PAGE_SIZE = 50;
const MAX_PAGES = 3;

// ─── Main Scraper ───────────────────────────────────────────────────

async function fetchCareerJetJobs(keyword, locale, location, page) {
  const params = new URLSearchParams({
    keywords: keyword,
    locale: locale,
    aff_id: CAREERJET_API_KEY,
    pagesize: String(PAGE_SIZE),
    page: String(page),
    sort: 'date',
    content_type: 'json',
  });

  if (location) {
    params.set('location', location);
  }

  const url = `${BASE_URL}?${params.toString()}`;
  console.log(`[careerjet] Fetching: keyword="${keyword}", locale=${locale}, location="${location || 'all'}", page=${page}`);

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 300)}`);
  }

  return response.json();
}

function mapCareerJetJob(raw, countryInfo) {
  const title = raw.title || 'Untitled';
  const company = raw.company || 'Unknown Company';
  const location = raw.locations || raw.location || '';
  const description = raw.description || raw.snippet || '';
  const tags = detectTags(title, description);
  const isRemote = isRemoteJob(title, description, tags) ? 1 : 0;
  const countryCode = countryInfo.country;

  // Salary handling
  let salaryMin = '';
  let salaryMax = '';
  let currency = 'USD';

  if (raw.salary) {
    const salaryText = String(raw.salary);
    // Try to extract salary range
    const salaryMatch = salaryText.match(/([\d,.]+)\s*[-–to]+\s*([\d,.]+)/);
    if (salaryMatch) {
      salaryMin = parseSalary(salaryMatch[1]);
      salaryMax = parseSalary(salaryMatch[2]);
    } else {
      const singleSalary = parseSalary(salaryText);
      if (singleSalary) {
        salaryMin = singleSalary;
        salaryMax = singleSalary;
      }
    }

    // Detect currency from salary text
    if (/£|gbp/i.test(salaryText)) currency = 'GBP';
    else if (/€|eur/i.test(salaryText)) currency = 'EUR';
    else if (/ca\$|cad/i.test(salaryText)) currency = 'CAD';
    else if (/au\$|aud/i.test(salaryText)) currency = 'AUD';
    else if (/aed/i.test(salaryText)) currency = 'AED';
  }

  // Override currency based on country if not detected
  const countryCurrencyMap = { UK: 'GBP', DE: 'EUR', NL: 'EUR', AE: 'AED', US: 'USD', CA: 'CAD', AU: 'AUD' };
  if (currency === 'USD' && countryCurrencyMap[countryCode]) {
    currency = countryCurrencyMap[countryCode];
  }

  // Job type
  let jobType = 'full_time';
  if (raw.contract_time === 'part_time') jobType = 'part_time';
  else if (raw.contract_type === 'contract') jobType = 'contract';
  jobType = normalizeJobType(raw.contract_time || raw.contract_type || jobType);

  const postedAt = raw.date ? toISODate(raw.date) : new Date().toISOString();

  return {
    id: generateUUID(),
    title,
    company,
    location: typeof location === 'string' ? location : String(location),
    country: countryCode,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_currency: currency,
    description: truncate(description, 5000),
    url: raw.url || '',
    source: ENGINE,
    source_id: raw.url ? raw.url.split('/').pop() || generateUUID() : generateUUID(),
    job_type: jobType,
    tags,
    is_remote: isRemote,
    priority: 0,
    posted_at: postedAt,
  };
}

async function run() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[careerjet] Scraper started at ${new Date().toISOString()}`);
  console.log(`[careerjet] Countries: ${COUNTRY_LOCALES.map((c) => c.code).join(', ')}`);
  console.log(`[careerjet] Keywords: ${SEARCH_KEYWORDS.join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);

  if (!CAREERJET_API_KEY) {
    console.error('[careerjet] ERROR: CAREERJET_API_KEY must be set');
    process.exit(1);
  }

  const allJobs = [];
  let totalFetched = 0;
  let totalErrors = 0;

  for (const countryInfo of COUNTRY_LOCALES) {
    for (const keyword of SEARCH_KEYWORDS) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        try {
          const data = await fetchCareerJetJobs(
            keyword,
            countryInfo.locale,
            '', // No specific location — search whole country
            page
          );

          const results = data.jobs || [];

          if (results.length === 0) {
            console.log(`[careerjet] No results for country=${countryInfo.code}, keyword="${keyword}", page=${page}. Stopping.`);
            break;
          }

          const mapped = results
            .filter((job) => isWithinLastNDays(job.date, 14))
            .map((job) => mapCareerJetJob(job, countryInfo));

          allJobs.push(...mapped);
          totalFetched += mapped.length;
          console.log(`[careerjet] Got ${mapped.length} jobs from country=${countryInfo.code}, keyword="${keyword}", page=${page}`);

          // Check if more pages
          const totalPages = data.pages || 0;
          if (page >= totalPages) break;

          await sleep(200);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[careerjet] Error: country=${countryInfo.code}, keyword="${keyword}", page=${page}: ${msg}`);
          totalErrors++;
          await sleep(1000);
        }
      }

      await sleep(300);
    }

    await sleep(500);
  }

  console.log(`\n[careerjet] Total fetched (within 2 weeks): ${totalFetched}`);
  console.log(`[careerjet] Total errors: ${totalErrors}`);

  // Deduplicate by URL (CareerJet doesn't always provide a stable ID)
  const seen = new Set();
  const uniqueJobs = allJobs.filter((job) => {
    const key = job.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[careerjet] After dedup: ${uniqueJobs.length} unique jobs`);

  // Send to Vercel
  const result = await sendToVercel(ENGINE, uniqueJobs);
  console.log(`\n[careerjet] Scraper completed!`);
  console.log(`[careerjet] Fetched: ${totalFetched}, Unique: ${uniqueJobs.length}, Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
}

// Run
run().catch((err) => {
  console.error('[careerjet] Fatal error:', err);
  process.exit(1);
});
