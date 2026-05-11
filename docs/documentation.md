# ORI Financial Operations ERP — Documentation

**Version:** 1.0
**Date:** 2026-05-10
**Stack:** React 19 + TypeScript + Vite + TailwindCSS + Shadcn UI + Supabase + Cloudflare Pages

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Core Modules](#5-core-modules)
6. [API Reference](#6-api-reference)
7. [Deployment](#7-deployment)
8. [Development](#8-development)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. System Overview

ORI Financial Operations ERP is a production-ready financial management system supporting:

- **Multi-currency treasury management** (LYD, USD, TRY, CNY, EUR)
- **Double-entry accounting** with automatic journal entry generation
- **Financial partners** with dynamic ledger and balance tracking
- **Supplier management** with invoice and payment tracking
- **Project financial containers** with budget tracking and profitability
- **Product cost cards** with material/labor/accessory breakdown
- **Expense management** with approval workflows
- **Real-time notifications** with configurable alert rules
- **PWA** with offline support and push notifications
- **Multi-company** isolation via RLS

---

## 2. Architecture

```
src/
├── app/           # Router + main App component
├── components/    # UI components
│   ├── ui/        # Shadcn-style primitives
│   └── */         # Domain components (treasury/, partner/, etc.)
├── hooks/         # Custom React hooks
├── lib/           # Utilities, Supabase client, DB, constants
├── pages/         # Route-level page components
│   └── */         # Domain pages (dashboard/, treasury/, etc.)
├── stores/       # Zustand state management
├── styles/       # Global CSS + design tokens
└── sw.ts          # Service worker
```

### State Management
- **Zustand** stores per domain (authStore, treasuryStore, partnerStore, etc.)
- **IndexedDB via Dexie** for offline-first data persistence
- **Sync queue** for offline mutation replay when back online

### API Layer
- **Supabase JS client** for all database operations
- **Row Level Security (RLS)** for data isolation
- **RPC functions** for complex operations (transfers, journal entries, accounting reports)

---

## 3. Database Schema

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `companies` | Multi-company root | id, name, currency, country |
| `profiles` | User profiles | id, email, role, default_company_id |
| `user_companies` | User-company membership | user_id, company_id, role, is_current |
| `accounts` | Simple accounts (legacy) | id, name, type, balance, company_id |
| `treasuries` | Multi-currency treasury | id, currency, current_balance, company_id |
| `treasury_transactions` | Treasury movements | id, treasury_id, amount, currency, type |
| `financial_partners` | Partner master | id, code, balance, company_id |
| `partner_ledger_entries` | Partner ledger | id, partner_id, entry_type, amount, balance_after |
| `suppliers` | Supplier master | id, code, current_balance, company_id |
| `supplier_invoices` | Supplier invoices | id, supplier_id, total_amount, status |
| `supplier_payments` | Supplier payments | id, supplier_id, invoice_id, amount |
| `projects` | Projects | id, name, budget, status, company_id |
| `project_expenses` | Project expenses | id, project_id, category, amount |
| `project_revenues` | Project revenues | id, project_id, type, amount |
| `product_cost_cards` | Cost cards | id, total_cost, selling_price |
| `product_cost_components` | Cost components | id, cost_card_id, component_type, total_cost |
| `expenses` | Company expenses | id, category, amount, status, company_id |
| `journal_entries` | Double-entry journal | id, entry_date, description, company_id |
| `journal_entry_lines` | Journal lines | id, journal_entry_id, account_id, debit, credit |
| `notifications` | User notifications | id, user_id, type, is_read |
| `alert_rules` | Alert configurations | id, rule_type, threshold, company_id |
| `alert_logs` | Alert history | id, alert_rule_id, severity |
| `audit_logs` | Audit trail | id, user_id, action, entity_type, company_id |
| `approvals` | Approval requests | id, status, requested_by, approved_by |
| `push_subscriptions` | Web push subscriptions | id, user_id, endpoint, p256dh, auth |

### Key RPC Functions

| RPC | Purpose |
|-----|---------|
| `get_user_current_company()` | Returns current user's company UUID |
| `get_user_companies()` | List companies for current user |
| `make_current_company(id)` | Switch active company context |
| `create_treasury_journal_entry(...)` | Create balanced JE for treasury ops |
| `create_partner_journal_entry(...)` | Create balanced JE for partner ops |
| `approve_transaction(id)` | Approve a pending transaction |
| `approve_transfer(id)` | Approve a pending transfer |
| `create_expense(...)` | Create expense with approval check |
| `approve_expense(id)` | Approve expense and create JE |
| `get_trial_balance(...)` | Trial balance report |
| `get_general_journal(...)` | General journal report |
| `get_income_statement(...)` | P&L report |
| `get_balance_sheet(...)` | Balance sheet |
| `check_treasury_balance_alerts()` | Check and fire treasury alerts |
| `check_supplier_overdue_alerts()` | Check and fire supplier alerts |
| `check_project_budget_alerts()` | Check and fire project budget alerts |

---

## 4. Authentication & Authorization

### Login Flow
1. User enters email + password
2. Supabase Auth `signInWithPassword()`
3. Profile loaded → role and company context loaded
4. `get_user_companies()` RPC fetches company list
5. Current company set → all queries scoped to `get_user_current_company()`

### Roles
- `super_admin` — full system access (rare, cross-company)
- `owner` — company-level full access
- `admin` — company-level management
- `accountant` — accounting operations
- `treasury` — treasury operations
- `operations` — operational data entry
- `viewer` — read-only

### Company Isolation
All tables have `company_id`. Every query uses `get_user_current_company()` via RLS policies. Users cannot access data from companies they don't belong to.

---

## 5. Core Modules

### 5.1 Treasury
Multi-currency treasury management. Treasuries hold balances in a single currency. Cross-currency transfers apply exchange rates and create exchange difference entries.

### 5.2 Partners
Financial partners are external entities (manufacturers, vendors) with dynamic balances. Positive balance = partner owes us. Negative = we owe partner. Every operation creates a ledger entry with running balance.

### 5.3 Suppliers
Supplier invoices with due dates, payment tracking, and reconciliation. Payments can be partial. Balance = sum of unpaid invoices.

### 5.4 Projects
Projects are financial containers with budget tracking. Expenses and revenues flow through the project. Profitability = revenues - expenses.

### 5.5 Accounting
Double-entry system. All monetary operations create balanced journal entries (debits = credits). Reports generated from `journal_entries` + `journal_entry_lines`.

### 5.6 Expenses
Company-wide expenses with 17 categories. Approval workflow based on amount thresholds. Approved/auto-approved expenses create journal entries.

### 5.7 Notifications
Real-time notifications via Supabase Realtime. Configurable alert rules fire on treasury balance, partner outstanding, supplier overdue, and project budget thresholds. Push via Supabase Edge Function.

---

## 6. API Reference

### Environment Variables

```bash
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

### Key Client Methods

```typescript
// Supabase client (src/lib/supabase.ts)
export const supabase: SupabaseClient
export const isSupabaseConfigured(): boolean

// All stores follow: fetchX, createX, updateX, deleteX pattern
// See individual store files under src/stores/
```

---

## 7. Deployment

### Cloudflare Pages (Recommended)

1. Connect GitHub repo to Cloudflare Pages
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Add environment variables in Cloudflare dashboard
5. Deploy — `functions/[[path]].ts` handles SPA routing

### Local Development

```bash
npm install
npm run dev
```

### Supabase Edge Function (Push Notifications)

Set in Supabase Dashboard → Edge Functions → send-push:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL` (mailto: format)

---

## 8. Development

### Database Migrations
All migrations are numbered sequentially under `supabase/migrations/`. Apply via:
```bash
supabase db push
# or apply directly in Supabase SQL editor
```

### Adding a New Module
1. Create migration (new `*.sql` file with tables + RLS policies + RPCs)
2. Add types to `src/types/index.ts`
3. Add DB types to `src/lib/supabase.ts`
4. Create Zustand store in `src/stores/`
5. Create pages in `src/pages/`
6. Add routes to `src/app/Router.tsx`
7. Add nav items to `src/components/layout/BottomNav.tsx`
8. Add constants to `src/lib/constants.ts`

### Service Worker
- File: `src/sw.ts` (Workbox injectManifest strategy)
- Builds with app via `vite-plugin-pwa`
- Runtime caching: Google Fonts, Supabase API, images
- Push notifications via Web Push API

---

## 9. Troubleshooting

### "Supabase غير مُعد" (Supabase not configured)
- Check `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Run `npm run dev` — env vars loaded at startup

### Login fails silently
- Check Supabase Auth is enabled in dashboard
- Check RLS policies aren't blocking profile read
- Check `profiles` table has row for user

### RLS access denied
- Ensure user belongs to a company via `user_companies`
- Ensure `get_user_current_company()` RPC exists and works
- Check user's `is_current = true` in `user_companies`

### Offline mode not working
- Check service worker registered (DevTools → Application → Service Workers)
- Check IndexedDB has data (DevTools → Application → IndexedDB)
- Run `npm run build` — SW only works in production

### Push notifications not working
- Check VAPID keys set correctly (both public in app env + private in Edge Function)
- Check `push_subscriptions` table has rows for user
- Check browser supports Web Push (HTTPS required)

### Journal entries not balanced
- All JE creation goes through RPC functions that validate `SUM(debit) = SUM(credit)`
- Check database trigger `ensure_journal_balanced` exists

---

*Last updated: 2026-05-10*
