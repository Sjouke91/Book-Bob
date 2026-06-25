# Book Bob

A Next.js App Router MVP for sharing a camper calendar, requesting bookings, approving trips, and keeping a trip history with reviews and photos.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
   - If you already ran the schema before this fix, run `supabase/fixes/001-camper-creator-select-policy.sql` once.
   - Then run `supabase/fixes/002-strict-return-date-after-pickup.sql` once to require return dates after pickup dates.
3. Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_SECRET_KEY=sb_secret_your_key
BOOK_BOB_SHARED_USER_EMAIL=owner@example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

   - In Vercel, either leave `NEXT_PUBLIC_APP_URL` unset or set it to your deployed `https://` URL. Do not set the production value to localhost, or email links will point back to your machine.
   - `BOOK_BOB_SHARED_USER_EMAIL` is the shared no-login user. It must match an existing profile in Supabase.

4. Optional email delivery:

```bash
RESEND_API_KEY=re_your_key
APP_EMAIL_FROM="Book Bob <bookings@example.com>"
```

Without `RESEND_API_KEY`, booking emails are skipped and logged by the server.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to go straight to the shared camper calendar.
