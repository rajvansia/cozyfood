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
VITE_API_BASE="https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT/exec"
VITE_API_METHOD_OVERRIDE=true
```

- `VITE_API_BASE` points to your Google Apps Script deployment.
- `VITE_API_METHOD_OVERRIDE=true` forces PATCH/DELETE to be sent as POST with a `method=` query param, which is more compatible with Apps Script.

## PWA Notes

- `public/manifest.webmanifest` + `public/sw.js` provide installability and basic offline caching.
- Service worker registers in `src/main.tsx`.

## Folder Highlights

- `src/pages` — Grocery, Meals, Weekly Planner
- `src/components` — reusable UI, icons, and navigation
- `src/lib` — types, mock data, API client, aggregation helpers
- `apps-script/Code.gs` — sample Apps Script backend for Google Sheets

## Meal → Grocery Aggregation

When you tap **Generate Grocery List**, the app:

1. Collects all meals assigned in the weekly planner.
2. Flattens and deduplicates ingredients by `name + unit`.
3. Sums quantities for matching ingredients.
4. Merges into the grocery list (existing items are incremented, new ones are appended).

The logic lives in `src/lib/utils.ts` and is called by `useAppState`.

## Sheets Needed

Create these tabs in your Google Sheet (row 1 = headers):

- `GroceryItems`: `id | name | quantity | unit | category | checked | weekStart | updatedAt`
- `Meals`: `id | mealName | notes`
- `MealIngredients`: `mealId | ingredient | quantity | unit`
- `WeeklyPlan`: `day | mealId`
- `WeeklyPlanHistory`: `weekStart | day | mealId | savedAt`

## Mock Data Fallback

If the API is unreachable or offline, the app loads `src/lib/mockData.ts` and stores edits in `localStorage`. Sync indicators in the header explain whether you’re offline or syncing.
