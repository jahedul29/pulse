# Pulse — Admin & BI

A demo admin & business-intelligence console for a physiotherapy / orthopedic telehealth platform, built from the **Clients & Profiles** section of the source workbook.

It showcases the full UI vocabulary the brief called for — a section menu, KPI cards, charts, an interactive map, a searchable data table, tabs, and a nested account → profiles structure — wired together as an interactive product rather than a static mockup.

## What's built

**Clients & Profiles** — implemented end to end:

- **Dashboard**
  - Six period-aware KPI cards with sparklines and up/down deltas (suspended & deleted invert)
  - New-clients trend chart plus package / supervision / cancellation donut charts
  - Clients-by-territory Leaflet map (NYC) with a companion share table
  - Searchable, paginated client table (8/page); whole row clickable and keyboard accessible
  - Period selector (`D · W · M · 3M · 6M · 12M · YTD`) drives the KPIs and trend via the URL query, and is scoped to the dashboard only
- **Client CRUD**
  - Add / edit / delete accounts through a shadcn dialog form
  - Validation on submit with `react-hook-form` + `zod`: email format, real US/NANP phone, required date of birth via a calendar date picker
  - Destructive delete behind a confirm dialog; toast feedback on every action
  - Changes persist in-session through a Zustand store (no backend)
- **Client detail**
  - Sticky toolbar (back link + Edit / Delete) pinned below the top bar on scroll
  - Account panel: identity, wallet (balance / bonus / gift / forfeit + transactions), bank cards, notifications, admin notes
  - Per-profile tabs: profile map, assigned specialists, service balances with progress, and service-usage history

**Personnel, Discounts, Orders, Events, Content** — navigation stubs (scaffolded, labelled "soon").

Data is mock and generated deterministically in `lib/mock/data.ts` (US / New York City locale, USD) — no API keys, no network calls beyond the OpenStreetMap map tiles.

## Stack

| Area | Choice | Notes |
|------|--------|-------|
| Framework | **Next.js 16** (App Router) | Server components, route groups, dynamic detail route |
| Language | **TypeScript 5** | Strict; shared domain types in `lib/types.ts` |
| UI runtime | **React 19** | |
| Styling | **Tailwind CSS v4** | Theme tokens (Clinical Teal) + light/dark tokens in `app/globals.css` |
| Components | **shadcn/ui** (Base UI) | Card, Table, Tabs, Dialog, Alert Dialog, Select, Popover, Calendar, Avatar, Progress |
| Charts | **Recharts 3** | KPI sparklines, area trend, donut splits |
| Maps | **React-Leaflet 5** + **Leaflet** | OpenStreetMap tiles, client-only via dynamic import |
| Forms | **react-hook-form 7** + **zod 4** | Submit-time validation, `@hookform/resolvers` |
| State | **Zustand 5** | In-session client store for CRUD |
| Toasts | **sonner** | Action feedback |
| Icons | **lucide-react** | |
| Fonts | **next/font** — Bricolage Grotesque (display), Hanken Grotesk (body), JetBrains Mono (metrics) | |

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

## Structure

```
app/(dashboard)/            layout (sticky sidebar + topbar), section pages
app/(dashboard)/clients/    dashboard + [id] account detail (client-rendered from store)
app/icon.svg                favicon (Pulse heartbeat mark)
components/clients/          KPI, charts, map, table, account panel, profile tabs,
                             client form dialog (add/edit), client actions, date field
components/nav/              sidebar, topbar, mobile nav
components/common/           period toggle, status badge, pagination, section stub
components/ui/               shadcn primitives
lib/                         types, period helpers, formatters, nav config,
                             mock data, Zustand store, client helpers (create/age/initials)
```
