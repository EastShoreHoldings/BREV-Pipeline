# Bayou Pipeline

Deal pipeline + full underwriting model for **Bayou Real Estate Ventures, LLC** — Baton Rouge 1–4 family fix-and-flip and BRRRR.

Single-page React app: pipeline board, table view, map with real geocoded property pins, full underwriting modal with ARV sensitivity analysis, live Census ACS demographics, v5.5 Excel export with institutional BREV branding preserved.

## Stack

- **React 19** + Vite + TypeScript (the pipeline component itself is plain JS in a `.tsx` shell)
- **Leaflet** (loaded via CDN) for maps, **Nominatim** for geocoding/address autocomplete
- **US Census Bureau ACS** for per-ZIP demographics (no API key required)
- **ExcelJS** for the branded v5.5 xlsx export (preserves fills/fonts/borders/number formats)
- **recharts** for analytics charts
- Persistence via `localStorage`

## Local development

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # emits dist/
```

## Deployment

Configured for Netlify via `netlify.toml`:
- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirect rule so deep links still load `index.html`
- Aggressive caching on hashed `/assets/*`, no-cache on `/index.html`

## Key features

- **Pipeline view**: Kanban-style columns per stage (Prospecting → Under Analysis → LOI Sent → Under Contract → Closed / Pass / Rejected)
- **Map view**: every geocoded deal plotted on a live OSM map; auto-refresh stale pins
- **Underwriting modal**: 9 tabs (Summary, Underwriting, Budget, Rent Roll, Exit Analysis, Comparables, Demographics, Acquisition Flow, Assumptions)
- **ARV Sensitivity Analysis**: ±5/10/15% scenarios with live recompute of margin, profit, ROE, DSCR, cash-out, remaining equity, and NCF
- **Address autocomplete**: type an address → pick from Nominatim suggestions → lat/lng and city/state/zip auto-fill
- **Census demographics**: real population, median HH income, median rent, poverty, education, housing stock — fetched live per ZIP
- **v5.5 Excel export**: downloads a fully-styled institutional xlsx with all inputs populated and formulas recalculated on open
- **Analytics dashboard**: capital stack, funnel conversion, cycle time, ARV variance, pass/reject reasons, source-level win rates
