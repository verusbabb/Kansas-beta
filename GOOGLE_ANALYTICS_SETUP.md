# Google Analytics Setup Guide

This guide explains how to set up Google Analytics tracking for visitor and page view statistics, and how to deploy the updated frontend.

## Prerequisites

- GCP CLI installed and working (already done)
- Access to Google Analytics (free account)
- Access to GCP Secret Manager

## Step 1: Get Google Analytics ID

1. Go to https://analytics.google.com/
2. Sign in with your Google account
3. **Create a Property:**
   - Click "Admin" (gear icon in bottom left)
   - Under "Property" column, click "Create Property"
   - Enter property name: `Kansas Beta Website`
   - Set time zone and currency
   - Click "Next" and complete the setup
4. **Get Your Measurement ID:**
   - In the property, go to "Admin" → "Data Streams"
   - Click "Web" or your web stream
   - Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)

## Step 2: Add to Local Environment

1. Add to `frontend/.env`:
   ```
   VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
   ```
   (Replace `G-XXXXXXXXXX` with your actual Measurement ID)

2. Restart your local frontend dev server

## Step 3: Add to GCP Secret Manager (for Production)

Run this command to create the secret:

```bash
echo -n "G-XXXXXXXXXX" | gcloud secrets create google-analytics-id \
  --data-file=- \
  --project=verusware
```

(Replace `G-XXXXXXXXXX` with your actual Measurement ID)

## Step 4: Update Deployment Scripts

The deployment scripts need to be updated to:
1. Fetch `google-analytics-id` from Secret Manager
2. Pass it as `_VITE_GOOGLE_ANALYTICS_ID` substitution to the frontend build
3. Ensure the frontend Dockerfile accepts this build argument

**Files that will need updates:**
- `cloudbuild.yaml` - Add `_VITE_GOOGLE_ANALYTICS_ID` substitution
- `deploy.sh` - Fetch secret and pass as substitution
- `frontend/Dockerfile` - Ensure build arg is accepted (may already be there)

## Step 5: Deploy Frontend

Deploy the frontend with the updated configuration:

```bash
./deploy.sh frontend
```

Or for a full deployment:

```bash
./deploy.sh all
```

## Step 6: View Data in Google Analytics

1. Go to https://analytics.google.com/
2. Select your property
3. View reports:
   - **Realtime** → See current visitors live
   - **Reports** → **Engagement** → **Pages and screens** → See page views
   - **Reports** → **User acquisition** → See visitor counts
   - **Reports** → **Engagement** → **Events** → See newsletter opens (after custom tracking is added)

## What Data You'll See

### Visitor Statistics
- **Real-time visitors** (live count)
- **Total visitors** (all time, daily, weekly, monthly)
- **New vs. returning visitors**
- **Visitor trends** over time
- **Demographics** (location, device, browser)

### Page View Statistics
- **Page views per page** (which pages are visited)
- **Most popular pages**
- **Page view trends** over time
- **Entry/exit pages**
- **User flow** between pages

### Newsletter Tracking (after custom events are added)
- **Newsletter opens** (which newsletters are viewed)
- **Most popular newsletters**
- **Newsletter engagement trends**

## Important Notes

- **Cookie Blockers:** Users with cookie blockers won't see errors - tracking just fails silently for them
- **No Login Required:** Google Analytics tracks all public visitors, whether logged in or not
- **Historical Data:** All data is stored on Google's servers, not in the browser
- **Data Availability:** 
  - Real-time data appears within minutes
  - Full reports available within 24 hours
  - Historical data accumulates over time

## Timeline

- **Setup:** ~10 minutes (create GA property, get ID)
- **Local Testing:** Immediate (add to `.env`, restart)
- **Production Deployment:** ~5-10 minutes (add secret, update scripts, deploy)
- **Data Appears:** 
  - Real-time: Within minutes
  - Full reports: Within 24 hours

## Troubleshooting

### No data appearing?
1. Check that `VITE_GOOGLE_ANALYTICS_ID` is set correctly
2. Verify the Google Analytics script is loading (check browser console)
3. Check Google Analytics Real-time reports to see if tracking is working
4. Ensure cookies are enabled in your browser (for testing)

### Secret not found in production?
1. Verify secret exists: `gcloud secrets describe google-analytics-id --project=verusware`
2. Check that deployment script is fetching the secret correctly
3. Verify the secret is passed as a build argument to the frontend build

