# Clover Basket

Cozy, family-only grocery planning with meal planning and auto-generated grocery lists. Built with React, TypeScript, Vite, and Tailwind — designed to feel like tending a tiny garden.

## Quick Start

```bash
npm install
npm run dev
```

## Environment

Create a `.env` file (or set env vars in your host):

```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-supabase-publishable-key"
VITE_APP_PIN="1234"
```

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` configure the Supabase client.
- `VITE_APP_PIN` (optional) enables a lightweight UI PIN gate. This is a client-side check, not a secure auth layer.

## PWA Notes

- `public/manifest.webmanifest` + `public/sw.js` provide installability and basic offline caching.
- Service worker registers in `src/main.tsx`.

## Folder Highlights

- `src/pages` — Grocery, Meals, Weekly Planner
- `src/components` — reusable UI, icons, and navigation
- `src/lib` — types, mock data, Supabase API client, aggregation helpers

## Meal → Grocery Aggregation

When you tap **Generate Grocery List**, the app:

1. Collects all meals assigned in the weekly planner.
2. Flattens and deduplicates ingredients by `name + unit`.
3. Sums quantities for matching ingredients.
4. Rebuilds the week’s **generated** grocery items while keeping any **manual** items intact.

The logic lives in `src/lib/utils.ts` and is called by `useAppState`.

## Supabase Schema

Create tables with the following columns (snake_case recommended):

- `grocery_items`: `id (uuid)`, `name (text)`, `quantity (numeric)`, `unit (text)`, `category (text)`, `checked (bool)`, `week_start (date)`, `updated_at (timestamptz)`, `source (text)`
- `meals`: `id (uuid)`, `meal_name (text)`, `notes (text)`
- `meal_ingredients`: `id (uuid)`, `meal_id (uuid)`, `ingredient (text)`, `quantity (numeric)`, `unit (text)`
- `weekly_plan`: `week_start (date)`, `day (text)`, `meal_ids (uuid[])`, `updated_at (timestamptz)`

Recommended indexes:
- Unique index on `grocery_items (week_start, lower(name), coalesce(unit,''), source)` so manual and generated items can coexist.
- Unique index on `weekly_plan (week_start, day)` for upserts.

Note: The app deletes existing `weekly_plan` rows for a given week before inserting updates, but a unique constraint is still recommended.

RLS:
- For quick setup, disable RLS or add policies that allow your users to read/write these tables.

## Mock Data Fallback

If the API is unreachable or offline, the app loads `src/lib/mockData.ts` and stores edits in `localStorage`. Sync indicators in the header explain whether you’re offline or syncing.
