# StudyFlow

Turn lecture notes into an exam study pack: a summary, flashcards and practice
questions. Sign in → upload → pay with Paystack → Gemini builds the pack → reopen it
any time from your library.

The product is a small multi-page app. `/` is the working study workspace, not a
marketing landing page; the about page lives at `/welcome`.

## Stack

- **Frontend:** React 19 + Vite, with a small client-side router for the product
  pages (`/`, `/dashboard`, `/pack/:id`, `/sample`, `/account`, `/welcome`, `/help`)
- **Backend:** Express on Vercel Functions, Paystack verify, Supabase Postgres +
  private Storage, Google Gemini for generation
- **Uploads:** the browser uploads directly to Supabase Storage with a short-lived
  signed URL from the API, so Vercel's request-body limit is not involved
- **Accounts:** Supabase Auth (email + password, email confirmation, password reset)
- **Styles:** the paper-and-ink editorial system with a violet accent (`#5b4bdb`).
  Instrument Serif + Instrument Sans + IBM Plex Mono are self-hosted via `@fontsource`
  (latin subsets), so there are no external font requests. Motion is
  design-engineering led: strong ease-out curves, transform/opacity only,
  interruptible state transitions, and a reduced-motion mode that keeps fades but
  drops movement.

## Run it

```bash
npm install
npm run dev
```

- React app: http://localhost:5173 (proxies `/api` to the server)
- API: http://localhost:3100

### 1. Supabase project

1. Open your project → **SQL Editor** → **New query**.
2. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it.
   This creates the `orders` table (RLS on, no public policies), the `user_id` column
   and index, and the private `studyflow-uploads` bucket. It is safe to re-run.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY` (safe in the browser; RLS
     protects the data)
   - **service_role** secret → `SUPABASE_SERVICE_ROLE_KEY`
     (server-only — never put this in the frontend or a `VITE_*` variable)

### 2. Supabase Auth

1. Go to **Authentication → Providers → Email** and make sure **Email** is enabled.
2. Decide whether **Confirm email** is on. With it on, new users must click the link
   in their inbox before they can sign in. For quick local testing you can turn it
   off; turn it back on for production.
3. Go to **Authentication → URL Configuration** and set:
   - **Site URL:** `http://localhost:5173`
   - **Redirect URLs:**
     - `http://localhost:5173/**`
     - `http://localhost:3100/**`
     - your production URL and `https://your-domain/**` when you deploy

   Email confirmation links redirect to the site root. Password-reset links redirect
   to `/?reset=1`; Supabase's recovery event opens the new-password dialog. Both
   must be allowlisted, or Supabase will fall back to the Site URL.
4. For production, connect custom SMTP under **Authentication → SMTP Settings**.
   Supabase's built-in email service is rate-limited and intended for testing.

Users can sign up, confirm their email, sign in, reset their password from the
sign-in dialog or account page, and sign out from the account page or mobile menu.

### 3. Gemini

Create an API key in [Google AI Studio](https://aistudio.google.com/apikey) and set
`GEMINI_API_KEY`. `GEMINI_MODEL` defaults to `gemini-2.5-flash`; change it if your key
uses a different model.

### 4. `.env`

```env
PORT=3100

PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_BUCKET=studyflow-uploads

# Browser auth. The anon key is public by design.
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...

GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash

PRICE_KOBO=100000
```

`PRICE_KOBO` is the single source of truth for the price — the checkout card and the
Paystack charge both read it. `100000` = ₦1,000.

Vite only exposes variables prefixed with `VITE_` to the browser. If the
`VITE_SUPABASE_*` values are missing, the app still runs but the sign-in dialog
explains that accounts are not configured and checkout stays blocked.

## Pages

| Route | What it does |
| --- | --- |
| `/` | Workspace: choose a file, sign in at checkout, pay, and start generation. Shows recent packs and a sample link. |
| `/dashboard` | The signed-in library. Lists every pack with status, date, reference and amount; active packs update automatically. |
| `/pack/:id` | Private pack page. Handles signed-out, loading, pending, processing, failed and missing states, then opens the summary / flashcards / practice workspace. |
| `/sample` | A complete example pack, available without an account. |
| `/account` | Identity, member-since date, password-reset link, quick links and sign out. |
| `/welcome` | About StudyFlow: the problem, the method and the offer. |
| `/help` | FAQ, common fixes and links to the sample and account. |
| anything else | A styled 404 that keeps the user inside the app. |

Legacy links are redirected in `src/main.jsx`: `/?order=<id>` opens `/pack/<id>`,
`#study/sample` opens `/sample`, and `#study/result` opens `/dashboard`.

## How an order flows

1. The buyer must be signed in. The workspace sign-in button, account shortcut and
   checkout form all open the same auth dialog.
2. `POST /api/uploads` verifies the Supabase access token, validates the file name and
   size, and returns a signed Supabase Storage upload URL for a private object path.
   The browser uploads the file directly to Supabase.
3. `POST /api/orders` verifies ownership and metadata, checks that the uploaded object
   exists and is within the 10 MB limit, then inserts a `pending` order row linked to
   the user's `user_id`. The server uses the account email, not a client-supplied one.
4. The browser opens Paystack with the order reference.
5. `POST /api/orders/:id/verify` checks ownership and the transaction with Paystack's
   API. Only a successful `pending → paid` update starts the job, so a double verify
   cannot run twice.
6. The server downloads the file, extracts text (unpdf / mammoth / UTF-8), sends
   it to Gemini, and saves the JSON result as `ready`. On Vercel this work is kept
   alive with `waitUntil`; locally it runs in the background process.
7. The source upload is deleted after a successful generation. Failed jobs keep
   their file (private) and their status is `failed`.
8. The pack page polls `GET /api/orders/:id` until `ready` or `failed`; the dashboard
   polls its own list while any pack is active.

All order reads and verifies require a valid access token and match the order's
`user_id`; another signed-in user gets a 404. The library list comes from
`GET /api/me/orders`.

## Checkout states

`idle → uploading → paying → verifying → processing → ready`, plus `cancelled`,
`timeout` and `failed`.

The workspace keeps the last order id in `localStorage` so an interrupted checkout
can be checked again with **Check saved order**. Normal reopening is by the pack URL
or from **My packs**, not by restoring a previous checkout on the workspace.

## Production

```bash
npm run build
npm start
```

The Vite build goes to `public/`. Locally, Express serves it and falls back to
`index.html` for every non-`/api` route. On Vercel, `public/**` is served from the CDN
and `vercel.json` handles the same SPA fallback.

### Vercel

1. Import the repository at <https://vercel.com/new>. `vercel.json` selects the
   Express preset and the `npm run build` build command.
2. Add every variable from `.env` in **Project Settings → Environment Variables**.
   The two `VITE_SUPABASE_*` values must exist at **build** time; the rest are
   server-side runtime values.
3. Set the Supabase **Site URL** and **Redirect URLs** to the Vercel production domain
   (and preview domains if you use them).
4. Use live Paystack keys and add the Vercel domain to the Paystack dashboard.
5. `vercel.json` sets the API function's `maxDuration` to 300 seconds (Vercel's
   Hobby maximum). Generation is kept alive with `waitUntil`; raise the limit if
   you need longer, or move long work to a queue or Supabase Edge Function.
6. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side. It is never exposed through a
   `VITE_*` variable.

Uploads go from the browser directly to Supabase Storage, so they are not limited by
Vercel's 4.5 MB function request size. Add a Paystack webhook as a second path to
`paid` when you want payments to survive a closed browser tab.

If you deploy somewhere other than Vercel, `npm run build && npm start` still works
on any Node host. A purely static host is not enough because the API and generation
run in Express.

## Structure

```
server.js               Express app, local server, Vercel export, background jobs
vercel.json             Vercel build, function duration, SPA fallback
lib/
  auth.js               bearer-token middleware (verifies Supabase sessions)
  supabase.js           server-only Postgres + Storage + signed upload URLs
  extract.js            PDF / DOCX / TXT → cleaned text (60k char cap)
  study-pack.js         Gemini call, JSON schema, retry, result normalisation
supabase/schema.sql     orders table, RLS, user_id index, private storage bucket
static/                 source files copied into the Vite build (robots.txt)
src/
  App.jsx               route switch, page titles, focus + scroll handling
  main.jsx              AuthProvider, legacy URL redirects
  pages/
    WorkspacePage.jsx   upload, checkout, recent packs
    DashboardPage.jsx   library, status cards, polling
    PackPage.jsx        private pack states and polling
    SamplePage.jsx      sample StudyWorkspace
    AccountPage.jsx     signed-in and guest account views
    WelcomePage.jsx     about page
    HelpPage.jsx        FAQ page
    NotFoundPage.jsx    404
  components/
    app/AppShell.jsx    header, mobile menu, footer, bottom navigation
    AuthModal.jsx       sign in / sign up / reset / new password
    UploadCheckout.jsx  upload card, validation, checkout feedback
    StudyWorkspace.jsx  summary, flashcards, practice, print
    SamplePreview.jsx   sample preview used by the about page
    Icon.jsx, Logo.jsx, ErrorBoundary.jsx
  hooks/useCheckout.js checkout state machine, Paystack, verification, polling
  lib/                  router, API client, auth client, config, motion,
                        Paystack loader, validation, storage, formatting, sample pack
  styles/               tokens, legacy design system, app shell + product surfaces
reference-legacy/        the original HTML/CSS/vanilla JS for comparison
```

## Troubleshooting

- **Dashboard says it could not load packs, and the server logs
  `Could not find the table 'public.orders'`:** run `supabase/schema.sql` in the
  Supabase SQL editor.
- **“Email address … is invalid” on sign-up:** Supabase rejects reserved domains such
  as `example.com`. Use a real inbox you can open.
- **“Too many attempts” on sign-up or password reset:** the built-in Supabase email
  service is heavily rate-limited. Configure custom SMTP under
  **Authentication → SMTP Settings**.
- **The Paystack window will not load:** the keys in `.env` are still the
  `pk_test_xxxxxxxx` / `sk_test_xxxxxxxx` placeholders. Replace both.
- **An order turns `failed` right after payment:** `GEMINI_API_KEY` is missing or
  invalid. Check the server logs; the order keeps its upload so it can be retried.
- **The auth dialog says sign-in is not set up:** add `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`, then restart Vite (the dev server must rebuild with the
  new values).

## Notes

- The `orders` table has RLS enabled with no policies. Only the service role key
  can read or write it, which is why that key must stay on the server. The browser
  uses the anon key for Supabase Auth and for uploads authorized by short-lived
  signed URLs.
- Checkout requires an account. This is deliberate: the account is what makes
  purchased packs retrievable later.
- Uploads are private; the app never exposes a public file URL. The browser sends
  the file straight to Storage, then the API confirms the object exists before it
  creates the order.
- Scanned PDFs with no text layer return a clear "could not read enough text" error
  instead of an empty pack.
- `npm run dev` starts both processes; `npm start` runs the API and serves the built
  frontend on port 3100.
