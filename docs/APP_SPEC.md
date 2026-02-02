# X Insights Studio (CSV-Only)

A mini web app that analyzes X (Twitter) analytics using only uploaded CSV exports.
No API keys. No paid services. Runs 100% in the browser.

## Tech Stack
- Next.js (App Router)
- TailwindCSS
- PapaParse (CSV parsing)
- Recharts (charts)
- Zustand (client state)
- html-to-image (export viral cards to PNG)

## Inputs (CSV)
### 1) Content CSV (per-post analytics)
Example file name:
- `account_analytics_content_YYYY-MM-DD_YYYY-MM-DD.csv`

Expected columns (variations allowed):
- Post/Tweet ID (optional)
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

### 2) Overview CSV (daily account analytics) - optional
Example file name:
- `account_overview_analytics.csv`

Expected columns (variations allowed):
- Date
- Impressions
- Engagements
- Profile visits
- New follows (or follows)
- Unfollows (optional)
- Replies / reposts (optional)
- Media views / video views (optional)

## Core Metrics
### Engagement Count
engagements = likes + replies + reposts + bookmarks + shares

### Engagement Rate
engagement_rate = engagements / impressions  (if impressions > 0 else 0)

### Follows per 1K Impressions
follows_per_1k = (new_follows / impressions) * 1000  (if impressions > 0 else 0)

## Features

### 1) Upload
- Drag & drop / file picker
- Accepts 1 or 2 CSVs
- Detects file type by headers (content vs overview)
- Parses client-side using PapaParse
- Normalizes column names and types

### 2) Dashboard (content CSV required)
#### Stat Cards
- Posts loaded
- Total impressions
- Total new follows
- Best engagement rate
- Best follows per 1k impressions

#### Top Posts by Follower Conversion
Table sorted by `follows_per_1k`:
- Tweet preview (truncated)
- Impressions
- New follows
- Follows per 1k impressions

#### Engagement != Growth Scatter
Scatter plot:
- X-axis: engagements
- Y-axis: new_follows
- Each point: a tweet

#### Posting Time Heatmap
Heatmap grid:
- Rows: day of week
- Columns: hour of day
Metric priority:
1) follows_per_1k (preferred)
2) engagement_rate
3) posting frequency (fallback if metrics missing)

### 3) Viral Cards (Exportable PNG)
A set of shareable cards optimized for screenshots:
- "These tweets drove the most follows/1k impressions"
- "Engagement != Growth" with the scatter plot
- "Best posting times" with heatmap
Includes:
- Download button -> exports the card area to PNG using html-to-image

### 4) Daily Trends (overview CSV optional)
If overview CSV present:
- Daily impressions trend
- Daily follows trend
- Profile visits trend

### 5) Demo Mode
Loads a tiny embedded sample dataset to preview the UI without real CSVs.

## UX Notes
- Dark, minimalist design with soft glassy cards
- Works on mobile
- Clear error messages for missing columns
- Demo mode with a small embedded sample dataset

## Non-Goals
- No API integrations
- No authentication
- No server-side processing
- No storing user data

## How to Use
1) Open app
2) Upload content CSV
3) (Optional) upload overview CSV
4) View dashboard and export viral cards
