# Security Guide — ORI Financial Operations ERP

**Date:** 2026-05-10
**Version:** 1.0

---

## Overview

ORI ERP implements security at multiple layers: authentication, database isolation (RLS), API authorization, and audit logging.

---

## 1. Authentication

### Supabase Auth
- Email + password authentication (no social logins configured)
- Tokens stored in localStorage (encrypted at rest by browser)
- Auto-refresh of access tokens enabled
- Session detection in URL (OAuth callbacks)

### Demo Login
- **Removed.** The previous hardcoded `DEMO_USERS` dictionary was removed in Phase 1. All logins require valid Supabase credentials.

### Session Management
- Session expiry → graceful redirect to login
- `checkAuth()` called on app load to restore session
- Company context restored from `user_companies.is_current`

---

## 2. Row Level Security (RLS)

### Design Principle
Every table that contains company-scoped data enforces `company_id = get_user_current_company()` via RLS policies. There are no "Allow all" policies.

### Key RPCs for Security
```sql
get_user_current_company()  -- Returns current user's active company UUID
user_has_company_access(id) -- Checks user belongs to given company
is_company_admin()          -- Checks current role is owner or admin
```

### Policy Pattern
```sql
-- SELECT: company match OR created_by = user OR super_admin bypass
CREATE POLICY "table_select" ON table_name FOR SELECT TO authenticated
USING (
  company_id = get_user_current_company()
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- INSERT: company match + appropriate role
CREATE POLICY "table_insert" ON table_name FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'accountant'))
);
```

### Tables with RLS
All company-scoped tables: accounts, transactions, transfers, approvals, projects, journal_entries, journal_entry_lines, contacts, financial_partners, partner_ledger_entries, suppliers, supplier_invoices, supplier_payments, product_cost_cards, product_cost_components, expenses, treasuries, treasury_transactions, audit_logs.

---

## 3. Secrets Management

### Environment Variables (Client-Side)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (safe for client-side)
- `VITE_VAPID_PUBLIC_KEY` — Web Push public key
- `VITE_APP_NAME`, `VITE_APP_CURRENCY`, etc. — app config

### Supabase Edge Function Secrets (Server-Side)
These MUST be set in Supabase Dashboard (not in client-side code):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`

### What NOT to Commit
- `.env` files (add to `.gitignore`)
- Private keys
- Service role keys

---

## 4. Audit Logging

### Trigger
`audit_log_changes()` fires on INSERT/UPDATE/DELETE for all tracked tables. Captures:
- `user_id` — from `auth.uid()` or fallback
- `action` — INSERT/UPDATE/DELETE
- `entity_type` — table name
- `entity_id` — row ID
- `old_value` / `new_value` — JSON diff
- `company_id` — from row or RPC

### Access Control
Audit logs readable only by company admins (`owner`, `admin` roles) or `super_admin`. Insert access available to all authenticated users (via triggers).

### IP Address
`login_history` captures device info. Full IP tracking would require a Supabase Edge Function middleware layer.

---

## 5. PWA Security

### Service Worker
- SW file: `src/sw.ts` (injectManifest strategy via vite-plugin-pwa)
- Only caches app shell and static assets
- No sensitive data stored in cache
- Offline data stored in IndexedDB (Dexie)

### Web Push
- VAPID authentication required (public + private key pair)
- Push subscriptions stored in `push_subscriptions` table
- Users can only manage their own subscriptions (`user_id = auth.uid()`)

---

## 6. Input Validation

### Client-Side
- Form validation via React Hook Form + Zod schemas
- `debounce` utility prevents rate-amplification
- Email/phone validation in `utils.ts`

### Server-Side
- PostgreSQL CHECK constraints on enum fields (status, type, etc.)
- RPC functions use `RAISE EXCEPTION` for invalid data
- Balanced journal entry validation (debits must equal credits)

---

## 7. CORS & Network

### Cloudflare Pages
- Edge-deployed CDN for all static assets
- HTTPS enforced
- Content Security Policy should be added as a Cloudflare Pages header:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co
  ```

### Supabase
- Anon key in client code — safe because RLS enforces data access
- Service role key — NEVER exposed to client, only in Edge Functions

---

## 8. Recommended Hardening

1. **CSP Headers** — add via Cloudflare Pages dashboard or `_headers` file
2. **Rate Limiting** — add via Cloudflare (Tiered Cache Plans) or Supabase Edge Function middleware
3. **Push Notification Auth** — ensure VAPID keys rotated periodically
4. **Audit Log Retention** — set up automated cleanup for old audit logs (keep 1-2 years)
5. **IP-based Restrictions** — optionally restrict Supabase project to specific IPs via Supabase network settings
6. **2FA** — enable in Supabase Auth dashboard (Auth → Providers → Confirm)
7. **Database Backups** — configure Supabase point-in-time recovery

---

*Last updated: 2026-05-10*
