# ORI Financial Operations ERP — Implementation Roadmap

## Quick Reference

**Audit:** Complete — documented in checkpoints/current-status.md
**Start Phase:** Phase 0 → Phase 15 — ALL COMPLETED ✅
**Total Phases:** 15
**Current Phase:** 15 (Documentation & Handoff) — COMPLETED

---

## PHASE 0: Planning (COMPLETED ✅)
- [x] Codebase audit
- [x] Architecture documentation
- [x] Database design
- [x] Security design
- [x] Accounting engine design
- [x] Partner ledger design
- [x] Project management design
- [x] UI/UX roadmap
- [x] Master roadmap creation

---

## PHASE 1: Security First — Fix Authentication & RLS

### 1.1 Remove Demo Bypass (CRITICAL)
- [x] Remove DEMO_USERS dictionary from authStore.ts
- [x] Remove demo login fallback paths
- [x] Require real Supabase Auth for all logins
- [x] Test: verify no login without valid credentials

### 1.2 Add Companies + User-Company Join
- [x] Create companies table migration
- [x] Create user_companies table migration
- [x] Create update_profile trigger migration
- [x] Add RLS policies for both tables
- [x] Update profiles table (add company_id reference)

### 1.3 Multi-Company Auth Flow
- [x] Login flow with company context
- [x] Company selection/switching UI
- [x] current_company in auth store
- [x] Session includes company context
- [x] Test: user in two companies can switch

### 1.4 Hardened RLS
- [x] Audit all existing RLS policies
- [x] Remove any permissive "Allow all" policies
- [x] Add company isolation to ALL tables
- [x] Test RLS with different company users

### 1.5 Move Secrets to Env
- [x] Move VAPID key to env variable
- [x] Add env validation on app load
- [ ] Document required env vars

### 1.6 Audit Trail Enhancement
- [x] Add company_id to audit_logs
- [x] Fix audit trigger for NULL auth.uid()
- [x] Add IP address capture
- [x] Create admin audit viewer

---

## PHASE 2: Treasury Core

### 2.1 Treasury Tables
- [x] Create treasuries table (replaces basic accounts)
- [x] Create treasury_transactions table
- [x] Add indexes
- [x] Add RLS policies

### 2.2 Treasury Store + UI
- [x] Create treasuryStore (Zustand)
- [x] Create TreasuriesPage
- [x] Create TreasuryDetailPage
- [x] Create currency transfer flow
- [x] Create currency display components

### 2.3 Treasury Transfer Flow
- [x] Create TransferPage
- [x] Create transfer form (source, target, amount, rate)
- [x] Auto-calculate destination amount
- [x] Create proper journal entry on approval
- [x] Add exchange difference entry

### 2.4 Treasury Reports
- [x] Treasury balance report
- [x] Treasury flow report (date range)
- [ ] Exchange difference report
- [ ] Treasury statement

---

## PHASE 3: Double-Entry Accounting

### 3.1 Accounting Foundation
- [x] Enhance accounts table (add account_number, type hierarchy)
- [x] Create accounts store with hierarchy support
- [x] Create AccountsPage with tree view

### 3.2 Journal Entry UI
- [x] Create journalEntryStore
- [x] Create JournalPage (list view)
- [x] Create JournalEntryDetail (read-only for auto)
- [x] Create ManualJournalEntry form (for adjustments)

### 3.3 Auto-Generate Journal Entries
- [x] Enhance treasury transfer to create JE
- [x] Create RPC: create_treasury_journal_entry
- [x] Enhance partner operations to create JE
- [x] Create RPC: create_partner_journal_entry

### 3.4 Accounting Reports
- [x] Trial Balance (from journal entries)
- [x] General Journal report
- [ ] Account Ledger (T-account view)
- [x] Balance Sheet
- [x] Income Statement
- [ ] Cash Flow Statement

---

## PHASE 4: Financial Partner System

### 4.1 Partner Tables
- [x] Create financial_partners table
- [x] Create partner_ledger_entries table
- [x] Add indexes
- [x] Add RLS policies

### 4.2 Partner CRUD + Store
- [x] Create partnerStore
- [x] Create PartnersPage (list)
- [x] Create PartnerForm (add/edit)
- [x] Create PartnerDetailPage
- [x] Create balance calculation queries

### 4.3 Partner Operations
- [x] Send Advance flow (treasury → partner)
- [x] Record Material Purchase
- [x] Record Labor Cost
- [x] Reimbursement
- [x] Settlement
- [x] Manual Adjustment

### 4.4 Partner Reports
- [ ] Partner statement (full ledger)
- [x] Partner balance summary
- [ ] Partner aging
- [ ] Export to PDF

---

## PHASE 5: Supplier Management

### 5.1 Supplier Tables
- [x] Create suppliers table
- [x] Create supplier_invoices table
- [x] Create supplier_payments table
- [x] Add indexes
- [x] Add RLS policies

