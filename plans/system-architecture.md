# System Architecture

## Overview

```
Browser (PWA)
    │
    ├── React 19 + TypeScript (Vite)
    ├── TailwindCSS + Shadcn UI
    ├── Zustand (state management)
    ├── React Router v7 (routing)
    ├── Dexie (IndexedDB — offline)
    ├── Supabase JS Client
    │
    ▼
Supabase Platform
    │
    ├── PostgreSQL (primary database)
    ├── Row Level Security (RLS)
    ├── Auth (Supabase Auth)
    ├── Realtime subscriptions
    ├── Edge Functions (push notifications)
    │
    ▼
Cloudflare
    ├── Pages (static hosting)
    ├── Functions (edge computing)
    └── _redirects (SPA routing)
```

## Directory Structure

```
src/
├── app/
│   ├── router.tsx          # React Router v7
│   └── App.tsx             # Root component
├── components/
│   ├── auth/                # Auth guards, login forms
│   ├── dashboard/           # Dashboard widgets
│   ├── layout/              # Sidebar, AppLayout, BottomNav
│   ├── notifications/       # Notification components
│   ├── transactions/        # Transaction components
│   ├── ui/                  # Shadcn UI base components
│   └── shared/              # Shared components
├── pages/                   # Route pages
├── stores/                  # Zustand stores
├── hooks/                   # Custom hooks
├── lib/
│   ├── supabase.ts          # Supabase client
│   ├── db.ts                # Dexie IndexedDB
│   ├── formats.ts           # Formatting utilities
│   ├── constants.ts         # App constants
│   └── sync.ts              # Offline sync engine
├── types/                   # TypeScript types
└── styles/                  # Global styles

supabase/
├── migrations/             # SQL migrations (sequential)
└── functions/               # Edge functions

functions/                   # Cloudflare Functions
├── _redirects
└── send-push/
```

## State Management Architecture

```
Zustand Stores (per domain):
├── authStore        # Authentication & session
├── accountStore     # Chart of accounts
├── transactionStore # Financial transactions
├── transferStore    # Treasury transfers
├── approvalStore    # Approval workflow
├── projectStore     # Project management
├── partnerStore     # Financial partners
├── supplierStore    # Suppliers & payables
├── journalStore     # Journal entries
├── reportStore      # Report generation
├── notificationStore# Notifications
├── syncStore        # Offline sync state
├── themeStore       # Theme (light/dark)
└── permissionStore  # Role permissions

Offline Layer:
├── Dexie (IndexedDB)        # Local data store
├── sync queue               # Pending operations
└── auto-sync on reconnect   # Background sync
```

## Routing Architecture

```
Routes (React Router v7):
├── /login                   # Public
├── /forgot-password         # Public
├── /reset-password          # Public
├── /app/                    # Protected (AuthGuard)
│   ├── /dashboard
│   ├── /accounts
│   ├── /transactions
│   ├── /transfers
│   ├── /approvals
│   ├── /journal
│   ├── /partners
│   ├── /suppliers
│   ├── /projects
│   ├── /reports
│   ├── /notifications
│   └── /settings
└── *                        # 404 fallback
```

## Data Flow

```
User Action
    │
    ▼
Zustand Store Action
    │
    ├──► Dexie (write locally)
    │
    └──► Supabase (write)
             │
             ├──► RLS validation
             ├──► Trigger (audit_log)
             ├──► Trigger (notification)
             └──► Return result
                  │
                  ▼
             Zustand Store (update state)
                  │
                  ▼
             React Components (re-render)
```

## API Patterns

```
Supabase Direct Access (no abstraction layer):
supabase.from('table').select(...)
supabase.from('table').insert(...)
supabase.from('table').update(...).eq(...)
supabase.from('table').delete(...).eq(...)

RPC for complex operations:
supabase.rpc('approve_transaction', {...})
supabase.rpc('approve_transfer', {...})
```

## Security Architecture

```
Authentication:
├── Supabase Auth (email/password)
├── Session persistence
├── AuthGuard (route protection)
└── AccessGuard (component protection)

Authorization:
├── RLS policies on ALL tables
├── company_id filtering on every query
├── role-based access (DEFAULT_ROLES)
└── Server-side RPC validation

Audit:
├── audit_logs table
├── audit_log_changes trigger
└── before/after JSON capture
```

## Multi-Company Architecture

```
users
  └── user_companies (join table)
        └── company_id

Every table has: company_id
Every query filters by: company_id
RLS enforces: company_id = current_user_company
```

## PWA Architecture

```
vite-plugin-pwa (Workbox)
├── InjectManifest strategy
├── Offline shell (index.html fallback)
├── Push notification handlers
├── Cache-first for assets
├── Network-first for API
└── Background sync
```
