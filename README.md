# StudyFlow

Turn lecture notes into an exam study pack: a summary, revision notes,
flashcards and practice questions. Sign in → upload → Gemini builds the pack →
reopen it any time from your library.

StudyFlow is freemium:

- **Free** — one document upload and one full study pack (summary + 5 practice
  questions).
- **Premium** — ₦5,000 for 30 days, with up to 10 document uploads, detailed
  summaries, revision notes, flashcards, and 12 practice questions with
  explanations.

Premium is a one-off payment through Paystack. It does not renew automatically,
and it expires back to Free after 30 days. Packs you have already generated stay
in your library.

The product is a small multi-page app. `/` is the public welcome/landing page;
the working study workspace lives at `/new`.

## Stack

- **Frontend:** React 19 + Vite, with a small client-side router for the product
  pages (`/`, `/new`, `/dashboard`, `/pack/:id`, `/sample`, `/account`, `/welcome`, `/help`)
- **Backend:** Express on Vercel Functions, Paystack subscription verification,
  Supabase Postgres + private Storage, Google Gemini for generation
- **Uploads:** the browser uploads directly to Supabase Storage with a short-lived
  signed URL from the API, so Vercel's request-body limit is not involved
- **Accounts:** Supabase Auth (email + password, email confirmation, password reset)
- **Styles:** the paper-and-ink editorial system with a violet accent (`#5b4bdb`).
  Instrument Serif + Instrument Sans + IBM Plex Mono are self-hosted via `@fontsource`
  (latin subsets), so there are no external font requests.

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
   This creates the `orders` table, the `subscriptions` table, RLS on both, the
   `user_id` and `plan` columns, indexes, and the private `studyflow-uploads`
   bucket. It is safe to re-run.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY` (safe in the browser; RLS
     protects the data)
   - **service_role** secret → `SUPABASE_SERVICE_ROLE_KEY`
     (server-only — never put this in the frontend or a `VITE_*` variable)

If you already ran an earlier version of the schema, re-run it. Existing
pay-per-pack rows are marked `plan = 'legacy'` and do not count against the new
Free or Premium upload allowances.

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

Every new account starts on the Free plan automatically. There is no separate
sign-up step or card required.

### 3. Gemini

Create an API key in [Google AI Studio](https://aistudio.google.com/apikey) and set
`GEMINI_API_KEY`. `GEMINI_MODEL` defaults to `gemini-2.5-flash`; change it if your key
uses a different model.

Free and Premium packs use different prompts and response schemas in
`lib/study-pack.js`. Free packs contain a summary and 5 MCQs. Premium packs contain
a longer summary, 3–5 revision sections, 8–12 flashcards, and 12 MCQs with
explanations.

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

# Premium price, in kobo (500000 = ₦5,000 for 30 days)
PRICE_KOBO=500000
```

`PRICE_KOBO` is the source of truth for the amount charged and the price shown in
the workspace and account plan cards. `500000` = ₦5,000. The landing page and FAQ
repeat the price as marketing copy; update them too if it changes.

Vite exposes variables prefixed with `VITE_` at build time. The server also exposes
the public Supabase URL and anon key through `/api/config`, so a deployment can
provide them at runtime without embedding them in the browser bundle. If both
sources are missing, the app still runs but sign-in is disabled and upgrades stay
blocked.

## Pages

| Route | What it does |
| --- | --- |
| `/` | Welcome/landing page: the problem, the method, Free vs Premium pricing and the FAQ. Primary calls to action open `/new` or `/sample`. |
| `/new` | Workspace: choose a file, see your plan and upload allowance, create a pack, and see recent packs. |
| `/dashboard` | The signed-in library. Lists every pack with status, date, reference and plan; active packs update automatically. |
| `/pack/:id` | Private pack page. Handles signed-out, loading, processing, failed and missing states, then opens the summary / flashcards / practice workspace. Free packs simply omit the flashcards tab. |
| `/sample` | A complete example pack, available without an account. |
| `/account` | Plan card with upload usage and upgrade button, identity, member-since date, password-reset link, quick links and sign out. |
| `/welcome` | Legacy alias for the welcome/landing page; primary navigation uses `/`. |
| `/help` | Plan, billing and upload FAQ, common fixes, and links to the sample and account. |
| anything else | A styled 404 that keeps the user inside the app. |

