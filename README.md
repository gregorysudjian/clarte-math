# Northstar Learning Montreal

My personal tutoring website: bilingual (English/French) one-on-one math tutoring from Grade 1 to CEGEP, in Montreal and online. It has a public landing page with a request form, and a private owner dashboard (**HQ**) for requests, clients, lessons, payments, and notes.

Built with Next.js 16 (App Router, React 19). No external database: the dashboard keeps its records in a file on the server.

## Run it

Requires Node.js 22.13+.

```bash
cp .env.example .env.local   # set HQ_PASSWORD at least
npm install
npm run build && npm start   # http://localhost:3000, dashboard at /hq
```

For development with live reload use `npm run dev`. Checks: `npm run lint`, `npm run typecheck`, `npm test`.

## Dashboard data

- Everything the dashboard stores (clients, lessons, payments, notes, website requests) is saved in `data/hq.json`, with the previous version kept in `data/hq.json.bak`. The folder is git-ignored and private.
- **Back it up**: copy the `data/` folder, or use **Export to Excel** in the dashboard.
- The site must run on a machine with a normal disk (your computer, a VPS, or a host with a persistent volume). Serverless hosts such as Vercel can't keep files between requests, so the dashboard can't save there; website requests would still be emailed to you if email is set up.

## Environment variables

Secrets live only in `.env.local` (git-ignored) or your host's settings. See [.env.example](.env.example).

| Variable | Required | Purpose |
| --- | --- | --- |
| `HQ_PASSWORD` | yes | Password for the dashboard at `/hq` |
| `HQ_DATA_DIR` | no | Folder for the data file (default `./data`) |
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical URL for SEO, sitemap, robots |
| `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_PHONE` | no | Shown on the site |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | no | Sends emails through Gmail (preferred) |
| `RESEND_API_KEY`, `BOOKING_FROM_EMAIL` | no | Fallback email provider |
| `BOOKING_TO_EMAIL` | no | Inbox for new-request notifications |

## Project layout

```
app/
  page.tsx               landing page
  landing-copy.tsx       all landing-page text (EN + FR), edit here
  components/            header/footer, booking form, legal pages, icons
  api/booking/route.ts   saves form requests to the HQ and emails a notification
  hq/                    private dashboard
    workspace.tsx        shell: sidebar, top bar, toast, drawer
    views.tsx            Overview, Requests, Clients, Lessons (calendar/list), Payments, Notes
    drawer.tsx           edit forms
    actions.ts           server actions (all check the session)
    export/route.ts      Excel export
lib/
  store.ts               the data file (safe, one-at-a-time writes)
  auth.ts                password check and signed session cookie
  email.ts               Gmail / Resend sending
  site.ts                business name and contact details
proxy.ts                 guards /hq
```

## Security notes

- The dashboard password is never in the code; changing `HQ_PASSWORD` signs out every session.
- Login attempts are rate-limited, and the dashboard is hidden from search engines.
- Never commit `.env.local` or the `data/` folder.