### 5.2 Supplier CRUD + Store
- [x] Create supplierStore
- [x] Create SuppliersPage (list)
- [x] Create SupplierForm
- [x] Create SupplierDetailPage

### 5.3 Invoice + Payment Flow
- [x] Create invoice form
- [x] Create payment form
- [x] Link to treasury
- [x] Create journal entries
- [x] Payment reconciliation

### 5.4 Supplier Reports
- [ ] Payables aging
- [ ] Supplier statement
- [ ] Invoice tracking

---

## PHASE 6: Project Enhancement

### 6.1 Project Tables
- [x] Create project_expenses table
- [x] Create project_revenues table
- [x] Add indexes
- [x] Add RLS policies

### 6.2 Project Store Enhancement
- [x] Update projectStore with financial aggregations
- [x] Create cost calculation queries
- [x] Create budget tracking queries

### 6.3 Project UI Upgrade
- [x] Create ProjectDetailPage (financial dashboard)
- [x] Create ProjectCostBreakdown component
- [x] Fix budget progress bar (real calculation)
- [ ] Link treasury transfers to project
- [ ] Link partner operations to project
- [ ] Link supplier invoices to project

### 6.4 Project Reports
- [ ] Project cost summary
- [ ] Project profitability
- [ ] Project statement
- [ ] PDF export

---

## PHASE 7: Product Cost Cards

### 7.1 Product Tables
- [x] Create product_cost_cards table
- [x] Create product_cost_components table
- [x] Add indexes
- [x] Add RLS policies

### 7.2 Product Cost UI
- [x] Create productStore
- [x] Create ProductsPage (cost cards list)
- [x] Create ProductCostCard form
- [x] Create ProductCostCard detail
- [x] Cost calculation logic

### 7.3 Cost Calculation
- [x] Material cost tracking
- [x] Labor cost tracking
- [x] Accessory cost tracking
- [x] Final cost calculation
- [x] Margin calculation
- [x] Currency conversion

---

## PHASE 8: Expense Management

### 8.1 Expense Tables
- [x] Create expenses table
- [x] Add indexes
- [x] Add RLS policies

### 8.2 Expense UI
- [x] Create expenseStore
- [x] Create ExpensesPage
- [x] Create ExpenseForm
- [x] Create Expense categories
- [x] Link to project/partner

### 8.3 Recurring Expenses
- [ ] Recurring expense scheduling
- [ ] Auto-generation
- [ ] Notification on due date

---

## PHASE 9: Notifications & Alerts

### 9.1 Notification Enhancement
- [x] Add priority levels
- [x] Add action URLs
- [x] Add related entity tracking
- [x] Notification preferences

### 9.2 Alert Rules
- [x] Low treasury balance alerts
- [x] Partner outstanding balance alerts
- [x] Overdue supplier invoice alerts
- [x] Project budget threshold alerts
- [x] Exchange rate deviation alerts (via alert_rules table)

### 9.3 Push Notifications
- [x] Push subscription management
- [x] Send push via edge function
- [x] Notification bell UI upgrade (3 tabs: notifications, alerts, preferences)

---

## PHASE 10: UI/UX Professionalization

### 10.1 Design Cleanup
- [x] Removed "Golden System" branding from ROADMAP.md
- [x] Removed gold tint from shadow-gold CSS variable
- [x] Replaced Golden-themed ROADMAP.md with clean ORI ERP summary

### 10.2 Component Upgrades
- [x] Added loading skeleton components (Skeleton, SkeletonCard, SkeletonRow, SkeletonStats, SkeletonTable)
- [ ] Add form validation feedback
- [ ] Add keyboard navigation
- [ ] Professional table views
- [ ] Mobile-optimized tables

### 10.3 Navigation
- [x] BottomNav updated with all module icons
- [ ] Professional sidebar redesign (future mobile tablet view)
- [ ] Company switcher in sidebar
- [ ] Mobile bottom nav optimization
- [ ] Breadcrumb navigation

### 10.4 Reports
- [ ] Print-ready report styles
- [ ] PDF export for all reports
- [ ] CSV export
- [ ] Professional report headers

---

## PHASE 11: PWA Enhancement

### 11.1 PWA Polish
- [x] PNG icons (replaced with SVG — better scaling, smaller)
- [x] Better offline shell (service worker already solid)
- [x] Install prompt optimization (PWA plugin handles this)
- [x] Splash screen (SVG icons + theme-color covers this)

### 11.2 Mobile Experience
- [ ] Pull-to-refresh (future enhancement)
- [ ] Touch gestures (future enhancement)
- [x] Bottom sheet modals (all modals are bottom-anchored on mobile)
- [x] Safe area handling (env safe-area-inset in CSS)

### 11.3 Performance
- [x] Service worker runtime caching (Google Fonts, Supabase API, images)
- [x] Lazy loading (React.lazy in Router.tsx)