Legacy links are redirected in `src/main.jsx`: `/?order=<id>` opens `/pack/<id>`,
`#upload` opens `/new`, `#study/sample` opens `/sample`, and `#study/result` opens
`/dashboard`.

## Plans and limits

| | Free | Premium |
| --- | --- | --- |
| Price | ₦0 | ₦5,000 / 30 days |
| Uploads | 1 per account | 10 per active 30-day period |
| Summary | Focused | Detailed, with revision notes |
| Flashcards | — | 8–12 per pack |
| Practice questions | 5 | 12, with explanations |
| Existing packs | Kept | Kept |

- Entitlements are computed from `subscriptions.expires_at`, so expiry needs no
  cron job. A user with no active subscription is on Free.
- Free usage counts every pack generated under `plan = 'free'` or `'premium'`.
  Legacy pay-per-pack orders are excluded, so existing customers still get a free
  pack.
- Premium usage counts packs generated with `plan = 'premium'` since the current
  subscription started.
- An upload counts when the pack is created. A failed generation still consumes
  the upload, which is stated in the help copy.
- Upgrading while Premium is active is blocked with `409 ALREADY_PREMIUM`. After
  expiry, the user can buy another 30-day period.

## How a study pack flows

1. The user must be signed in. The workspace sign-in button, account shortcut and
   checkout form all open the same auth dialog.
2. `POST /api/uploads` verifies the Supabase access token, validates the file name
   and size, checks the user's entitlement, and returns a signed Supabase Storage
   upload URL for a private object path. The browser uploads the file directly to
   Supabase.
3. `POST /api/orders` verifies ownership and metadata, checks the uploaded object
   exists and is within the 10 MB limit, checks the entitlement again, then inserts
   an order directly as `processing` with `amount = 0` and the current plan.
4. The server downloads the file, extracts text (unpdf / mammoth / UTF-8), sends
   it to Gemini with the plan-specific prompt, and saves the JSON result as
   `ready`. On Vercel this work is kept alive with `waitUntil`; locally it runs in
   the background process.
5. The source upload is deleted after a successful generation. Failed jobs keep
   their file (private) and their status is `failed`.
6. The pack page polls `GET /api/orders/:id` until `ready` or `failed`; the
   dashboard polls its own list while any pack is active.

All order reads require a valid access token and match the order's `user_id`;
another signed-in user gets a 404. The library list comes from
`GET /api/me/orders`.

## Upgrades

1. The signed-in user chooses **Upgrade** in the workspace or account page.
2. `POST /api/subscriptions` checks there is no active Premium period and creates a
   `pending` subscription row with a unique reference and the configured price.
3. The browser opens Paystack with that reference.
4. `POST /api/subscriptions/:id/verify` checks the transaction with Paystack. Only
   the first successful `pending → active` update wins, then `started_at` and
   `expires_at` are set for 30 days.
5. `GET /api/me/subscription` returns the derived plan, upload counts, remaining
   allowance and Premium end date.

There is no order-level Paystack verification any more. The Free plan needs no
payment, and Premium is the only thing Paystack is used for.

## Checkout states

`idle → uploading → processing → ready`, plus `timeout`, `limit` and `failed`.

The workspace keeps the last order id in `localStorage` so an interrupted upload
can be checked again with **Check saved pack**. Normal reopening is by the pack URL
or from **My packs**.

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
   The public `VITE_SUPABASE_*` values are used at build time when present and are
   also exposed through `/api/config` at runtime; the rest are server-side values.
   **Set `PRICE_KOBO=500000`** for the ₦5,000 Premium price, then redeploy.
3. Set the Supabase **Site URL** and **Redirect URLs** to the Vercel production domain
   (and preview domains if you use them).
4. Use live Paystack keys and add the Vercel domain to the Paystack dashboard.
5. `vercel.json` sets the API function's `maxDuration` to 300 seconds (Vercel's
   Hobby maximum). Generation is kept alive with `waitUntil`; raise the limit if
   you need longer, or move long work to a queue or Supabase Edge Function.
6. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side. It is never exposed through a
   `VITE_*` variable.

Uploads go from the browser directly to Supabase Storage, so they are not limited by
Vercel's 4.5 MB function request size. If you later add a Paystack webhook, use it
to activate a subscription when the browser closes before verification; the current
flow verifies from the client and retries when the Paystack window closes.

