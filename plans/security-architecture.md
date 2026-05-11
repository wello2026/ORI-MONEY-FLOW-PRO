# Security Architecture

## Critical Issues to Fix FIRST

### CRITICAL-1: Demo Login Bypass
**Problem:** Any user can log in as super_admin with `admin`/`admin123`
**Fix:** Remove DEMO_USERS dictionary, require real Supabase Auth
**Impact:** Without this, ALL other security is meaningless

### CRITICAL-2: Hardcoded VAPID Key
**Problem:** Production VAPID public key exposed in source
**Fix:** Move to environment variable
**Impact:** Push notification security

## Security Layers

### Layer 1 — Authentication
```
Supabase Auth (email/password)
├── Real password verification
├── Session token management
├── persistSession for app restart
└── AuthGuard for route protection

REMOVE:
├── DEMO_USERS dictionary
├── Any hardcoded password checks
└── Demo login bypass paths
```

### Layer 2 — Authorization
```
RBAC via DEFAULT_ROLES in types
├── owner    — full access to everything
├── admin    — full access within company
├── accountant — accounting + reporting
├── treasury  — treasury operations
├── operations — project + partner management
└── viewer    — read-only access

Client-side: AccessGuard component
Server-side: RLS policies + RPC validation
```

### Layer 3 — Multi-Company Isolation
```
user_companies table (join table)
├── user_id → profiles.id
├── company_id → companies.id
├── role within company
└── is_current flag

Every query filters by:
  company_id IN (
    SELECT company_id FROM user_companies
    WHERE user_id = auth.uid()
  )
```

### Layer 4 — Row Level Security
```
Strategy per table type:

1. Lookup tables (currencies, categories):
   - Allow all authenticated users read
   - Admin-only write

2. Company-scoped tables (accounts, transactions):
   - Company isolation policy (MUST)
   - Role-based write permissions
   - Self-only for viewer's own records

3. Sensitive tables (audit_logs, push_subscriptions):
   - Admin-only read
   - Own-user write for push_subscriptions

4. RPC functions:
   - SECURITY DEFINER
   - Validate company_id matches auth context
   - Validate role has permission
```

### Layer 5 — Input Validation
```
Client-side:
├── Zod schemas for all forms
├── Positive number validation
├── Date validation
└── String length limits

Server-side (RPC):
├── Validate all input parameters
├── Check company_id matches session
├── Check role permission for action
└── Reject if validation fails
```

### Layer 6 — Audit Trail
```
audit_logs table structure:
├── id UUID PK
├── user_id UUID
├── action TEXT (INSERT/UPDATE/DELETE)
├── table_name TEXT
├── record_id UUID
├── old_values JSONB
├── new_values JSONB
├── ip_address TEXT
├── user_agent TEXT
└── created_at TIMESTAMPTZ

Triggers:
├── audit_log_changes() on all company-scoped tables
└── auth.uid() used — NULL for demo-mode logins

Important: Fix audit trigger to handle NULL auth.uid()
  → Fall back to extracted user from request headers
```

### Layer 7 — Session Security
```
localStorage (zustand persist):
├── currentUser (user object)
├── role
├── isAuthenticated
├── permissions
└── theme

Risk: Sensitive data in localStorage (unencrypted)

Mitigation:
├── Use httpOnly cookies for session tokens (Supabase handles)
├── Don't store passwords or secrets
├── localStorage data is session-level, not persistent credentials
└── Always verify session via Supabase on app load
```

### Layer 8 — Push Notifications
```
push_subscriptions table:
├── id UUID PK
├── user_id UUID FK
├── endpoint TEXT
├── keys JSONB
└── created_at TIMESTAMPTZ

Security:
├── Only owner of subscription can read/delete
├── Endpoint URL validation
└── Keys validation before storage
```

## RLS Implementation Checklist

- [ ] Enable RLS on ALL tables
- [ ] Company isolation policy on ALL company-scoped tables
- [ ] Role-based policies for write operations
- [ ] Read-only policies for viewers
- [ ] Admin-only policies for sensitive operations
- [ ] Test RLS with different user roles
- [ ] Verify company data isolation
- [ ] No permissive "Allow all" policies remaining

## Security Checklist

- [ ] Remove DEMO_USERS dictionary
- [ ] Remove demo login bypass
- [ ] Move VAPID key to env
- [ ] Add input validation (Zod)
- [ ] Add server-side validation in RPCs
- [ ] Add rate limiting on auth endpoints
- [ ] Add IP logging to audit
- [ ] Fix audit trigger for NULL auth.uid()
- [ ] Add company_id to audit_logs
- [ ] Test all RLS policies with multiple companies
- [ ] Remove hardcoded role checks in client
- [ ] Verify all API calls include company filter
