# E-Leave — Mobile-first Next.js + n8n (PWA)

A tiny, phone-friendly leave application web app that posts to an **n8n** webhook and shows **Applied**, **Balance**, and **History** (History is merged into Balance). It installs to the home screen and works offline for basic views.&#x20;

---

## Table of contents

* [Quick start](#quick-start)
* [Project structure](#project-structure)
* [Tech stack & key libs](#tech-stack--key-libs)
* [Environment & scripts](#environment--scripts)
* [Data model & validation](#data-model--validation)
* [API routes & n8n flow](#api-routes--n8n-flow)
* [Client data fetching (SWR)](#client-data-fetching-swr)
* [State (Zustand)](#state-zustand)
* [UI components](#ui-components)
* [Styling & UX notes](#styling--ux-notes)
* [PWA & offline](#pwa--offline)
* [LAN testing & mobile access](#lan-testing--mobile-access)
* [Common tasks & future changes](#common-tasks--future-changes)
* [Troubleshooting (Windows, UTF-8, Tailwind v4)](#troubleshooting-windows-utf8-tailwind-v4)

---

## Quick start

```bash
# 1) Install deps
npm ci

# 2) Copy env template and fill values
cp .env.local.example .env.local
# set N8N_WEBHOOK_INGEST_URL, optionally TIMEZONE

# 3) Run in dev (Turbopack)
npm run dev
# App: http://localhost:3000
```

> If you want to reach it from your phone on the same Wi-Fi, see **LAN testing** below.

---

## Project structure

```
e-leave/
├─ public/
│  ├─ icons/                # PWA icons (192x192, etc.)
│  ├─ manifest.json         # PWA manifest
│  ├─ sw.js                 # Service worker (registered in layout)
├─ src/
│  ├─ app/                  # Next.js App Router
│  │  ├─ page.tsx           # Apply (form page)
│  │  ├─ applied/page.tsx   # Applied list page
│  │  ├─ balance/page.tsx   # Balance + History (merged here)
│  │  ├─ api/
│  │  │  └─ apply/route.ts  # POST (proxy to n8n) + GET views
│  │  ├─ offline/page.tsx   # Offline fallback page
│  │  ├─ layout.tsx         # Root layout (PWA reg, NavBar)
│  │  └─ globals.css        # App-wide styles (Tailwind + custom)
│  ├─ components/
│  │  ├─ LeaveForm.tsx      # Main form (react-hook-form + zod)
│  │  ├─ NavBar.tsx         # iOS-like bottom nav
│  │  └─ StatCard.tsx       # Tile for balance counts
│  ├─ lib/
│  │  ├─ api.ts             # Fetch helpers (timeouts, swrFetcher)
│  │  ├─ date.ts            # todayISO, workingDaysInclusive (TZ-aware)
│  │  ├─ schema.ts          # zod schema for leave
│  │  ├─ store.ts           # Zustand store (persist + devtools)
│  │  └─ types.ts           # Types/unions for leave/balance/responses
│  └─ styles/               # (If used) extra style files
├─ .env.local.example
├─ next.config.mjs
├─ postcss.config.mjs       # Tailwind v4 requires @tailwindcss/postcss
├─ tailwind.config.ts
├─ package.json
└─ README.md                # (this file)
```

---

## Tech stack & key libs

* **Next.js 15 (App Router)**, React 19
* **Tailwind CSS v4** (via `@tailwindcss/postcss`)
* **SWR** for client data fetching + cache
* **react-hook-form** + **zod** for form + validation
* **Zustand** (persist + devtools) for optional client state
* **date-fns / date-fns-tz** for dates & working-day math
* **PWA**: `manifest.json` + `sw.js` (registered in `layout.tsx`)

---

## Environment & scripts

### `.env.local`

```env
# Where POST /api/apply forwards the form JSON
N8N_WEBHOOK_INGEST_URL=https://your-n8n-host/webhook/e-leave-ingest

# Optional timezone for date helpers (defaults Asia/Kuala_Lumpur)
TIMEZONE=Asia/Kuala_Lumpur
```

### `package.json` scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --turbopack",
    "start": "next start",
    "lint": "eslint"
  }
}
```

---

## Data model & validation

### `src/lib/types.ts` (excerpt)

```ts
export type LeaveType = 'Annual' | 'Medical' | 'Others';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export type Group =
  | 'Tri-e Marketing sdn bhd'
  | 'Tri-e unitech sdn bhd'
  | 'Tri-e mcom sdn bhd (fks sign up now sdn bhd)'
  | 'Tri-e multimedia sdn bhd'
  | 'Tri-e nihomes sdn bhd (fka Tri-e digital sdn bhd)';

export interface LeaveApplicationInput {
  groups: Group[];
  applicantName: string;
  designation: string;
  department: string;
  leaveTypes: LeaveType[];
  reason: string;
  startDate: `${number}-${number}-${number}`;
  endDate:   `${number}-${number}-${number}`;
  totalWorkingDays: number;
  contactAddress: string;
  contactTel: string;
  dateRequest: `${number}-${number}-${number}`;
}

export interface LeaveApplication extends LeaveApplicationInput {
  id: string;
  status: LeaveStatus;
  createdAt: string;
}

export interface LeaveBalance {
  annual: number; medical: number; others: number;
  lastUpdatedAt: string;
}

export interface N8nIngestResponse {
  ok: boolean;
  application: LeaveApplication;
  balance?: LeaveBalance;
  message?: string;
}

export interface AppliedResponse { ok: boolean; items: LeaveApplication[]; }
export interface BalanceResponse { ok: boolean; balance?: LeaveBalance; message?: string; }
export interface HistoryResponse { ok: boolean; items: LeaveApplication[]; nextCursor?: string; }
```

### `src/lib/schema.ts` (zod)

* Validates each field and checks `startDate <= endDate`.
* Optionally enum-restricts **Group** & **LeaveType**.

---

## API routes & n8n flow

### High-level flow

```
LeaveForm (client) → POST /api/apply → proxy to n8n webhook
n8n processes → returns normalized JSON { ok, application, balance? }
Client updates UI (Applied list, Balance tiles)
```

### `src/app/api/apply/route.ts` (simplified)

```ts
import { NextResponse } from 'next/server';

const N8N_WEBHOOK_INGEST_URL = process.env.N8N_WEBHOOK_INGEST_URL!;

// POST → forward body to n8n
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(N8N_WEBHOOK_INGEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message }, { status: 500 });
  }
}

// GET views for dev/demo (replace with your n8n GET endpoints later)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view');
  if (view === 'balance') {
    return NextResponse.json({ ok: true, balance: {
      annual: 7, medical: 5, others: 2, lastUpdatedAt: new Date().toISOString()
    }});
  }
  if (view === 'history') return NextResponse.json({ ok: true, items: [] });
  return NextResponse.json({ ok: true, items: [] }); // applied
}
```

> **Future**: Replace the GET demo responses with actual endpoints (either from n8n via HTTP Request node or your database API). Keep the response shapes from `types.ts`.

---

## Client data fetching (SWR)

### Global provider

You can wrap app in a provider (optional). If not present, we call `useSWR(key, fetcher)` per page.

### Fetch helpers — `src/lib/api.ts`

* `api()` adds timeout & JSON-safe parsing.
* `submitLeave()`, `fetchApplied()`, `fetchBalance()`, `fetchHistory()` helpers.
* Exports `swrFetcher` for generic `useSWR(url, swrFetcher)`.

### Pages using SWR

* `/applied` — list current applications.
* `/balance` — shows **Balance** + **History** in one screen.

  * History auto-refreshes every **15 s** and revalidates on focus.

---

## State (Zustand)

`src/lib/store.ts` keeps optional client cache (persisted in `localStorage`) with helpers:

* `setApplications`, `upsertApplication`, `patchApplication`, `removeApplication`
* `setBalance`, `hydrateFromServer`, `reset`

You can call these after successful POST, or on webhook updates if you add a real-time channel later.

---

## UI components

* **LeaveForm.tsx**
  Uses **react-hook-form** + **zod**.
  Group & LeaveType checkboxes use **iOS-like tiles** (larger tap targets).
  `totalWorkingDays` auto-recomputes on date change and ignores weekends.

* **StatCard.tsx**
  Displays a number + label, used in the balance tiles.
  You can pass `className="flex-1"` to make them share width in a `flex` row.

* **NavBar.tsx**
  Bottom app-style nav, evenly spaced buttons; the History item either links to `/balance#history` or can be removed.

---

## Styling & UX notes

* `globals.css` contains:

  * **tab bar** rules (buttons fill width),
  * **card** class (now with subtle border),
  * **title-border** under page titles,
  * **check/checkbox** styles (iOS-ish squares with checkmark),
  * mobile-friendly spacing.

* Balance tiles laid out **side-by-side** either with a `grid grid-cols-3` or:

  ```tsx
  <div className="flex items-stretch gap-3">
    <StatCard className="flex-1" label="Annual"  value={b.annual} />
    <StatCard className="flex-1" label="Medical" value={b.medical} />
    <StatCard className="flex-1" label="Others"  value={b.others} />
  </div>
  ```

---

## PWA & offline

* `public/manifest.json` — app name, icons.
* `public/sw.js` — registered from `layout.tsx`:

  ```tsx
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // only in production if you prefer:
      navigator.serviceWorker.register('/sw.js').catch(()=>{});
    });
  }
  ```
* `/offline` — simple offline page.
  You can enhance `sw.js` to cache routes and assets for true offline browsing.

---

## LAN testing & mobile access

* Ensure Windows Firewall allows inbound on port **3000** for Node.
* Start dev: `npm run dev` → check the **Network** URL printed (e.g., `http://192.168.1.23:3000`).
* Open that URL on your phone (same Wi-Fi).
  (We also have an optional `/lan` page in some branches that generates a QR.)

---

## Common tasks & future changes

### 1) Change **company groups** (form checkboxes)

In `LeaveForm.tsx`:

```ts
const GROUPS = [
  'Tri-e Marketing sdn bhd',
  'Tri-e unitech sdn bhd',
  'Tri-e mcom sdn bhd (fks sign up now sdn bhd)',
  'Tri-e multimedia sdn bhd',
  'Tri-e nihomes sdn bhd (fka Tri-e digital sdn bhd)',
] as const;
```

Render:

```tsx
<div className="check-row">
  {GROUPS.map(g => (
    <label key={g} className="check">
      <input type="checkbox" value={g} {...register('groups')} />
      <span className="break-words">{g}</span>
    </label>
  ))}
</div>
```

Schema (optional strictness):

```ts
const Group = z.enum(GROUPS);
groups: z.array(Group).min(1, 'Select at least one group'),
```

### 2) Add a **new leave type**

* Types: `type LeaveType = 'Annual' | 'Medical' | 'Others' | 'Study'`
* Schema: extend the `z.enum([...])`
* Form: add another checkbox tile in “Application for”
* Balance: add a `StatCard` and handle backend balance.

### 3) Hook up **real n8n** for GET views

Replace the demo GETs in `/api/apply/route.ts` with real fetches:

```ts
// Balance view
const r = await fetch(`${N8N_READ_URL}/balance?user=${id}`, { headers: { ... }});
return NextResponse.json(await r.json());

// History view
const r = await fetch(`${N8N_READ_URL}/history?user=${id}`);
return NextResponse.json(await r.json());

// Applied view
const r = await fetch(`${N8N_READ_URL}/applied?user=${id}`);
return NextResponse.json(await r.json());
```

Keep response shapes consistent with `BalanceResponse`, `AppliedResponse`, `HistoryResponse`.

### 4) Optimistic update after submit

In `LeaveForm.tsx`, after a successful POST:

```ts
import { mutate } from 'swr';
import type { AppliedResponse } from '@/lib/types';

await mutate<AppliedResponse>('/api/apply', (prev) => ({
  ok: true,
  items: [data.application, ...(prev?.items ?? [])]
}), { revalidate: false });

if (data.balance) {
  await mutate('/api/apply?view=balance', { ok: true, balance: data.balance }, { revalidate: false });
}
```

### 5) Auto-refresh **history**

Already enabled on the Balance page (`refreshInterval: 15000`).
Change the interval in `balance/page.tsx` to suit.

### 6) Center balance tiles & make them equal width

See **Styling & UX** snippet (flex + `flex-1`).

### 7) Move History back to its own page (if needed)

* Restore `src/app/history/page.tsx` using the same card layout.
* Update `NavBar.tsx` tabs to point `/history`.

### 8) Deploy

* **Vercel**: Push the repo; Vercel auto-detects Next.js.
  Set env vars in Vercel dashboard (same names as `.env.local`).
* **Node server**:

  ```bash
  npm run build
  npm run start
  ```

---

## Troubleshooting (Windows, UTF-8, Tailwind v4)

### File encoding (mojibake “Ã¢…”)

If you see weird characters:

* Save files as **UTF-8 (without BOM)**.
  In **Visual Studio**: File → Save As → ▼ (arrow) → *Save with Encoding…* → **Unicode (UTF-8 without signature) – 65001**.

### Tailwind v4 postcss error

If you see: “use `@tailwindcss/postcss`”:

* Ensure `devDependencies` include `@tailwindcss/postcss` and `postcss.config.mjs` uses it:

```js
// postcss.config.mjs
export default { plugins: { '@tailwindcss/postcss': {} } };
```

### Turbopack cache glitches

If hot reload breaks:

```
rm -rf .next
npm run dev
```

---

### Appendix: Design snapshot

The app is designed as a **mobile-first**, bottom-tab PWA. Primary pages:

* **Apply**: validated form with weekend-aware working day count.
* **Applied**: current applications (newest first).
* **Balance**: 3 tiles (Annual/Medical/Others) + **History** section (auto-refresh).
  Titles and cards have **subtle borders**; bottom nav buttons **fill the bar** evenly.&#x20;

If you forget anything later, come back to this README or ping me with what you’re changing—I can give a small, targeted patch.