If you deploy somewhere other than Vercel, `npm run build && npm start` still works
on any Node host. A purely static host is not enough because the API and generation
run in Express.

## Structure

```
server.js               Express app, local server, Vercel export, background jobs
vercel.json             Vercel build, function duration, SPA fallback
lib/
  auth.js               bearer-token middleware (verifies Supabase sessions)
  entitlements.js       Free/Premium limits and derived plan state
  supabase.js           server-only Postgres + Storage + signed upload URLs
  extract.js            PDF / DOCX / TXT → cleaned text (60k char cap)
  study-pack.js         plan-aware Gemini schema, prompt, retry and normalisation
supabase/schema.sql     orders + subscriptions tables, RLS, indexes, private bucket
static/                 source files copied into the Vite build (robots.txt)
src/
  App.jsx               route switch, page titles, focus + scroll handling
  main.jsx              AuthProvider, legacy URL redirects
  pages/
    WorkspacePage.jsx   upload, plan card, recent packs
    DashboardPage.jsx   library, plan strip, status cards, polling
    PackPage.jsx        private pack states and polling
    SamplePage.jsx      sample StudyWorkspace
    AccountPage.jsx     plan card, signed-in and guest account views
    WelcomePage.jsx     landing page, pricing section
    HelpPage.jsx        FAQ page
    NotFoundPage.jsx    404
  components/
    app/AppShell.jsx    header, mobile menu, footer, bottom navigation
    AuthModal.jsx       sign in / sign up / reset / new password
    PlanStatus.jsx      plan badge, usage meter, upgrade CTA
    UploadCheckout.jsx  upload card, plan allowance, generation feedback
    StudyWorkspace.jsx  summary, optional flashcards, practice, print
    SamplePreview.jsx   sample preview used by the about page
    Icon.jsx, Logo.jsx, ErrorBoundary.jsx
  hooks/
    useCheckout.js      upload/generation state machine and polling
    useSubscription.js  entitlement fetch, Paystack upgrade, verification
  lib/                  router, API client, auth client, config, motion,
                        Paystack loader, validation, storage, formatting, sample pack
  styles/               tokens, legacy design system, app shell + product surfaces
reference-legacy/        the original HTML/CSS/vanilla JS for comparison
```

## Troubleshooting

- **Dashboard says it could not load packs, and the server logs
  `Could not find the table 'public.orders'`:** run `supabase/schema.sql` in the
  Supabase SQL editor.
- **`Could not find the table 'public.subscriptions'`:** re-run
  `supabase/schema.sql`; the new table is created by the same file.
- **“Email address … is invalid” on sign-up:** Supabase rejects reserved domains such
  as `example.com`. Use a real inbox you can open.
- **“Too many attempts” on sign-up or password reset:** the built-in Supabase email
  service is heavily rate-limited. Configure custom SMTP under
  **Authentication → SMTP Settings**.
- **The Paystack window will not load:** the keys in `.env` are still the
  `pk_test_xxxxxxxx` / `sk_test_xxxxxxxx` placeholders. Replace both.
- **Upgrade says payments are not configured:** `PAYSTACK_PUBLIC_KEY` or
  `PAYSTACK_SECRET_KEY` is missing or still the `pk_test_xxxxxxxx` /
  `sk_test_xxxxxxxx` placeholder.
- **A pack turns `failed` right after upload:** `GEMINI_API_KEY` is missing or
  invalid. Check the server logs; the upload still counts against the plan.
- **The auth dialog says sign-in is not set up:** add `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`. Locally, restart Vite; on Vercel, add them to the
  Production environment and redeploy.

## Notes

- The `orders` and `subscriptions` tables have RLS enabled with no policies. Only
  the service role key can read or write them, which is why that key must stay on
  the server. The browser uses the anon key for Supabase Auth and for uploads
  authorized by short-lived signed URLs.
- Checkout requires an account. This is deliberate: the account is what makes
  packs retrievable later and what ties usage to a plan.
- Uploads are private; the app never exposes a public file URL. The browser sends
  the file straight to Storage, then the API confirms the object exists before it
  creates the order.
- Scanned PDFs with no text layer return a clear "could not read enough text" error
  instead of an empty pack.
- `npm run dev` starts both processes; `npm start` runs the API and serves the built
  frontend on port 3100.
