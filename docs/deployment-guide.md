# Deployment Guide — ORI Financial Operations ERP

**Date:** 2026-05-12
**Version:** 2.0 Rescue Baseline

---

## Prerequisites

- Node.js 20+
- Supabase account with a project
- Cloudflare account (free tier sufficient)
- Domain name (optional, for custom domain)

---

## Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Project Settings → API
3. Set up a database password (used for Supabase CLI and migrations)

### 1.2 Apply the Rescue Baseline Migration
```bash
# Install Supabase CLI
npm install -g supabase

# Login
npx supabase login

# Link to your project
npx supabase link --project-ref <your-project-ref>

# Push migrations
npx supabase db push
```

The canonical migration is `supabase/migrations/20260512170000_ori_rescue_baseline.sql`. It creates the full schema, RLS policies, triggers, RPC functions, default company, starter accounts/treasuries, and auth-user bootstrap.

For an existing Supabase project that already has broken old migrations recorded, `db push` may complain about remote migration history. In that case, open Supabase SQL Editor and run the single canonical migration file once against a staging copy first, then production. Do not re-add the deleted legacy migrations.

### 1.3 Verify Tables
After migrations, verify these tables exist:
- companies, profiles, user_companies
- accounts, transactions, transfers, approvals
- treasuries, treasury_transactions
- financial_partners, partner_ledger_entries
- suppliers, supplier_invoices, supplier_payments
- projects, project_expenses, project_revenues
- product_cost_cards, product_cost_components
- expenses
- journal_entries, journal_entry_lines
- notifications, alert_rules, alert_logs, notification_preferences
- push_subscriptions
- audit_logs, login_history

### 1.4 Enable Realtime
In Supabase Dashboard → Database → Replication, enable replication for:
- `notifications`
- `push_subscriptions`

### 1.5 Push Notification Edge Function
1. Go to Supabase Dashboard → Edge Functions
2. Create a new function named `send-push`
3. Copy code from `supabase/functions/send-push/index.ts`
4. Add environment secrets:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key
   - `VAPID_PUBLIC_KEY` = your VAPID public key
   - `VAPID_PRIVATE_KEY` = your VAPID private key
   - `VAPID_EMAIL` = mailto:your@email.com

### 1.6 Create the Initial User
Create the first user from Supabase Dashboard → Authentication → Users, or through the app sign-up flow if enabled. The rescue migration automatically creates the profile, links the user to the starter company, and makes the first user an owner/admin. No manual `profiles` or `user_companies` SQL is required.

---

## Step 2: Local Development

### 2.1 Clone & Install
```bash
git clone <repo-url>
cd ORI-MINI-ERP
npm install
```

### 2.2 Environment File
Create `.env` from `.env.example`:
```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
VITE_APP_NAME=ORI Finance Pro
VITE_APP_CURRENCY=LYD
VITE_APP_CURRENCY_SYMBOL=د.ل
VITE_APP_DATE_FORMAT=DD/MM/YYYY
VITE_APP_DECIMAL_PLACES=3
VITE_APPROVAL_THRESHOLD_HIGH=10000
VITE_APPROVAL_THRESHOLD_MEDIUM=5000
```

### 2.3 Run Development Server
```bash
npm run dev
```
App runs at http://localhost:5173

### 2.4 Generate VAPID Keys
```bash
npx web-push generate-vapid-keys
```
Add public key to `.env`, private key to Supabase Edge Function secrets.

---

## Step 3: Cloudflare Pages Deployment

### 3.1 Connect to Cloudflare
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select your account → Workers & Pages → Create application
3. Connect to GitHub repo
4. Select your repo

### 3.2 Configure Build
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/`

### 3.3 Add Environment Variables
In Cloudflare Pages → Settings → Environment Variables:
```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key
VITE_VAPID_PUBLIC_KEY = your-vapid-public-key
VITE_APP_NAME = ORI Financial Operations ERP
VITE_APP_CURRENCY = LYD
VITE_APP_CURRENCY_SYMBOL = د.ل
VITE_APP_DATE_FORMAT = DD/MM/YYYY
VITE_APP_DECIMAL_PLACES = 3
VITE_APPROVAL_THRESHOLD_HIGH = 10000
VITE_APPROVAL_THRESHOLD_MEDIUM = 5000
```

### 3.4 Custom Domain (Optional)
1. Pages → Custom Domains → Add custom domain
2. Add CNAME record in your DNS provider
3. Enable HTTPS (Cloudflare handles this automatically)

### 3.5 Deployment
Every push to `main` triggers an automatic deployment. Or manually trigger from Cloudflare dashboard.

---

## Step 4: Verify Deployment

### 4.1 Smoke Test
1. Open your deployed URL
2. Log in with created credentials
3. Navigate: Dashboard → Treasuries → Create Treasury
4. Create treasury → verify balance = opening balance
5. Log out

### 4.2 PWA Test
1. Open app on mobile
2. Look for "Add to Home Screen" option
3. Install → verify icon appears
4. Open offline → verify cached content loads

### 4.3 Push Notification Test
1. Log in → allow push notifications
2. Trigger an alert (e.g., set treasury below threshold)
3. Verify push notification received

---

## Step 5: Post-Deployment Checklist

- [ ] All migrations applied
- [ ] Initial user + company created
- [ ] Environment variables set in Cloudflare
- [ ] Edge Function secrets set in Supabase
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS enforced
- [ ] CSP headers configured (optional but recommended)
- [ ] Push notifications working
- [ ] PWA installable
- [ ] Offline mode functional

---

## Troubleshooting Deployments

### Build Fails
- Check Node.js version (18+)
- Run `npm run build` locally first
- Check all env vars are set

### Supabase Connection Fails
- Verify project URL and anon key correct
- Check RLS policies not blocking
- Check `get_user_current_company()` RPC exists

### Push Notifications Not Working
- Verify VAPID keys match (public in app, private in Edge Function)
- Check browser supports Web Push (requires HTTPS)
- Check `push_subscriptions` table has rows

### SPA Routing 404
- Ensure `functions/[[path]].ts` is deployed
- Check `_redirects` file is in `public/` directory and gets copied to `dist/`

---

*Last updated: 2026-05-12*