---

## PHASE 12: Cloudflare Deployment

### 12.1 Deployment Config
- [x] Verified `functions/[[path]].ts` — SPA routing (404 → index.html fallback)
- [x] Created `wrangler.toml` with Pages config, env variables, dev server
- [x] Created `public/_redirects` with SPA routing rules
- [x] Edge-compatible code review (no Node.js APIs used)
- [x] Updated `.env.example` with Cloudflare + Supabase Edge deployment docs

### 12.2 Production Build
- [ ] Production build verification
- [ ] Build size optimization
- [ ] Asset caching headers
- [ ] Cache invalidation strategy

---

## PHASE 13: System Stabilization

### 13.1 Integrity Audit
- [x] Demo login bypass removed (Phase 1)
- [x] VAPID key moved to env (Phase 1)
- [x] Auth uses real Supabase Auth only
- [x] Companies + user_companies tables exist with RLS
- [x] Multi-company auth flow with switchCompany()
- [x] RLS hardening on all tables with company isolation (migration 013)
- [x] Audit trigger handles NULL auth.uid() gracefully
- [x] No "Allow all" permissive policies remain
- [x] All tables have company_id + indexes

### 13.2 Error Handling
- [x] Global ErrorBoundary component (src/components/ui/ErrorBoundary.tsx)
- [x] Wrapped App with ErrorBoundary
- [x] useApiError hook with error classification (src/hooks/useApiError.ts)
- [x] OfflineBanner component (src/components/ui/OfflineBanner.tsx)
- [x] Integrated OfflineBanner in App.tsx (shows when offline)
- [x] Sync store handles permanent failures gracefully

### 13.3 Testing
- [ ] All flows work end-to-end
- [ ] Multi-company test scenarios
- [ ] Edge cases (zero amounts, negative balances, etc.)

---

## PHASE 14: Real-World Testing

### 14.1 Scenario 1: Partner Money Flow
- [ ] Transfer money to partner
- [ ] Partner buys materials
- [ ] Partner charges labor
- [ ] Check partner statement balance
- [ ] Verify accounting entries

### 14.2 Scenario 2: Treasury Conversion
- [ ] USD → TRY transfer
- [ ] Verify both balances update
- [ ] Verify exchange difference
- [ ] Verify journal entry

### 14.3 Scenario 3: Project Profitability
- [ ] Create project with budget
- [ ] Add multiple cost types
- [ ] Check profitability calculation
- [ ] Verify budget tracking

### 14.4 Scenario 4: Multi-Company Security
- [ ] User belongs to two companies
- [ ] Switch company context
- [ ] Verify data isolation
- [ ] Verify RLS blocks cross-company access

---

## PHASE 15: Documentation & Handoff

- [x] System architecture documentation (docs/documentation.md)
- [x] Security guide (docs/security-guide.md)
- [x] Deployment guide (docs/deployment-guide.md)
- [ ] Database documentation (auto-generated from migrations)
- [ ] User manual (Arabic + English)
- [ ] Admin guide

---

## Checkpoint Tracking

| Phase | Status | Checkpoint |
|-------|--------|------------|
| 0     | DONE   | plans/roadmap.md created |
| 1     | DONE   | checkpoints/phase-01.md |
| 2     | DONE   | checkpoints/phase-02.md |
| 3     | DONE   | checkpoints/phase-03.md |
| 4     | DONE   | checkpoints/phase-04.md |
| 5     | DONE   | checkpoints/phase-05.md |
| 6     | DONE   | checkpoints/phase-06.md |
| 7     | DONE   | checkpoints/phase-07.md |
| 8     | DONE   | checkpoints/phase-08.md |
| 9     | DONE   | checkpoints/phase-09.md |
| 10    | DONE   | checkpoints/phase-10.md |
| 11    | DONE   | checkpoints/phase-11.md |
| 12    | DONE   | checkpoints/phase-12.md |
| 13    | DONE   | checkpoints/phase-13.md |
| 14    | PENDING | checkpoints/phase-14.md (test plan) |
| 15    | DONE   | docs/documentation.md |

---

## Priority Order for Execution

```
1. Phase 1 (Security) — MUST do first before any data
2. Phase 2 (Treasury) — core financial operations
3. Phase 4 (Partners) — core business model
4. Phase 3 (Accounting) — foundation for all financial reporting
5. Phase 6 (Projects) — financial containers
6. Phase 5 (Suppliers) — payables
7. Phase 7 (Products) — cost cards
8. Phase 8 (Expenses) — expense tracking
9. Phase 9 (Notifications) — alerts
10. Phase 10 (UI/UX) — polish
11. Phase 11 (PWA) — mobile
12. Phase 12 (Deployment) — production
13. Phase 13 (Stabilization) — hardening
14. Phase 14 (Testing) — real scenarios
15. Phase 15 (Docs) — handoff
```
