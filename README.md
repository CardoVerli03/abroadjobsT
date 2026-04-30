# Abroad JobsT — Telegram Mini App

Find abroad jobs with visa sponsorship, relocation packages, and accommodation from 6 job engines across 20+ countries.

## Features

- **6 Job Engines**: Adzuna, Reed, CareerJet, Arbeitnow, Remotive, Jobicy
- **7 Tabs**: Jobs, Remote, Saved, AI (Gemini), Premium, About, Admin
- **Free Plan**: 2 jobs/day (title + company + location only)
- **Premium Plan**: Unlimited views, full details, saved jobs, AI assistant
- **Monetization**: CPA offers (7 days) or Litecoin payment ($5 / 30 days)
- **Admin Dashboard**: Stats, users, payments, postbacks, jobs, keywords
- **Auto Cleanup**: Jobs older than 14 days are deleted
- **Dedup**: No duplicate jobs (hash on title+company+location)
- **24 Scrape Runs/Day**: GitHub Actions every 6 hours for each engine

## Tech Stack

- Next.js 16 + TypeScript + Tailwind CSS 4
- Turso (libSQL) edge database
- shadcn/ui + Lucide React + Framer Motion
- Telegram WebApp SDK

## Quick Start

1. Clone repo
2. Copy `.env.example` to `.env` and fill in your credentials
3. `bun install`
4. `bun run dev`
5. Open http://localhost:3000

## Deployment

See DEPLOYMENT-INSTRUCTIONS.md for step-by-step guide.

## GitHub Actions Secrets

Set these in your GitHub repo → Settings → Secrets:

| Secret | Description |
|--------|-------------|
| VERCEL_URL | Your Vercel app URL (e.g. https://abroadjobst.vercel.app) |
| SCRAPE_SECRET | Same as in your .env file |
| ADZUNA_APP_ID | Adzuna API app ID |
| ADZUNA_API_KEY | Adzuna API key |
| REED_API_KEY | Reed API key |
| CAREERJET_API_KEY | CareerJet API key |
| ADMIN_TELEGRAM_ID | Your Telegram user ID |

## GG Agency Postback URL

Set this in your GG Agency dashboard:

https://your-vercel-app.vercel.app/api/webhook/gg?user_id={user_id}&status={status}&profit={profit}
