# X Insights Studio

A CSV-only analytics studio for X (Twitter) exports. Upload your analytics CSVs and get a viral-ready dashboard with conversion, engagement, and posting-time insights. No API keys, no backend, runs fully in the browser.

## Tech
- Next.js (App Router)
- TailwindCSS
- PapaParse
- Recharts
- Zustand
- html-to-image

## Local setup
```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## How to use
1. Export your X analytics CSVs.
2. Upload the **content** CSV (required) and **overview** CSV (optional).
3. Explore the dashboard and export viral cards as PNG.

### Expected CSVs
**Content CSV (required)**
- Post/Tweet text
- Created at / Post time
- Impressions
- Likes
- Replies
- Reposts / Retweets
- Bookmarks
- Shares
- Profile visits
- New follows

**Overview CSV (optional)**
- Date
- Impressions
- Engagements
- Profile visits
- New follows

Header variations are normalized automatically (case, synonyms, etc.).

## Demo mode
Use the **Demo mode** button on the landing page to load an embedded sample dataset and preview the UI without real CSVs.

## Notes
- No server actions or API routes.
- No external services or paid APIs.
- All parsing and visuals are client-side.
