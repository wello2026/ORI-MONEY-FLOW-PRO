# UI/UX Roadmap

## Current State

**Strengths:**
- Premium glass-card aesthetic
- Arabic RTL support
- Responsive mobile-first
- Tailwind + custom theme (blue #1e3a5f, gold accents)
- Loading/error/empty states
- Toast notifications
- Recharts for data visualization

**Weaknesses:**
- Over-styled for an ERP (too glassmorphic, too flashy)
- Hardcoded KPI trends
- No keyboard navigation
- No form validation feedback
- Reports not PDF-ready
- "Golden System" marketing copy
- Many "قيد التطوير..." placeholders
- Hardcoded 0% progress bars
- Mobile table overflow
- No loading skeletons (spinner only)

## Design Principles

### Style: Professional Financial SaaS
```
NOT: flashy, demo-like, startup-style, marketing-heavy
YES: clean, precise, data-dense, trustworthy, premium
```

### Color Palette
```
Primary:    #1e3a5f (deep navy blue)
Secondary:  #3b5998 (medium blue)
Accent:     #d4af37 (subtle gold — for highlights only)
Success:    #10b981 (emerald green)
Warning:    #f59e0b (amber)
Danger:     #ef4444 (red)
Background: #f8fafc (light) / #0f172a (dark)
Surface:    #ffffff / #1e293b
Border:     #e2e8f0 / #334155
Text:       #1e293b / #f1f5f9
```

### Typography
```
Primary:    IBM Plex Sans Arabic (clean, professional, Arabic-first)
Mono:       IBM Plex Mono (for numbers, codes, amounts)
Scale:      12px (small) / 14px (body) / 16px (subtitle) / 20px (title) / 28px (h1)
```

### Layout System
```
Sidebar:    240px fixed, collapsible to 64px on mobile
Main:       fluid, max-width 1440px centered
Cards:      subtle shadows, 1px border, no heavy glassmorphism
Tables:     striped rows, sticky headers, compact density option
Forms:      stacked labels, inline validation, 44px touch targets
```

### Data Display
```
Numbers:    right-aligned in tables, mono font
Currency:   symbol + amount, thousands separator
Dates:      localized format (DD/MM/YYYY for Arabic)
Percentages: colored (green positive, red negative)
Charts:     clean, minimal axes, data labels on hover
```

## Page-by-Page UI Plan

### 1. Dashboard (/)
```
Professional financial dashboard — NOT marketing page

Cards Row 1:
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Total Assets│ │ Liabilities │ │ Net Equity  │ │ Cash Flow   │
│ $XXX,XXX    │ │ $XX,XXX     │ │ $XXX,XXX    │ │ +$X,XXX/mo  │
│ 📊 trend    │ │ 📊 trend    │ │ 📊 trend    │ │ 📊 trend    │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘

Cards Row 2:
┌──────────────────────┐ ┌──────────────────────┐
│ Treasury Overview     │ │ Partner Balances      │
│ By currency group    │ │ Top 5 partners        │
└──────────────────────┘ └──────────────────────┘

Bottom:
┌──────────────────────┐ ┌──────────────────────┐
│ Recent Transactions  │ │ Pending Approvals      │
│ Last 10 entries      │ │ Action items          │
└──────────────────────┘ └──────────────────────┘

REMOVE: "Golden System" branding, upgrade CTAs, fake AI tab
ADD:    Real KPI calculations, trend indicators, quick stats
```

### 2. Treasury (/app/accounts, /app/transfers)
```
Treasury is the most-used page. Must be fast and clear.

Treasury List:
┌──────────────────────────────────────────────────────────────┐
│ Treasuries                                    [+ New]        │
├──────────────────────────────────────────────────────────────┤
│ [Search] [Currency ▼] [Type ▼] [Status ▼]                   │
├──────────────────────────────────────────────────────────────┤
│ 🏦 Main Cashbox (LYD)          │ Balance: 125,000 LYD       │
│    Cashbox | Tripoli          │ [+ Deposit] [- Withdraw]    │
├──────────────────────────────────────────────────────────────┤
│ 🏦 USD Reserve (USD)           │ Balance: 50,000 USD        │
│    Bank | Reserve             │ [+ Deposit] [- Withdraw]    │
├──────────────────────────────────────────────────────────────┤
│ 🏦 Turkey Treasury (TRY)       │ Balance: 1,625,000 TRY     │
│    Bank | Turkey | ₺           │ [+ Deposit] [- Withdraw]   │
└──────────────────────────────────────────────────────────────┘

Transfer Form (modal):
┌─────────────────────────────────────────────────────────────┐
│ New Transfer                                                 │
├─────────────────────────────────────────────────────────────┤
│ From Treasury:    [Main Cashbox (LYD)        ▼]            │
│ To Treasury:      [Turkey Treasury (TRY)      ▼]            │
│ Amount:           [  1,000              ] LYD               │
│ Exchange Rate:    [ 32.50              ]                    │
│ ─────────────────────────────────────────────────────────── │
│ You will receive: 32,500 TRY                                │
│ ─────────────────────────────────────────────────────────── │
│ Reference:        [                      ]                  │
│ Description:      [                      ]                  │
│ Project:          [None                     ▼]              │
├─────────────────────────────────────────────────────────────┤
│                            [Cancel]  [Submit for Approval]  │
└─────────────────────────────────────────────────────────────┘
```

### 3. Partners (/app/partners)
```
Partner-centric UI, balance-first thinking

Partner List:
┌──────────────────────────────────────────────────────────────┐
│ Financial Partners                         [+ Add Partner]  │
├──────────────────────────────────────────────────────────────┤
│ [🔍 Search] [Country ▼] [Balance ▼] [Status ▼]              │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 👤 Mohammed Ali                                          │ │
│ │ Turkey | USD | 📅 Since: Jan 2025                        │ │
│ │ Balance: +2,500 USD  (Owed to us)        [████░] 60%    │ │
│ │ Last activity: 5 days ago                                │ │
│ │ [View Statement] [Send Advance] [Record Expense]         │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 👤 Ali Sons                                              │ │
│ │ China | CNY | 📅 Since: Mar 2025                         │ │
│ │ Balance: -1,200 CNY  (We owe)            [████░] 80%   │ │
│ │ Last activity: 2 days ago                                │ │
│ │ [View Statement] [Send Advance] [Record Expense]         │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘

Balance indicators:
  Green: positive (partner owes us)
  Red:   negative (we owe partner)
  Blue bar: activity level
```

### 4. Partner Statement
```
Full ledger with running balance

┌──────────────────────────────────────────────────────────────┐
│ ← Back to Partners                                          │
│ Mohammed Ali — Statement of Account           [Export PDF]  │
├──────────────────────────────────────────────────────────────┤
│ Period: [01/01/2026 ─ 31/03/2026]  [Apply Filter]           │
├──────────────────────────────────────────────────────────────┤
│ Summary: Advances Sent: 7,000 | Expenses: 4,500 | Net: +2,500│
├──────────────────────────────────────────────────────────────┤
│ DATE   │ REF    │ DESCRIPTION       │ DEBIT   │ CREDIT │ BAL │
│────────│────────│───────────────────│─────────│────────│─────│
│ 01/10  │ ADV-01 │ Opening Balance   │    --   │   --   │ 0   │
│ 01/10  │ ADV-02 │ Advance Sent     │    --   │ 5,000  │ 5,000│
│ 01/15  │ MAT-01 │ Materials         │ 3,000   │   --   │ 2,000│
│ 01/20  │ LAB-01 │ Labor Cost        │ 1,000   │   --   │ 1,000│
│ 02/01  │ ADV-03 │ Advance Sent     │    --   │ 2,000  │ 3,000│
│ 02/15  │ REI-01 │ Reimbursement    │   500   │   --   │ 2,500│
└──────────────────────────────────────────────────────────────┘
```

### 5. Journal (/app/journal)
```
Accounting-first view

Journal Entry List:
┌──────────────────────────────────────────────────────────────┐
│ Journal Entries                           [+ New Entry]       │
├──────────────────────────────────────────────────────────────┤
│ [Date Range] [Source ▼] [Status ▼] [Account ▼]              │
├──────────────────────────────────────────────────────────────┤
│ JE-2026-0001 │ 2026-01-10 │ Transfer USD→TRY │ Posted │ ⚙️ │
│ JE-2026-0002 │ 2026-01-15 │ Partner Advance  │ Posted │ ⚙️ │
│ JE-2026-0003 │ 2026-01-20 │ Manual Adjust    │ Draft  │ ⚙️ │
└──────────────────────────────────────────────────────────────┘

Journal Entry Detail:
┌──────────────────────────────────────────────────────────────┐
│ JE-2026-0001                                    [Posted]    │
│ Date: 2026-01-10 | Source: Auto-Treasury | Ref: TRF-001    │
├──────────────────────────────────────────────────────────────┤
│ ACCOUNT                    │ DEBIT      │ CREDIT             │
│──────────────────────────────────────────────────────────────│
│ USD Reserve Treasury       │  1,000.00  │        --          │
│ Turkey Treasury            │       --   │   32,500.00        │
│ Exchange Difference        │       --   │        --          │
├──────────────────────────────────────────────────────────────│
│ TOTAL                      │  1,000.00  │   32,500.00        │
└──────────────────────────────────────────────────────────────┘
```

### 6. Reports (/app/reports)
```
Professional financial report output

Report types:
- Trial Balance
- General Journal
- Account Ledger
- Balance Sheet
- Income Statement
- Cash Flow
- Treasury Report
- Partner Statement
- Supplier Aging
- Project Profitability

Each report:
- Filter bar at top
- Print-friendly layout
- Export buttons (PDF, CSV, Print)
- Professional header with company name
- Signature/date footer for formal reports
```

### 7. Settings (/app/settings)
```
Company management, users, roles, currencies, system config

Sections:
- Profile
- Company Settings
- User Management
- Role Management
- Currency Rates
- System Settings
- Audit Log (admin only)
```

## Component Improvements

### Replace Current "Golden System" Cards With:
```
Clean professional cards:
┌────────────────────────────┐
│ Title                      │
│ ──────────────────────────│
│ Amount in mono font        │
│ Description in body text  │
│ Trend badge (green/red)   │
└────────────────────────────┘
No: gradient backgrounds, gold borders, excessive shadows
Yes: subtle 1px border, clean typography, real data
```

### Form Validation
```
Input states: default, focus, error, success
Inline validation: red text + icon below field
Required: asterisk in label
Submit: disabled when invalid, loading spinner
Error: toast notification + inline summary
```

### Tables
```
Sticky headers on scroll
Compact toggle (dense mode)
Column sorting (all sortable columns)
Column visibility toggle
Row selection (multi-select for bulk actions)
Pagination (10/25/50/100 per page)
Responsive: horizontal scroll on mobile with first column sticky
Empty state: icon + message + action button
Loading: skeleton rows (5 rows)
```

### Navigation
```
Desktop: fixed sidebar 240px
Mobile:  bottom nav bar
Sidebar items: icon + label + notification badge
Active state: filled icon + colored text + left border accent
Collapse: icon-only mode (64px)
Company switcher at top of sidebar
User avatar + name at bottom
```

## Animation Guidelines
```
Micro-interactions only — NOT decorative:
- Button press: scale 0.98
- Card hover: subtle shadow lift (2px)
- Modal open: fade + slide up (200ms)
- Sidebar collapse: smooth width transition (200ms)
- Toast: slide in from top-right (150ms)
- Page transition: fade (100ms)

No: particle effects, loading spinners with logos, page transitions animations
Yes: fast, functional, barely noticeable
```

## PWA / Mobile
```
Install prompt on second visit
Offline banner when disconnected
Pull-to-refresh on mobile
Swipe gestures on tables (future)
Bottom sheet modals on mobile (not centered modals)
Touch targets minimum 44px
Safe area padding for notched devices
```