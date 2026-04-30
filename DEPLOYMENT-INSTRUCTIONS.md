# Abroad JobsT — Deployment Instructions

Follow these steps to deploy your app. Do them in order.

---

## Step 1: Create a GitHub Account (if you don't have one)

1. Go to https://github.com
2. Click "Sign up"
3. Follow the steps to create your account

---

## Step 2: Create a New GitHub Repository

1. Click the "+" icon in the top right corner
2. Click "New repository"
3. Name it: `abroadjobst`
4. Make it **Private** (important — your API keys will be in secrets)
5. Click "Create repository"

---

## Step 3: Upload the Code

### Option A: Using GitHub Website (Easiest from Phone)

1. In your new repo, click "uploading an existing file"
2. Drag and drop ALL the files from the zip
3. Make sure the folder structure is preserved:
   - `.github/workflows/` — workflow YAML files
   - `scrapers/` — scraper scripts
   - `src/` — all source code
   - Root files: package.json, next.config.ts, etc.
4. Click "Commit changes"

### Option B: Using Git Commands (from Computer)

```bash
unzip abroadjobst-github.zip
cd abroadjobst
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/abroadjobst.git
git push -u origin main
```

---

## Step 4: Set Up GitHub Secrets

1. Go to your repo → **Settings** → **Secrets and variables** → **Actions**
2. Click "New repository secret"
3. Add each of these:

| Secret Name | Value |
|---|---|
| `VERCEL_URL` | Your Vercel URL (you'll get this in Step 6), e.g. `https://abroadjobst.vercel.app` |
| `SCRAPE_SECRET` | `abroadjobst_scrape_secret_2024_x9k2m` (or your custom secret) |
| `ADZUNA_APP_ID` | Your Adzuna app ID |
| `ADZUNA_API_KEY` | Your Adzuna API key |
| `REED_API_KEY` | Your Reed API key |
| `CAREERJET_API_KEY` | Your CareerJet API key |
| `ADMIN_TELEGRAM_ID` | Your Telegram user ID |

---

## Step 5: Create a Turso Database

1. Go to https://turso.tech
2. Sign up / Log in
3. Click "Create Database"
4. Name it: `abroadjobst`
5. After creation, copy:
   - **URL** (looks like: `libsql://abroadjobst-xxxxx.turso.io`)
   - **Auth Token** (click "Create Token" if needed)

---

## Step 6: Deploy to Vercel

1. Go to https://vercel.com
2. Sign up with your GitHub account
3. Click "Add New" → "Project"
4. Select your `abroadjobst` repository
5. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: Leave default (or set to `.` if needed)
6. Add Environment Variables:

| Variable Name | Value |
|---|---|
| `TURSO_URL` | Your Turso URL from Step 5 |
| `TURSO_TOKEN` | Your Turso auth token from Step 5 |
| `ADZUNA_APP_ID` | Your Adzuna app ID |
| `ADZUNA_API_KEY` | Your Adzuna API key |
| `REED_API_KEY` | Your Reed API key |
| `CAREERJET_API_KEY` | Your CareerJet API key |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token |
| `ADMIN_TELEGRAM_ID` | Your Telegram user ID |
| `LTC_ADDRESS` | Your Litecoin wallet address |
| `GG_SMARTLINK` | Your GG Agency SmartLink URL |
| `UPGRADE_WEBSITE_URL` | Your upgrade website URL (where the SmartLink lives) |
| `SCRAPE_SECRET` | Same secret as in GitHub Actions |
| `SUPPORT_CHANNEL` | Your Telegram support channel link |
| `DATABASE_URL` | `file:./dev.db` |

7. Click "Deploy"
8. Wait for deployment to finish
9. Copy your app URL (e.g. `https://abroadjobst.vercel.app`)
10. Go back to GitHub and update the `VERCEL_URL` secret with this URL

---

## Step 7: Set Up Telegram Mini App

1. Open Telegram and talk to @BotFather
2. Create a new bot: `/newbot`
3. Give it a name (e.g. "Abroad JobsT") and username (e.g. "abroadjobst_bot")
4. Copy the bot token and add it to Vercel env vars as `TELEGRAM_BOT_TOKEN`
5. Now set the webapp: send this to BotFather:
   ```
   /setmenubutton
   ```
6. Select your bot
7. Set the URL to: `https://abroadjobst.vercel.app`
8. Set the text to: "Open Abroad JobsT"

### Alternative: Set as Mini App

1. Talk to @BotFather
2. Send `/newapp`
3. Select your bot
4. Follow the prompts:
   - Title: "Abroad JobsT"
   - Description: "Find abroad jobs with visa sponsorship"
   - Photo: Upload a logo (optional)
   - URL: `https://abroadjobst.vercel.app`

---

## Step 8: Configure GG Agency Postback

1. Log into your GG Agency dashboard
2. Go to your SmartLink settings
3. Set the Postback URL to:
   ```
   https://abroadjobst.vercel.app/api/webhook/gg?user_id={user_id}&status={status}&profit={profit}
   ```
4. Make sure the postback triggers on "subscription" and "redeem" events

---

## Step 9: Test Everything

1. Open your Telegram bot and tap "Open Abroad JobsT"
2. You should see the Jobs tab with job listings (after scrapers run)
3. Go to the Admin tab and enter your Telegram ID to verify admin access
4. Test the Premium tab — try the LTC payment flow
5. Wait for the first scraper run (or trigger manually in GitHub Actions)

### Manual Scraper Trigger

1. Go to your GitHub repo → **Actions** tab
2. Select any scraper workflow
3. Click "Run workflow" → "Run workflow"

---

## Step 10: Your Upgrade Website (for CPA SmartLink)

The GG Agency SmartLink must NOT be in the webapp directly. Instead:

1. Create a simple website (can be a free GitHub Pages site)
2. Put the SmartLink on that website
3. Set `UPGRADE_WEBSITE_URL` in Vercel env vars to that website's URL
4. Users click "Go to Upgrade Website" in the Premium tab → land on your website → complete offer

---

## Troubleshooting

### Jobs not appearing?
- Check GitHub Actions ran successfully (repo → Actions tab)
- Check Vercel deployment logs
- Make sure `VERCEL_URL` secret matches your actual Vercel URL

### Admin tab not working?
- Make sure you entered your exact Telegram ID
- Your Telegram ID is a number (e.g. `8262090447`)

### Postback not working?
- Verify the postback URL in GG Agency matches your Vercel URL
- Check Vercel function logs for errors

### Database issues?
- Verify Turso URL and token are correct
- The database schema auto-creates on first API call

---

## Architecture Overview

```
User → Telegram Mini App → Vercel (Next.js) → Turso DB
                              ↑
GitHub Actions → Scraper Scripts → /api/scrape endpoint
```

- **24 scrape runs/day** (6 engines × 4 runs every 6 hours)
- **Jobs auto-delete** after 14 days
- **No duplicate jobs** (unique index on title+company+location)
- **Free users**: 2 jobs/day
- **Premium users**: Unlimited + AI + Saved jobs
