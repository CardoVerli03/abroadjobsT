export const APP_NAME = 'Abroad JobsT';
export const APP_VERSION = '1.0.0';
export const ADMIN_TELEGRAM_ID = '8262090447';

export const UPGRADE_WEBSITE_URL = process.env.NEXT_PUBLIC_UPGRADE_WEBSITE_URL || 'https://upgrade.example.com';
export const SUPPORT_CHANNEL = process.env.NEXT_PUBLIC_SUPPORT_CHANNEL || 'https://t.me/abroadjobst_support';
export const LTC_ADDRESS = process.env.NEXT_PUBLIC_LTC_ADDRESS || 'LTC_ADDRESS_NOT_SET';
export const LTC_AMOUNT = 5;
export const CPA_DAYS = 7;
export const CRYPTO_DAYS = 30;

export const FREE_DAILY_LIMIT = 2;

export const SOURCE_CONFIG: Record<string, { letter: string; color: string; bgColor: string; borderColor: string; label: string }> = {
  adzuna: { letter: 'A', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', borderColor: 'border-l-emerald-500', label: 'Adzuna' },
  reed: { letter: 'R', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', borderColor: 'border-l-cyan-500', label: 'Reed' },
  careerjet: { letter: 'C', color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-l-orange-500', label: 'CareerJet' },
  arbeitnow: { letter: 'B', color: 'text-violet-400', bgColor: 'bg-violet-500/20', borderColor: 'border-l-violet-500', label: 'Arbeitnow' },
  remotive: { letter: 'M', color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-l-purple-500', label: 'Remotive' },
  jobicy: { letter: 'J', color: 'text-pink-400', bgColor: 'bg-pink-500/20', borderColor: 'border-l-pink-500', label: 'Jobicy' },
};

export const COUNTRIES = [
  { code: 'UK', name: 'UK', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'US', name: 'USA', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'REMOTE', name: 'Remote', flag: '🌍' },
];

export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote'];

export const FILTER_TAGS = [
  { id: 'visa_sponsor', label: 'Visa Sponsor' },
  { id: 'relocation', label: 'Relocation' },
  { id: 'accommodation', label: 'Accommodation' },
  { id: 'flight', label: 'Flight' },
  { id: 'remote', label: 'Remote' },
];

export const TAG_DESCRIPTIONS: Record<string, string> = {
  'Visa Sponsor': 'The employer will sponsor your work visa, handling legal requirements and fees.',
  'Relocation': 'The employer provides relocation assistance — moving costs, temporary housing, or settling-in support.',
  'Accommodation': 'The employer provides or helps with accommodation as part of the job package.',
  'Flight': 'The employer covers your flight costs to the job location.',
  'LMIA': 'Labour Market Impact Assessment — a Canadian government assessment that allows an employer to hire a foreign worker.',
  'Remote': 'You can work from anywhere — no relocation needed.',
};

export const VISA_GUIDES = [
  {
    id: 'uk-skilled-worker',
    title: 'UK Skilled Worker Visa',
    description: 'Work in the UK with an approved employer',
    details: 'The Skilled Worker visa allows you to come to or stay in the UK to do an eligible job with an approved employer. You must have a confirmed job offer and a Certificate of Sponsorship from your employer. The job must pay the minimum salary threshold. You can stay for up to 5 years and may be able to settle permanently after 5 years.',
    requirements: ['Certificate of Sponsorship from an approved employer', 'Job on the list of eligible occupations', 'Minimum salary threshold (£38,700 or the "going rate")', 'English language proficiency at B1 level', 'Enough money to support yourself (£1,270)'],
  },
  {
    id: 'canada-lmia',
    title: 'Canada LMIA',
    description: 'Canadian employer hires a foreign worker',
    details: 'A Labour Market Impact Assessment (LMIA) is a document that an employer in Canada may need to get before hiring a foreign worker. A positive LMIA shows there is a need for a foreign worker to fill the job and that no Canadian worker is available. The employer applies for the LMIA, and if approved, you can apply for a work permit.',
    requirements: ['Employer must apply for LMIA through ESDC', 'Demonstrate no Canadian worker available', 'Meet wage requirements for the position', 'Employer must advertise the position first', 'Work permit application after positive LMIA'],
  },
  {
    id: 'australia-482',
    title: 'Australia 482 Visa',
    description: 'Temporary Skill Shortage visa for Australia',
    details: 'The Temporary Skill Shortage visa (subclass 482) allows an employer to sponsor a suitably skilled worker to fill a position they cannot find a suitably skilled Australian to fill. There are three streams: Short-Term, Medium-Term, and Labour Agreement. The Medium-Term stream provides a pathway to permanent residency.',
    requirements: ['Nomination by an approved sponsor', 'Skills assessment if required', 'At least 2 years of relevant work experience', 'English language proficiency', 'Meet health and character requirements', 'Register with the Australian Taxation Office'],
  },
  {
    id: 'eu-blue-card',
    title: 'EU Blue Card',
    description: 'Work in the EU as a highly qualified professional',
    details: 'The EU Blue Card is a work permit for highly qualified non-EU nationals to work in an EU country. It is issued for 1-4 years and allows you to bring family members. After 18 months, you can move to another EU country. After 5 years, you may qualify for permanent residency.',
    requirements: ['Valid work contract or binding job offer', 'Minimum salary threshold (1.0-1.6x average gross salary)', 'Relevant higher education qualification', 'Travel document valid for the stay', 'Health insurance coverage'],
  },
  {
    id: 'uae-work-permit',
    title: 'UAE Work Permit',
    description: 'Employment visa for the United Arab Emirates',
    details: 'The UAE work permit (employment visa) allows foreign nationals to work in the UAE. Your employer acts as your sponsor and handles the visa application process. The permit is typically valid for 2 years. UAE has no income tax, making it attractive for expatriates.',
    requirements: ['Job offer from a UAE employer', 'Medical fitness test', 'Emirates ID registration', 'Salary must meet minimum threshold', 'Passport valid for at least 6 months', 'Employer handles the sponsorship process'],
  },
];

export const CV_TIPS = [
  { title: 'Tailor Your CV', tip: 'Customize your CV for each job application. Match keywords from the job description to pass ATS systems.' },
  { title: 'Keep It Concise', tip: '1-2 pages maximum. Hiring managers spend an average of 7 seconds on initial CV review.' },
  { title: 'Use Action Verbs', tip: 'Start bullet points with action verbs: Led, Developed, Implemented, Achieved, Managed.' },
  { title: 'Quantify Achievements', tip: 'Use numbers and percentages. "Increased sales by 25%" is stronger than "Improved sales."' },
  { title: 'Include International Experience', tip: 'Highlight any international work, study, or volunteer experience — it shows adaptability and cultural awareness.' },
  { title: 'Format for ATS', tip: 'Use simple formatting, standard fonts, and avoid graphics. Save as PDF unless instructed otherwise.' },
  { title: 'Proofread Carefully', tip: 'Spelling and grammar errors are the #1 reason CVs get rejected. Use tools like Grammarly and have someone review it.' },
];

export type TabId = 'jobs' | 'remote' | 'saved' | 'ai' | 'premium' | 'about' | 'admin';
