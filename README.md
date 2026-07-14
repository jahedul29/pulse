# Pulse — Admin & BI

A demo admin & business-intelligence console for a physiotherapy / orthopedic telehealth platform, built from the **Clients & Profiles** section of the source workbook.

It showcases the full UI vocabulary the brief called for: a section menu, KPI cards, charts, an interactive map, a searchable data table, tabs, and a nested account → profiles structure.

## What's built

- **Clients & Profiles** — fully implemented
  - KPI cards with sparklines and period-aware deltas
  - New-clients trend chart, package / supervision / cancellation donuts
  - Clients-by-territory Leaflet map with a companion share table
  - Searchable, paginated client table → account detail (whole row clickable, keyboard accessible)
  - Account detail: identity, wallet (balance / bonus / gift / forfeit + transactions), bank cards, notifications, admin notes, and per-profile tabs (profile map, assigned specialists, service balances, usage history)
- **Personnel, Discounts, Orders, Events, Content** — navigation stubs (scaffolded, labelled "soon")

The period selector (`D · W · M · 3M · 6M · 12M · YTD`) drives the KPIs and trend via the URL query.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Recharts · React-Leaflet (OpenStreetMap) · lucide-react.

All data is mock and generated deterministically in `lib/mock/data.ts` (US / New York City locale, USD) — no backend, no API keys.

## Run locally

```bash
nvm use            # Node 24 (see .nvmrc)
npm install
npm run dev        # http://localhost:3000  -> redirects to /clients
```

Production build:

```bash
npm run build
npm run start
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel             # first run links the project
vercel --prod      # ship, prints the shareable URL
```

Or import the repository at [vercel.com/new](https://vercel.com/new) — no environment variables required.

## Structure

```
app/(dashboard)/            layout (sidebar + topbar), section pages
app/(dashboard)/clients/    dashboard + [id] account detail
app/icon.svg                favicon (Pulse heartbeat mark)
components/clients/          KPI, charts, map, table, account panel, profile tabs
components/nav|common/       sidebar, topbar, period toggle, status badge, pagination
lib/                         types, period helpers, formatters, mock data
```
