/**
 * Shared utilities for Abroad JobsT scraper scripts.
 * Used by all 6 scrapers running on GitHub Actions.
 */

const VERCEL_URL = process.env.VERCEL_URL || 'https://abroadjobst.vercel.app';
const SCRAPE_SECRET = process.env.SCRAPE_SECRET || '';
const SCRAPE_ENDPOINT = `${VERCEL_URL}/api/scrape`;

// ─── Country Mapping ────────────────────────────────────────────────

const COUNTRY_MAP = {
  // Adzuna country codes
  gb: 'UK', de: 'DE', nl: 'NL', ae: 'AE', us: 'US', au: 'AU', qa: 'QA',
  // CareerJet location strings
  'united kingdom': 'UK', 'uk': 'UK', 'great britain': 'UK',
  'germany': 'DE', 'deutschland': 'DE',
  'netherlands': 'NL', 'holland': 'NL',
  'united arab emirates': 'AE', 'uae': 'AE',
  'united states': 'US', 'usa': 'US', 'us': 'US',
  'canada': 'CA', 'ca': 'CA',
  'australia': 'AU',
  'qatar': 'QA',
  'new zealand': 'NZ',
  'norway': 'NO',
  'china': 'CN',
};

/**
 * Map a country code or name to our standard 2-letter code.
 * Returns the original value if no mapping found.
 */
function mapCountry(raw) {
  if (!raw) return '';
  const key = raw.trim().toLowerCase();
  return COUNTRY_MAP[key] || raw.toUpperCase().substring(0, 2);
}

// ─── Tag Detection ──────────────────────────────────────────────────

const TAG_RULES = [
  { pattern: /visa\s+sponsor|visa\s+sponsorship|skilled\s+worker\s+visa/i, tag: 'Visa Sponsor' },
  { pattern: /relocat/i, tag: 'Relocation' },
  { pattern: /accommodation|housing\s+provided/i, tag: 'Accommodation' },
  { pattern: /flight\s+provided|flights?\s+provided|flight\s+included/i, tag: 'Flight' },
  { pattern: /lmia/i, tag: 'LMIA' },
  { pattern: /remote|work\s+from\s+home|wfh/i, tag: 'Remote' },
];

/**
 * Auto-detect tags from job title + description text.
 * Returns a JSON array string like '["Visa Sponsor","Relocation"]'
 */
function detectTags(title, description) {
  const text = `${title || ''} ${description || ''}`;
  const tags = [];

  for (const rule of TAG_RULES) {
    if (rule.pattern.test(text)) {
      tags.push(rule.tag);
    }
  }

  return JSON.stringify(tags);
}

/**
 * Determine if a job is remote based on tags and text content.
 */
function isRemoteJob(title, description, existingTags) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  if (existingTags && existingTags.includes('Remote')) return true;
  return /remote|work\s+from\s+home|wfh|telecommut/i.test(text);
}

// ─── UUID Generation ────────────────────────────────────────────────

/**
 * Generate a UUID v4 (no external deps).
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Date Utilities ─────────────────────────────────────────────────

/**
 * Check if a date string is within the last N days (default 14 = 2 weeks).
 */
function isWithinLastNDays(dateStr, days = 14) {
  if (!dateStr) return false;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return date >= cutoff;
  } catch {
    return false;
  }
}

/**
 * Format a date to ISO string, handling various input formats.
 */
function toISODate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// ─── Job Type Detection ─────────────────────────────────────────────

const JOB_TYPE_MAP = {
  'full_time': 'full_time',
  'full time': 'full_time',
  'fulltime': 'full_time',
  'permanent': 'full_time',
  'part_time': 'part_time',
  'part time': 'part_time',
  'parttime': 'part_time',
  'contract': 'contract',
  'contractor': 'contract',
  'temporary': 'contract',
  'temp': 'contract',
  'internship': 'contract',
  'remote': 'remote',
};

/**
 * Normalize a job type string to our standard values.
 */
function normalizeJobType(raw) {
  if (!raw) return 'full_time';
  const key = raw.trim().toLowerCase();
  return JOB_TYPE_MAP[key] || 'full_time';
}

// ─── API Communication ──────────────────────────────────────────────

/**
 * Send jobs to the Vercel app's /api/scrape endpoint.
 * Sends in batches of 100 to avoid payload size limits.
 */
async function sendToVercel(engine, jobs) {
  if (!SCRAPE_SECRET) {
    console.error('ERROR: SCRAPE_SECRET environment variable is not set');
    process.exit(1);
  }

  if (!jobs || jobs.length === 0) {
    console.log(`[${engine}] No jobs to send`);
    return { inserted: 0, skipped: 0, errors: [] };
  }

  const BATCH_SIZE = 100;
  let totalInserted = 0;
  let totalSkipped = 0;
  const allErrors = [];

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    console.log(`[${engine}] Sending batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(jobs.length / BATCH_SIZE)} (${batch.length} jobs)`);

    try {
      const response = await fetch(SCRAPE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine,
          jobs: batch,
          secret: SCRAPE_SECRET,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[${engine}] HTTP ${response.status} from scrape endpoint: ${text}`);
        allErrors.push(`HTTP ${response.status}: ${text.substring(0, 200)}`);
        continue;
      }

      const result = await response.json();
      totalInserted += result.inserted || 0;
      totalSkipped += result.skipped || 0;
      if (result.errors && result.errors.length > 0) {
        allErrors.push(...result.errors);
      }

      console.log(`[${engine}] Batch result: ${result.inserted} inserted, ${result.skipped} skipped`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${engine}] Failed to send batch: ${msg}`);
      allErrors.push(`Fetch error: ${msg}`);
    }

    // Small delay between batches
    if (i + BATCH_SIZE < jobs.length) {
      await sleep(500);
    }
  }

  console.log(`[${engine}] Final: ${totalInserted} inserted, ${totalSkipped} skipped, ${allErrors.length} errors`);
  return { inserted: totalInserted, skipped: totalSkipped, errors: allErrors };
}

// ─── Misc Utilities ─────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate a string to a maximum length.
 */
function truncate(str, maxLen = 5000) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

/**
 * Clean and normalize a salary string to a numeric value.
 */
function parseSalary(raw) {
  if (!raw) return '';
  const cleaned = String(raw).replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? '' : String(Math.round(num));
}

// ─── Exports ────────────────────────────────────────────────────────

module.exports = {
  mapCountry,
  detectTags,
  isRemoteJob,
  generateUUID,
  isWithinLastNDays,
  toISODate,
  normalizeJobType,
  sendToVercel,
  sleep,
  truncate,
  parseSalary,
  VERCEL_URL,
  SCRAPE_SECRET,
};
