-- ORI Finance Pro rescue baseline
-- Canonical Supabase schema, RLS policies, grants, bootstrap helpers, and RPCs.
-- This file is intentionally non-destructive: it never drops application tables.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  company_name_ar text,
  commercial_registration text,
  tax_number text,
  country text DEFAULT 'LY',
  city text,
  address text,
  phone text,
  email text,
  website text,
  default_currency text NOT NULL DEFAULT 'LYD',
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'employee'
    CHECK (role IN ('super_admin', 'admin', 'employee', 'viewer')),
  phone text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  device_info jsonb,
  last_login timestamptz,
  default_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('owner', 'admin', 'accountant', 'treasury', 'operations', 'viewer')),
  is_current boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_companies_one_current
  ON public.user_companies(user_id)
  WHERE is_current = true;

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  name_ar text,
  type text NOT NULL
    CHECK (type IN ('cashbox', 'bank', 'expense', 'income', 'employee', 'temporary')),
  balance numeric(20,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'LYD',
  parent_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived')),
  notes text,
  allow_negative boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived')),
  budget numeric(20,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'LYD',
  description text,
  start_date date,
  end_date date,
  manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  partner_id uuid,
  expected_revenue numeric(20,4) NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  reference text NOT NULL,
  type text NOT NULL
    CHECK (type IN ('deposit', 'withdrawal', 'expense', 'income', 'salary', 'custody', 'adjustment', 'settlement')),
  amount numeric(20,4) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'LYD',
  exchange_rate numeric(20,8) NOT NULL DEFAULT 1,
  description text,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  offset_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  attachments jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, reference)
);

CREATE TABLE IF NOT EXISTS public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  reference text NOT NULL,
  source_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  destination_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  amount numeric(20,4) NOT NULL CHECK (amount >= 0),
  source_currency text DEFAULT 'LYD',
  destination_currency text DEFAULT 'LYD',
  exchange_rate numeric(20,8) NOT NULL DEFAULT 1,
  destination_amount numeric(20,4),
  description text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, reference)
);

CREATE TABLE IF NOT EXISTS public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL
    CHECK (entity_type IN ('transaction', 'transfer', 'account', 'employee', 'treasury', 'expense')),
  entity_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  device_info jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  entry_number text,
  entry_date date NOT NULL DEFAULT current_date,
  description text NOT NULL DEFAULT '',
  reference_number text,
  source_type text,
  source_id uuid,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'posted'
    CHECK (status IN ('draft', 'posted', 'cancelled')),
  posted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  posted_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, entry_number)
);

CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  debit numeric(20,4) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric(20,4) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  currency_code text NOT NULL DEFAULT 'LYD',
  exchange_rate numeric(20,8) NOT NULL DEFAULT 1,
  description text,
  partner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (debit <> credit)
);

CREATE TABLE IF NOT EXISTS public.treasuries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  treasury_code text NOT NULL,
  treasury_name text NOT NULL,
  treasury_name_ar text,
  treasury_type text NOT NULL DEFAULT 'cashbox'
    CHECK (treasury_type IN ('cashbox', 'bank', 'reserve', 'petty_cash', 'escrow')),
  currency_code text NOT NULL DEFAULT 'LYD',
  country text,
  opening_balance numeric(20,4) NOT NULL DEFAULT 0,
  current_balance numeric(20,4) NOT NULL DEFAULT 0,
  bank_name text,
  account_number text,
  iban text,
  swift text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  allow_overdraft boolean NOT NULL DEFAULT false,
  min_balance numeric(20,4) NOT NULL DEFAULT 0,
  max_balance numeric(20,4),
  alert_threshold numeric(20,4),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, treasury_code)
);

CREATE TABLE IF NOT EXISTS public.treasury_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  treasury_id uuid REFERENCES public.treasuries(id) ON DELETE SET NULL,
  transaction_type text NOT NULL
    CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'exchange_in', 'exchange_out', 'adjustment', 'reconciliation')),
  amount numeric(20,4) NOT NULL CHECK (amount >= 0),
  currency_code text NOT NULL DEFAULT 'LYD',
  exchange_rate numeric(20,8) NOT NULL DEFAULT 1,
  destination_amount numeric(20,4),
  destination_currency text,
  destination_treasury_id uuid REFERENCES public.treasuries(id) ON DELETE SET NULL,
  description text,
  reference_number text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  partner_id uuid,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.currency_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  base_currency text NOT NULL,
  target_currency text NOT NULL,
  rate numeric(20,8) NOT NULL CHECK (rate > 0),
  effective_date date NOT NULL DEFAULT current_date,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, base_currency, target_currency, effective_date)
);

CREATE TABLE IF NOT EXISTS public.financial_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_code text NOT NULL,
  partner_name text NOT NULL,
  partner_name_ar text,
  country text,
  currency_code text NOT NULL DEFAULT 'USD',
  balance numeric(20,4) NOT NULL DEFAULT 0,
  contact_person text,
  phone text,
  email text,
  address text,
  bank_name text,
  bank_account_number text,
  bank_iban text,
  bank_swift text,
  tax_number text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, partner_code)
);

CREATE TABLE IF NOT EXISTS public.partner_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.financial_partners(id) ON DELETE CASCADE,
  entry_type text NOT NULL
    CHECK (entry_type IN ('advance_sent', 'advance_received', 'material_purchase', 'labor_cost', 'reimbursement', 'adjustment', 'settlement', 'return', 'other')),
  amount numeric(20,4) NOT NULL,
  currency_code text NOT NULL DEFAULT 'USD',
  balance_after numeric(20,4) NOT NULL DEFAULT 0,
  description text,
  reference_number text,
  treasury_transaction_id uuid REFERENCES public.treasury_transactions(id) ON DELETE SET NULL,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_partner_id_fkey;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES public.financial_partners(id) ON DELETE SET NULL;
ALTER TABLE public.treasury_transactions
  DROP CONSTRAINT IF EXISTS treasury_transactions_partner_id_fkey;
ALTER TABLE public.treasury_transactions
  ADD CONSTRAINT treasury_transactions_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES public.financial_partners(id) ON DELETE SET NULL;
ALTER TABLE public.journal_entry_lines
  DROP CONSTRAINT IF EXISTS journal_entry_lines_partner_id_fkey;
ALTER TABLE public.journal_entry_lines
  ADD CONSTRAINT journal_entry_lines_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES public.financial_partners(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_code text NOT NULL,
  supplier_name text NOT NULL,
  supplier_name_ar text,
  supplier_type text DEFAULT 'vendor',
  country text,
  currency_code text NOT NULL DEFAULT 'USD',
  contact_person text,
  phone text,
  email text,
  address text,
  tax_number text,
  bank_name text,
  bank_account_number text,
  bank_iban text,
  bank_swift text,
  payment_terms integer NOT NULL DEFAULT 30,
  credit_limit numeric(20,4) NOT NULL DEFAULT 0,
  current_balance numeric(20,4) NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, supplier_code)
);

CREATE TABLE IF NOT EXISTS public.supplier_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL DEFAULT current_date,
  description text,
  subtotal numeric(20,4) NOT NULL DEFAULT 0,
  tax_amount numeric(20,4) NOT NULL DEFAULT 0,
  discount_amount numeric(20,4) NOT NULL DEFAULT 0,
  total_amount numeric(20,4) NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'USD',
  exchange_rate numeric(20,8) NOT NULL DEFAULT 1,
  amount_paid numeric(20,4) NOT NULL DEFAULT 0,
  amount_due numeric(20,4) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  reference_number text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.supplier_invoices(id) ON DELETE SET NULL,
  payment_number text NOT NULL,
  payment_date date NOT NULL DEFAULT current_date,
  amount numeric(20,4) NOT NULL CHECK (amount > 0),
  currency_code text NOT NULL DEFAULT 'USD',
  exchange_rate numeric(20,8) NOT NULL DEFAULT 1,
  payment_method text DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('cash', 'bank', 'bank_transfer', 'check', 'cheque', 'credit_card', 'card', 'transfer', 'other')),
  treasury_transaction_id uuid REFERENCES public.treasury_transactions(id) ON DELETE SET NULL,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  reference_number text,
  description text,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, payment_number)
);

CREATE TABLE IF NOT EXISTS public.project_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  expense_category text NOT NULL
    CHECK (expense_category IN ('materials', 'labor', 'equipment', 'transportation', 'subcontractor', 'permits', 'utilities', 'insurance', 'maintenance', 'consulting', 'other')),
  description text,
  amount numeric(20,4) NOT NULL CHECK (amount >= 0),
  currency_code text NOT NULL DEFAULT 'USD',
  exchange_rate numeric(20,8) NOT NULL DEFAULT 1,
  amount_in_base numeric(20,4),
  expense_date date NOT NULL DEFAULT current_date,
  vendor_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.financial_partners(id) ON DELETE SET NULL,
  treasury_transaction_id uuid REFERENCES public.treasury_transactions(id) ON DELETE SET NULL,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  receipt_url text,
  reference_number text,
  status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  revenue_type text NOT NULL
    CHECK (revenue_type IN ('contract_value', 'change_order', 'milestone_payment', 'advance_received', 'final_payment', 'penalty', 'other')),
  description text,
  amount numeric(20,4) NOT NULL CHECK (amount >= 0),
  currency_code text NOT NULL DEFAULT 'USD',
  exchange_rate numeric(20,8) NOT NULL DEFAULT 1,
  amount_in_base numeric(20,4),
  revenue_date date NOT NULL DEFAULT current_date,
  invoice_number text,
  treasury_transaction_id uuid REFERENCES public.treasury_transactions(id) ON DELETE SET NULL,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  reference_number text,
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'invoiced', 'received', 'cancelled')),
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  expense_number text NOT NULL,
  title text NOT NULL,
  description text,
  amount numeric(20,4) NOT NULL CHECK (amount >= 0),
  currency_code text NOT NULL DEFAULT 'USD',
  exchange_rate numeric(20,8) NOT NULL DEFAULT 1,
  amount_in_base numeric(20,4),
  category text NOT NULL,
  expense_date date NOT NULL DEFAULT current_date,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.financial_partners(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  payment_method text DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'bank', 'cheque', 'transfer', 'card')),
  treasury_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  receipt_url text,
  reference_number text,
  vendor_name text,
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'paid', 'cancelled')),
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_pattern jsonb,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, expense_number)
);

CREATE TABLE IF NOT EXISTS public.product_cost_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  card_code text NOT NULL,
  product_name text NOT NULL,
  product_name_ar text,
  product_category text,
  unit_of_measure text NOT NULL DEFAULT 'unit',
  description text,
  material_cost numeric(20,4) NOT NULL DEFAULT 0,
  labor_cost numeric(20,4) NOT NULL DEFAULT 0,
  accessory_cost numeric(20,4) NOT NULL DEFAULT 0,
  overhead_cost numeric(20,4) NOT NULL DEFAULT 0,
  total_cost numeric(20,4) NOT NULL DEFAULT 0,
  selling_price numeric(20,4) NOT NULL DEFAULT 0,
  target_margin_pct numeric(8,4) NOT NULL DEFAULT 20,
  currency_code text NOT NULL DEFAULT 'USD',
  labor_rate_per_hour numeric(20,4) NOT NULL DEFAULT 0,
  labor_hours numeric(20,4) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, card_code)
);

CREATE TABLE IF NOT EXISTS public.product_cost_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cost_card_id uuid NOT NULL REFERENCES public.product_cost_cards(id) ON DELETE CASCADE,
  component_type text NOT NULL
    CHECK (component_type IN ('material', 'labor', 'accessory', 'overhead', 'other')),
  component_name text NOT NULL,
  component_name_ar text,
  quantity numeric(20,4) NOT NULL DEFAULT 1,
  unit_cost numeric(20,4) NOT NULL DEFAULT 0,
  total_cost numeric(20,4) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  currency_code text NOT NULL DEFAULT 'USD',
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  reference_number text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info'
    CHECK (type IN ('approval', 'transaction', 'alert', 'info', 'summary')),
  is_read boolean NOT NULL DEFAULT false,
  data jsonb,
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  action_url text,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  device_info jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  push_approval boolean NOT NULL DEFAULT true,
  push_transaction boolean NOT NULL DEFAULT true,
  push_alert boolean NOT NULL DEFAULT true,
  push_info boolean NOT NULL DEFAULT true,
  push_summary boolean NOT NULL DEFAULT false,
  treasury_low_balance_alert boolean NOT NULL DEFAULT true,
  treasury_low_balance_threshold numeric(20,4) NOT NULL DEFAULT 1000,
  partner_outstanding_alert boolean NOT NULL DEFAULT true,
  partner_outstanding_threshold numeric(20,4) NOT NULL DEFAULT 5000,
  supplier_overdue_alert boolean NOT NULL DEFAULT true,
  supplier_overdue_days integer NOT NULL DEFAULT 7,
  project_budget_alert boolean NOT NULL DEFAULT true,
  project_budget_threshold_pct numeric(8,4) NOT NULL DEFAULT 80,
  expense_approval_alert boolean NOT NULL DEFAULT true,
  email_approval boolean NOT NULL DEFAULT false,
  email_alert boolean NOT NULL DEFAULT false,
  email_summary_daily boolean NOT NULL DEFAULT false,
  email_summary_weekly boolean NOT NULL DEFAULT false,
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start text NOT NULL DEFAULT '22:00',
  quiet_hours_end text NOT NULL DEFAULT '07:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_type text NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  threshold_value numeric(20,4) NOT NULL DEFAULT 0,
  threshold_operator text NOT NULL DEFAULT '>',
  notification_channel text NOT NULL DEFAULT 'both',
  target_entity_type text,
  target_entity_id uuid,
  notify_user_ids uuid[] NOT NULL DEFAULT '{}',
  check_frequency text NOT NULL DEFAULT 'daily',
  last_checked timestamptz,
  last_triggered timestamptz,
  trigger_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alert_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_rule_id uuid REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  alert_type text NOT NULL DEFAULT 'custom',
  severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  entity_type text,
  entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  read_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  read_at timestamptz,
  action_taken text,
  action_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_at timestamptz,
  metadata jsonb,
  triggered_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  device_info jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address text,
  device_info jsonb,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_companies_user ON public.user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company ON public.user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_company ON public.accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(type);
CREATE INDEX IF NOT EXISTS idx_transactions_company ON public.transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transfers_company ON public.transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON public.journal_entries(company_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON public.journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_treasuries_company ON public.treasuries(company_id);
CREATE INDEX IF NOT EXISTS idx_treasury_tx_company ON public.treasury_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_treasury_tx_treasury ON public.treasury_transactions(treasury_id);
CREATE INDEX IF NOT EXISTS idx_partners_company ON public.financial_partners(company_id);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_partner ON public.partner_ledger_entries(partner_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON public.supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON public.supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_project_expenses_project ON public.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_revenues_project ON public.project_revenues(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_products_company ON public.product_cost_cards(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_logs_company ON public.alert_logs(company_id, is_read, triggered_at DESC);

-- Updated-at triggers
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies','profiles','accounts','projects','transactions','transfers',
    'journal_entries','treasuries','financial_partners','suppliers',
    'supplier_invoices','expenses','product_cost_cards','push_subscriptions',
    'notification_preferences','alert_rules'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

-- Security helper functions. SECURITY DEFINER avoids RLS recursion in policies.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_company_member(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p_company_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_companies uc
    JOIN public.profiles p ON p.id = uc.user_id
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = p_company_id
      AND p.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_company_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR (
      p_company_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_companies
        WHERE user_id = auth.uid()
          AND company_id = p_company_id
          AND role IN ('owner', 'admin')
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_user_current_company()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND is_current = true LIMIT 1),
    (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() ORDER BY joined_at LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_doc_number(p_prefix text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT upper(coalesce(nullif(p_prefix, ''), 'DOC')) || '-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
$$;

-- Bootstrap company and current auth user. No manual profile/user_company rows are required.
CREATE OR REPLACE FUNCTION public.bootstrap_current_user(
  p_company_name text DEFAULT 'ORI Finance Pro',
  p_company_name_ar text DEFAULT 'أوري فاينانس برو'
)
RETURNS TABLE (company_id uuid, profile_id uuid, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_company_id uuid;
  v_is_first boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1))
    INTO v_email, v_name
  FROM auth.users
  WHERE id = v_user_id;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_companies) INTO v_is_first;

  INSERT INTO public.companies (company_name, company_name_ar, country, default_currency)
  SELECT COALESCE(NULLIF(p_company_name, ''), 'ORI Finance Pro'),
         COALESCE(NULLIF(p_company_name_ar, ''), 'أوري فاينانس برو'),
         'LY',
         'LYD'
  WHERE v_is_first AND NOT EXISTS (SELECT 1 FROM public.companies)
  RETURNING id INTO v_company_id;

  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id
    FROM public.companies
    WHERE is_active = true
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (company_name, company_name_ar, country, default_currency)
    VALUES ('ORI Finance Pro', 'أوري فاينانس برو', 'LY', 'LYD')
    RETURNING id INTO v_company_id;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, is_active, default_company_id, last_login)
  VALUES (
    v_user_id,
    COALESCE(v_email, ''),
    COALESCE(v_name, 'مستخدم'),
    CASE WHEN v_is_first THEN 'admin' ELSE 'employee' END,
    true,
    v_company_id,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    default_company_id = COALESCE(public.profiles.default_company_id, EXCLUDED.default_company_id),
    last_login = now(),
    updated_at = now();

  INSERT INTO public.user_companies (user_id, company_id, role, is_current)
  VALUES (v_user_id, v_company_id, CASE WHEN v_is_first THEN 'owner' ELSE 'viewer' END, true)
  ON CONFLICT (user_id, company_id) DO UPDATE SET
    is_current = true,
    role = CASE WHEN v_is_first THEN 'owner' ELSE public.user_companies.role END;

  UPDATE public.user_companies
  SET is_current = false
  WHERE user_id = v_user_id AND company_id <> v_company_id;

  RETURN QUERY
  SELECT v_company_id, v_user_id, (SELECT uc.role FROM public.user_companies uc WHERE uc.user_id = v_user_id AND uc.company_id = v_company_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_is_first boolean;
  v_role text;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_companies) INTO v_is_first;

  IF NEW.raw_user_meta_data ? 'company_id'
     AND (NEW.raw_user_meta_data->>'company_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT id INTO v_company_id
    FROM public.companies
    WHERE id = (NEW.raw_user_meta_data->>'company_id')::uuid
      AND is_active = true
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id
    FROM public.companies
    WHERE is_active = true
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (company_name, company_name_ar, country, default_currency)
    VALUES ('ORI Finance Pro', 'أوري فاينانس برو', 'LY', 'LYD')
    RETURNING id INTO v_company_id;
  END IF;

  v_role := COALESCE(NEW.raw_user_meta_data->>'role', CASE WHEN v_is_first THEN 'admin' ELSE 'employee' END);
  IF v_role NOT IN ('super_admin', 'admin', 'employee', 'viewer') THEN
    v_role := CASE WHEN v_is_first THEN 'admin' ELSE 'employee' END;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, phone, is_active, default_company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'مستخدم'),
    v_role,
    NEW.raw_user_meta_data->>'phone',
    true,
    v_company_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_companies (user_id, company_id, role, is_current)
  VALUES (
    NEW.id,
    v_company_id,
    CASE
      WHEN v_is_first THEN 'owner'
      WHEN NEW.raw_user_meta_data->>'company_role' IN ('owner', 'admin', 'accountant', 'treasury', 'operations', 'viewer')
        THEN NEW.raw_user_meta_data->>'company_role'
      WHEN v_role = 'admin' THEN 'admin'
      ELSE 'viewer'
    END,
    true
  )
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS TABLE (
  company_id uuid,
  company_name text,
  company_name_ar text,
  country text,
  default_currency text,
  role text,
  is_current boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT c.id, c.company_name, c.company_name_ar, c.country, c.default_currency, uc.role, uc.is_current
  FROM public.user_companies uc
  JOIN public.companies c ON c.id = uc.company_id
  WHERE uc.user_id = auth.uid()
  ORDER BY uc.is_current DESC, uc.joined_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.make_current_company(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.user_companies SET is_current = false WHERE user_id = auth.uid();
  UPDATE public.user_companies SET is_current = true WHERE user_id = auth.uid() AND company_id = p_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_journal_entry(
  p_entry_date date,
  p_description text,
  p_lines jsonb,
  p_source_type text DEFAULT NULL,
  p_source_id uuid DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_project_id uuid DEFAULT NULL
)
RETURNS TABLE (success boolean, message text, journal_entry_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid := public.get_user_current_company();
  v_entry_id uuid;
  v_total_debit numeric(20,4);
  v_total_credit numeric(20,4);
BEGIN
  IF v_company_id IS NULL THEN
    RETURN QUERY SELECT false, 'لا توجد شركة محددة', NULL::uuid;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(COALESCE((x->>'debit')::numeric, 0)), 0),
         COALESCE(SUM(COALESCE((x->>'credit')::numeric, 0)), 0)
  INTO v_total_debit, v_total_credit
  FROM jsonb_array_elements(p_lines) x;

  IF ABS(v_total_debit - v_total_credit) > 0.0001 THEN
    RETURN QUERY SELECT false, 'القيد غير متوازن', NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, description, reference_number,
    source_type, source_id, project_id, status, posted_by, posted_at, created_by
  )
  VALUES (
    v_company_id, public.generate_doc_number('JE'), COALESCE(p_entry_date, current_date),
    COALESCE(p_description, ''), p_reference_number,
    p_source_type, p_source_id, p_project_id, 'posted', auth.uid(), now(), auth.uid()
  )
  RETURNING id INTO v_entry_id;

  INSERT INTO public.journal_entry_lines (
    company_id, journal_entry_id, account_id, debit, credit, currency_code, exchange_rate, description
  )
  SELECT
    v_company_id,
    v_entry_id,
    (x->>'account_id')::uuid,
    COALESCE((x->>'debit')::numeric, 0),
    COALESCE((x->>'credit')::numeric, 0),
    COALESCE(x->>'currency_code', 'LYD'),
    COALESCE((x->>'exchange_rate')::numeric, 1),
    COALESCE(x->>'description', '')
  FROM jsonb_array_elements(p_lines) x;

  RETURN QUERY SELECT true, 'تم إنشاء القيد بنجاح', v_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_auto_journal(
  p_company_id uuid,
  p_description text,
  p_source_type text,
  p_source_id uuid,
  p_debit_account uuid,
  p_credit_account uuid,
  p_amount numeric,
  p_currency text DEFAULT 'LYD'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id uuid;
BEGIN
  IF p_debit_account IS NULL OR p_credit_account IS NULL OR COALESCE(p_amount, 0) <= 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, description, source_type, source_id,
    status, posted_by, posted_at, created_by
  )
  VALUES (
    p_company_id, public.generate_doc_number('JE'), current_date, COALESCE(p_description, ''),
    p_source_type, p_source_id, 'posted', auth.uid(), now(), auth.uid()
  )
  RETURNING id INTO v_entry_id;

  INSERT INTO public.journal_entry_lines (company_id, journal_entry_id, account_id, debit, credit, currency_code)
  VALUES
    (p_company_id, v_entry_id, p_debit_account, p_amount, 0, COALESCE(p_currency, 'LYD')),
    (p_company_id, v_entry_id, p_credit_account, 0, p_amount, COALESCE(p_currency, 'LYD'));

  RETURN v_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_transaction(p_transaction_id uuid, p_notes text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx public.transactions%ROWTYPE;
  v_debit uuid;
  v_credit uuid;
BEGIN
  SELECT * INTO tx FROM public.transactions WHERE id = p_transaction_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF tx.type IN ('deposit', 'income') THEN
    UPDATE public.accounts SET balance = balance + tx.amount WHERE id = tx.account_id;
    v_debit := tx.account_id;
    v_credit := tx.offset_account_id;
  ELSE
    UPDATE public.accounts SET balance = balance - tx.amount WHERE id = tx.account_id;
    v_debit := tx.offset_account_id;
    v_credit := tx.account_id;
  END IF;

  UPDATE public.transactions
  SET status = 'approved', approved_by = auth.uid(), updated_at = now()
  WHERE id = p_transaction_id;

  PERFORM public.create_auto_journal(tx.company_id, COALESCE(tx.description, tx.reference), 'transaction', tx.id, v_debit, v_credit, tx.amount, tx.currency);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_transfer(transfer_id uuid, approver_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tr public.transfers%ROWTYPE;
  v_amount numeric(20,4);
BEGIN
  SELECT * INTO tr FROM public.transfers WHERE id = transfer_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_amount := COALESCE(tr.destination_amount, tr.amount * COALESCE(tr.exchange_rate, 1));
  UPDATE public.accounts SET balance = balance - tr.amount WHERE id = tr.source_account_id;
  UPDATE public.accounts SET balance = balance + v_amount WHERE id = tr.destination_account_id;

  UPDATE public.transfers
  SET status = 'approved',
      approved_by = COALESCE(approver_id, auth.uid()),
      approved_at = now(),
      updated_at = now()
  WHERE id = transfer_id;

  PERFORM public.create_auto_journal(tr.company_id, COALESCE(tr.description, tr.reference), 'transfer', tr.id, tr.destination_account_id, tr.source_account_id, tr.amount, tr.source_currency);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_treasury_transaction(p_transaction_id uuid, p_approver_id uuid DEFAULT NULL)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx public.treasury_transactions%ROWTYPE;
  v_delta numeric(20,4);
BEGIN
  SELECT * INTO tx FROM public.treasury_transactions WHERE id = p_transaction_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'المعاملة غير موجودة أو ليست معلقة';
    RETURN;
  END IF;

  v_delta := CASE
    WHEN tx.transaction_type IN ('deposit', 'transfer_in', 'exchange_in', 'adjustment') THEN tx.amount
    WHEN tx.transaction_type IN ('withdrawal', 'transfer_out', 'exchange_out') THEN -tx.amount
    ELSE 0
  END;

  UPDATE public.treasuries SET current_balance = current_balance + v_delta WHERE id = tx.treasury_id;
  UPDATE public.treasury_transactions
  SET status = 'approved',
      approved_by = COALESCE(p_approver_id, auth.uid()),
      approved_at = now(),
      updated_at = now()
  WHERE id = p_transaction_id;

  RETURN QUERY SELECT true, 'تمت الموافقة بنجاح';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_currency_transfer(
  p_source_treasury_id uuid,
  p_destination_treasury_id uuid,
  p_source_amount numeric,
  p_exchange_rate numeric DEFAULT 1,
  p_description text DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_project_id uuid DEFAULT NULL
)
RETURNS TABLE (success boolean, message text, transaction_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid := public.get_user_current_company();
  v_out_id uuid;
  v_dest_amount numeric(20,4);
  v_source_currency text;
  v_dest_currency text;
  v_ref text := COALESCE(NULLIF(p_reference, ''), public.generate_doc_number('TRF'));
BEGIN
  IF v_company_id IS NULL THEN
    RETURN QUERY SELECT false, 'لا توجد شركة محددة', NULL::uuid;
    RETURN;
  END IF;
  IF p_source_treasury_id = p_destination_treasury_id THEN
    RETURN QUERY SELECT false, 'لا يمكن التحويل لنفس الخزينة', NULL::uuid;
    RETURN;
  END IF;

  SELECT currency_code INTO v_source_currency FROM public.treasuries WHERE id = p_source_treasury_id;
  SELECT currency_code INTO v_dest_currency FROM public.treasuries WHERE id = p_destination_treasury_id;
  v_dest_amount := round(p_source_amount * COALESCE(p_exchange_rate, 1), 4);

  INSERT INTO public.treasury_transactions (
    company_id, treasury_id, transaction_type, amount, currency_code, exchange_rate,
    destination_amount, destination_currency, destination_treasury_id, description,
    reference_number, project_id, status, created_by
  )
  VALUES (
    v_company_id, p_source_treasury_id, 'transfer_out', p_source_amount, v_source_currency, COALESCE(p_exchange_rate, 1),
    v_dest_amount, v_dest_currency, p_destination_treasury_id, p_description,
    v_ref, p_project_id, 'pending', auth.uid()
  )
  RETURNING id INTO v_out_id;

  INSERT INTO public.treasury_transactions (
    company_id, treasury_id, transaction_type, amount, currency_code, exchange_rate,
    destination_amount, destination_currency, destination_treasury_id, description,
    reference_number, project_id, status, created_by
  )
  VALUES (
    v_company_id, p_destination_treasury_id, 'transfer_in', v_dest_amount, v_dest_currency, 1,
    p_source_amount, v_source_currency, p_source_treasury_id, p_description,
    v_ref, p_project_id, 'pending', auth.uid()
  );

  RETURN QUERY SELECT true, 'تم إنشاء التحويل بنجاح', v_out_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_accounts_for_journal(p_search text DEFAULT '', p_company_id uuid DEFAULT NULL, p_limit integer DEFAULT 20)
RETURNS TABLE (id uuid, account_number text, account_name text, account_name_ar text, account_type text, balance numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT a.id, a.code, a.name, COALESCE(a.name_ar, a.name), a.type, a.balance
  FROM public.accounts a
  WHERE a.status = 'active'
    AND a.company_id = COALESCE(p_company_id, public.get_user_current_company())
    AND (
      COALESCE(p_search, '') = ''
      OR a.code ILIKE '%' || p_search || '%'
      OR a.name ILIKE '%' || p_search || '%'
      OR COALESCE(a.name_ar, '') ILIKE '%' || p_search || '%'
    )
  ORDER BY a.code
  LIMIT COALESCE(p_limit, 20);
$$;

CREATE OR REPLACE FUNCTION public.get_general_journal(p_company_id uuid DEFAULT NULL, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE (entry_id uuid, entry_number text, entry_date date, description text, account_id uuid, account_name text, account_name_ar text, debit numeric, credit numeric, source_type text, source_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT je.id, je.entry_number, je.entry_date, je.description, a.id, a.name, COALESCE(a.name_ar, a.name),
         jel.debit, jel.credit, je.source_type, je.source_id
  FROM public.journal_entries je
  JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
  JOIN public.accounts a ON a.id = jel.account_id
  WHERE je.status = 'posted'
    AND je.company_id = COALESCE(p_company_id, public.get_user_current_company())
    AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
    AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
  ORDER BY je.entry_date DESC, je.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_trial_balance(p_company_id uuid DEFAULT NULL, p_as_of_date date DEFAULT current_date)
RETURNS TABLE (account_id uuid, account_number text, account_name text, account_name_ar text, account_type text, debit numeric, credit numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT a.id, a.code, a.name, COALESCE(a.name_ar, a.name), a.type,
         COALESCE(SUM(jel.debit), 0), COALESCE(SUM(jel.credit), 0)
  FROM public.accounts a
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN public.journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted' AND je.entry_date <= COALESCE(p_as_of_date, current_date)
  WHERE a.company_id = COALESCE(p_company_id, public.get_user_current_company())
  GROUP BY a.id, a.code, a.name, a.name_ar, a.type
  ORDER BY a.code;
$$;

CREATE OR REPLACE FUNCTION public.get_income_statement(p_company_id uuid DEFAULT NULL, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE (account_id uuid, account_number text, account_name text, account_name_ar text, account_type text, total numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT a.id, a.code, a.name, COALESCE(a.name_ar, a.name), a.type,
         CASE WHEN a.type = 'income' THEN COALESCE(SUM(jel.credit - jel.debit), 0)
              ELSE COALESCE(SUM(jel.debit - jel.credit), 0) END AS total
  FROM public.accounts a
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN public.journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
  WHERE a.company_id = COALESCE(p_company_id, public.get_user_current_company())
    AND a.type IN ('income', 'expense')
    AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
    AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
  GROUP BY a.id, a.code, a.name, a.name_ar, a.type
  ORDER BY a.code;
$$;

CREATE OR REPLACE FUNCTION public.get_balance_sheet(p_company_id uuid DEFAULT NULL, p_as_of_date date DEFAULT current_date)
RETURNS TABLE (account_id uuid, account_number text, account_name text, account_name_ar text, account_type text, balance numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT a.id, a.code, a.name, COALESCE(a.name_ar, a.name), a.type,
         a.balance + COALESCE(SUM(jel.debit - jel.credit), 0) AS balance
  FROM public.accounts a
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN public.journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted' AND je.entry_date <= COALESCE(p_as_of_date, current_date)
  WHERE a.company_id = COALESCE(p_company_id, public.get_user_current_company())
    AND a.type IN ('cashbox', 'bank', 'employee', 'temporary')
  GROUP BY a.id, a.code, a.name, a.name_ar, a.type, a.balance
  ORDER BY a.code;
$$;

CREATE OR REPLACE FUNCTION public.get_account_ledger(p_account_id uuid, p_company_id uuid DEFAULT NULL, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE (entry_id uuid, entry_number text, entry_date date, description text, debit numeric, credit numeric, running_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_running numeric(20,4) := 0;
  r record;
BEGIN
  FOR r IN
    SELECT je.id, je.entry_number, je.entry_date, je.description, jel.debit, jel.credit
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    WHERE jel.account_id = p_account_id
      AND je.status = 'posted'
      AND je.company_id = COALESCE(p_company_id, public.get_user_current_company())
      AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
      AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
    ORDER BY je.entry_date, je.created_at
  LOOP
    v_running := v_running + COALESCE(r.debit, 0) - COALESCE(r.credit, 0);
    entry_id := r.id;
    entry_number := r.entry_number;
    entry_date := r.entry_date;
    description := r.description;
    debit := r.debit;
    credit := r.credit;
    running_balance := v_running;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_project_financials(p_project_id uuid)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  project_code text,
  project_budget numeric,
  project_currency text,
  project_status text,
  total_expenses numeric,
  total_revenues numeric,
  net_profit numeric,
  budget_utilization_pct numeric,
  materials_cost numeric,
  labor_cost numeric,
  equipment_cost numeric,
  transportation_cost numeric,
  subcontractor_cost numeric,
  other_costs numeric,
  expense_count bigint,
  revenue_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    p.id, p.name, p.code, p.budget, p.currency, p.status,
    COALESCE((SELECT SUM(pe.amount_in_base) FROM public.project_expenses pe WHERE pe.project_id = p.id AND pe.status <> 'cancelled'), 0),
    COALESCE((SELECT SUM(pr.amount_in_base) FROM public.project_revenues pr WHERE pr.project_id = p.id AND pr.status <> 'cancelled'), 0),
    COALESCE((SELECT SUM(pr.amount_in_base) FROM public.project_revenues pr WHERE pr.project_id = p.id AND pr.status <> 'cancelled'), 0)
      - COALESCE((SELECT SUM(pe.amount_in_base) FROM public.project_expenses pe WHERE pe.project_id = p.id AND pe.status <> 'cancelled'), 0),
    CASE WHEN p.budget > 0 THEN
      COALESCE((SELECT SUM(pe.amount_in_base) FROM public.project_expenses pe WHERE pe.project_id = p.id AND pe.status <> 'cancelled'), 0) / p.budget * 100
    ELSE 0 END,
    COALESCE((SELECT SUM(amount_in_base) FROM public.project_expenses WHERE project_id = p.id AND expense_category = 'materials' AND status <> 'cancelled'), 0),
    COALESCE((SELECT SUM(amount_in_base) FROM public.project_expenses WHERE project_id = p.id AND expense_category = 'labor' AND status <> 'cancelled'), 0),
    COALESCE((SELECT SUM(amount_in_base) FROM public.project_expenses WHERE project_id = p.id AND expense_category = 'equipment' AND status <> 'cancelled'), 0),
    COALESCE((SELECT SUM(amount_in_base) FROM public.project_expenses WHERE project_id = p.id AND expense_category = 'transportation' AND status <> 'cancelled'), 0),
    COALESCE((SELECT SUM(amount_in_base) FROM public.project_expenses WHERE project_id = p.id AND expense_category = 'subcontractor' AND status <> 'cancelled'), 0),
    COALESCE((SELECT SUM(amount_in_base) FROM public.project_expenses WHERE project_id = p.id AND expense_category NOT IN ('materials','labor','equipment','transportation','subcontractor') AND status <> 'cancelled'), 0),
    (SELECT COUNT(*) FROM public.project_expenses WHERE project_id = p.id),
    (SELECT COUNT(*) FROM public.project_revenues WHERE project_id = p.id)
  FROM public.projects p
  WHERE p.id = p_project_id;
$$;

CREATE OR REPLACE FUNCTION public.get_project_expenses(p_project_id uuid)
RETURNS TABLE (id uuid, expense_category text, description text, amount numeric, currency_code text, exchange_rate numeric, amount_in_base numeric, expense_date date, status text, reference_number text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, expense_category, description, amount, currency_code, exchange_rate, amount_in_base, expense_date, status, reference_number, created_at
  FROM public.project_expenses
  WHERE project_id = p_project_id
  ORDER BY expense_date DESC, created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.add_project_expense(
  p_project_id uuid,
  p_expense_category text,
  p_description text DEFAULT NULL,
  p_amount numeric DEFAULT 0,
  p_currency_code text DEFAULT 'USD',
  p_exchange_rate numeric DEFAULT 1,
  p_expense_date date DEFAULT current_date,
  p_vendor_id uuid DEFAULT NULL,
  p_partner_id uuid DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_treasury_transaction_id uuid DEFAULT NULL
)
RETURNS TABLE (success boolean, message text, expense_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_id uuid;
BEGIN
  SELECT company_id INTO v_company_id FROM public.projects WHERE id = p_project_id;
  IF v_company_id IS NULL THEN
    RETURN QUERY SELECT false, 'المشروع غير موجود', NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.project_expenses (
    company_id, project_id, expense_category, description, amount, currency_code,
    exchange_rate, amount_in_base, expense_date, vendor_id, partner_id,
    reference_number, treasury_transaction_id, status, approved_by, approved_at, recorded_by
  )
  VALUES (
    v_company_id, p_project_id, p_expense_category, p_description, p_amount, p_currency_code,
    COALESCE(p_exchange_rate, 1), p_amount * COALESCE(p_exchange_rate, 1), COALESCE(p_expense_date, current_date),
    p_vendor_id, p_partner_id, p_reference_number, p_treasury_transaction_id, 'approved', auth.uid(), now(), auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN QUERY SELECT true, 'تم تسجيل مصروف المشروع', v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_project_revenue(
  p_project_id uuid,
  p_revenue_type text,
  p_description text DEFAULT NULL,
  p_amount numeric DEFAULT 0,
  p_currency_code text DEFAULT 'USD',
  p_exchange_rate numeric DEFAULT 1,
  p_revenue_date date DEFAULT current_date,
  p_invoice_number text DEFAULT NULL,
  p_reference_number text DEFAULT NULL
)
RETURNS TABLE (success boolean, message text, revenue_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_id uuid;
BEGIN
  SELECT company_id INTO v_company_id FROM public.projects WHERE id = p_project_id;
  IF v_company_id IS NULL THEN
    RETURN QUERY SELECT false, 'المشروع غير موجود', NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.project_revenues (
    company_id, project_id, revenue_type, description, amount, currency_code,
    exchange_rate, amount_in_base, revenue_date, invoice_number, reference_number, status, recorded_by
  )
  VALUES (
    v_company_id, p_project_id, p_revenue_type, p_description, p_amount, p_currency_code,
    COALESCE(p_exchange_rate, 1), p_amount * COALESCE(p_exchange_rate, 1), COALESCE(p_revenue_date, current_date),
    p_invoice_number, p_reference_number, 'confirmed', auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN QUERY SELECT true, 'تم تسجيل إيراد المشروع', v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_partner_advance(
  p_partner_id uuid,
  p_amount numeric,
  p_currency_code text DEFAULT 'USD',
  p_description text DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_treasury_transaction_id uuid DEFAULT NULL
)
RETURNS TABLE (success boolean, message text, entry_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.financial_partners%ROWTYPE;
  v_balance numeric(20,4);
  v_id uuid;
BEGIN
  SELECT * INTO p FROM public.financial_partners WHERE id = p_partner_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'الشريك غير موجود', NULL::uuid;
    RETURN;
  END IF;
  v_balance := p.balance + p_amount;
  INSERT INTO public.partner_ledger_entries (company_id, partner_id, entry_type, amount, currency_code, balance_after, description, reference_number, treasury_transaction_id, project_id, recorded_by)
  VALUES (p.company_id, p_partner_id, 'advance_sent', p_amount, p_currency_code, v_balance, p_description, p_reference_number, p_treasury_transaction_id, p_project_id, auth.uid())
  RETURNING id INTO v_id;
  UPDATE public.financial_partners SET balance = v_balance WHERE id = p_partner_id;
  RETURN QUERY SELECT true, 'تم تسجيل السلفة', v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_partner_expense(
  p_partner_id uuid,
  p_entry_type text,
  p_amount numeric,
  p_currency_code text DEFAULT 'USD',
  p_description text DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_project_id uuid DEFAULT NULL
)
RETURNS TABLE (success boolean, message text, entry_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.financial_partners%ROWTYPE;
  v_balance numeric(20,4);
  v_id uuid;
BEGIN
  SELECT * INTO p FROM public.financial_partners WHERE id = p_partner_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'الشريك غير موجود', NULL::uuid;
    RETURN;
  END IF;
  IF p_entry_type NOT IN ('material_purchase', 'labor_cost', 'reimbursement', 'other') THEN
    RETURN QUERY SELECT false, 'نوع العملية غير صالح', NULL::uuid;
    RETURN;
  END IF;
  v_balance := p.balance - p_amount;
  INSERT INTO public.partner_ledger_entries (company_id, partner_id, entry_type, amount, currency_code, balance_after, description, reference_number, project_id, recorded_by)
  VALUES (p.company_id, p_partner_id, p_entry_type, p_amount, p_currency_code, v_balance, p_description, p_reference_number, p_project_id, auth.uid())
  RETURNING id INTO v_id;
  UPDATE public.financial_partners SET balance = v_balance WHERE id = p_partner_id;
  RETURN QUERY SELECT true, 'تم تسجيل عملية الشريك', v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_partner(
  p_partner_id uuid,
  p_settlement_amount numeric,
  p_direction text,
  p_currency_code text DEFAULT 'USD',
  p_description text DEFAULT NULL,
  p_reference_number text DEFAULT NULL
)
RETURNS TABLE (success boolean, message text, entry_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.financial_partners%ROWTYPE;
  v_delta numeric(20,4);
  v_balance numeric(20,4);
  v_id uuid;
BEGIN
  SELECT * INTO p FROM public.financial_partners WHERE id = p_partner_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'الشريك غير موجود', NULL::uuid;
    RETURN;
  END IF;
  v_delta := CASE WHEN p_direction = 'partner_pays' THEN -p_settlement_amount ELSE p_settlement_amount END;
  v_balance := p.balance + v_delta;
  INSERT INTO public.partner_ledger_entries (company_id, partner_id, entry_type, amount, currency_code, balance_after, description, reference_number, recorded_by)
  VALUES (p.company_id, p_partner_id, 'settlement', p_settlement_amount, p_currency_code, v_balance, p_description, p_reference_number, auth.uid())
  RETURNING id INTO v_id;
  UPDATE public.financial_partners SET balance = v_balance WHERE id = p_partner_id;
  RETURN QUERY SELECT true, 'تمت التسوية', v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_partner_statement(p_partner_id uuid, p_date_from date DEFAULT NULL, p_date_to date DEFAULT NULL)
RETURNS TABLE (id uuid, company_id uuid, partner_id uuid, entry_type text, amount numeric, currency_code text, balance_after numeric, description text, reference_number text, treasury_transaction_id uuid, journal_entry_id uuid, project_id uuid, recorded_by uuid, created_at timestamptz, project_name text, recorded_by_name text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT ple.id, ple.company_id, ple.partner_id, ple.entry_type, ple.amount, ple.currency_code, ple.balance_after,
         ple.description, ple.reference_number, ple.treasury_transaction_id, ple.journal_entry_id, ple.project_id,
         ple.recorded_by, ple.created_at, pr.name, pf.full_name
  FROM public.partner_ledger_entries ple
  LEFT JOIN public.projects pr ON pr.id = ple.project_id
  LEFT JOIN public.profiles pf ON pf.id = ple.recorded_by
  WHERE ple.partner_id = p_partner_id
    AND (p_date_from IS NULL OR ple.created_at::date >= p_date_from)
    AND (p_date_to IS NULL OR ple.created_at::date <= p_date_to)
  ORDER BY ple.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_partner_balance(p_partner_id uuid)
RETURNS TABLE (partner_id uuid, partner_name text, currency_code text, balance numeric, total_advances numeric, total_expenses numeric, net_balance numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT fp.id, fp.partner_name, fp.currency_code, fp.balance,
         COALESCE(SUM(CASE WHEN ple.entry_type IN ('advance_sent','advance_received','return') THEN ple.amount ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN ple.entry_type IN ('material_purchase','labor_cost','reimbursement','other') THEN ple.amount ELSE 0 END), 0),
         fp.balance
  FROM public.financial_partners fp
  LEFT JOIN public.partner_ledger_entries ple ON ple.partner_id = fp.id
  WHERE fp.id = p_partner_id
  GROUP BY fp.id;
$$;

CREATE OR REPLACE FUNCTION public.get_partners_summary()
RETURNS TABLE (id uuid, partner_code text, partner_name text, partner_name_ar text, country text, currency_code text, balance numeric, total_advances numeric, total_expenses numeric, total_entries bigint, last_entry_date timestamptz, is_active boolean)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT fp.id, fp.partner_code, fp.partner_name, fp.partner_name_ar, fp.country, fp.currency_code, fp.balance,
         COALESCE(SUM(CASE WHEN ple.entry_type IN ('advance_sent','advance_received','return') THEN ple.amount ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN ple.entry_type IN ('material_purchase','labor_cost','reimbursement','other') THEN ple.amount ELSE 0 END), 0),
         COUNT(ple.id), MAX(ple.created_at), fp.is_active
  FROM public.financial_partners fp
  LEFT JOIN public.partner_ledger_entries ple ON ple.partner_id = fp.id
  WHERE fp.company_id = public.get_user_current_company()
  GROUP BY fp.id
  ORDER BY fp.partner_name;
$$;

CREATE OR REPLACE FUNCTION public.create_supplier_invoice(
  p_supplier_id uuid,
  p_invoice_number text,
  p_invoice_date date DEFAULT current_date,
  p_due_date date DEFAULT current_date,
  p_description text DEFAULT NULL,
  p_subtotal numeric DEFAULT 0,
  p_tax_amount numeric DEFAULT 0,
  p_discount_amount numeric DEFAULT 0,
  p_total_amount numeric DEFAULT 0,
  p_currency_code text DEFAULT 'USD',
  p_exchange_rate numeric DEFAULT 1,
  p_project_id uuid DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (success boolean, message text, invoice_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.suppliers%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO s FROM public.suppliers WHERE id = p_supplier_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'المورد غير موجود', NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.supplier_invoices (
    company_id, supplier_id, invoice_number, invoice_date, due_date, description,
    subtotal, tax_amount, discount_amount, total_amount, currency_code, exchange_rate,
    project_id, reference_number, notes, status, created_by
  )
  VALUES (
    s.company_id, p_supplier_id, p_invoice_number, COALESCE(p_invoice_date, current_date), COALESCE(p_due_date, current_date), p_description,
    COALESCE(p_subtotal, 0), COALESCE(p_tax_amount, 0), COALESCE(p_discount_amount, 0),
    COALESCE(NULLIF(p_total_amount, 0), COALESCE(p_subtotal,0) + COALESCE(p_tax_amount,0) - COALESCE(p_discount_amount,0)),
    COALESCE(p_currency_code, s.currency_code), COALESCE(p_exchange_rate, 1),
    p_project_id, p_reference_number, p_notes, 'pending', auth.uid()
  )
  RETURNING id INTO v_id;

  UPDATE public.suppliers
  SET current_balance = current_balance + (SELECT total_amount FROM public.supplier_invoices WHERE id = v_id)
  WHERE id = p_supplier_id;

  RETURN QUERY SELECT true, 'تم إنشاء الفاتورة', v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.pay_supplier_invoice(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_date date DEFAULT current_date,
  p_payment_method text DEFAULT 'bank_transfer',
  p_treasury_transaction_id uuid DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS TABLE (success boolean, message text, payment_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.supplier_invoices%ROWTYPE;
  v_id uuid;
  v_payment_number text;
BEGIN
  SELECT * INTO inv FROM public.supplier_invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'الفاتورة غير موجودة', NULL::uuid;
    RETURN;
  END IF;

  v_payment_number := COALESCE(NULLIF(p_reference_number, ''), public.generate_doc_number('PAY'));
  INSERT INTO public.supplier_payments (
    company_id, supplier_id, invoice_id, payment_number, payment_date, amount,
    currency_code, exchange_rate, payment_method, treasury_transaction_id,
    reference_number, description, recorded_by
  )
  VALUES (
    inv.company_id, inv.supplier_id, inv.id, v_payment_number, COALESCE(p_payment_date, current_date), p_amount,
    inv.currency_code, inv.exchange_rate, COALESCE(p_payment_method, 'bank_transfer'), p_treasury_transaction_id,
    p_reference_number, p_description, auth.uid()
  )
  RETURNING id INTO v_id;

  UPDATE public.supplier_invoices
  SET amount_paid = LEAST(total_amount, amount_paid + p_amount),
      status = CASE WHEN LEAST(total_amount, amount_paid + p_amount) >= total_amount THEN 'paid' ELSE 'partial' END,
      updated_at = now()
  WHERE id = p_invoice_id;

  UPDATE public.suppliers
  SET current_balance = GREATEST(0, current_balance - p_amount)
  WHERE id = inv.supplier_id;

  RETURN QUERY SELECT true, 'تم تسجيل السداد', v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_supplier_statement(p_supplier_id uuid, p_date_from date DEFAULT NULL, p_date_to date DEFAULT NULL)
RETURNS TABLE (entry_type text, entry_date date, reference_number text, description text, invoice_number text, subtotal numeric, tax_amount numeric, total_amount numeric, amount_paid numeric, amount_due numeric, payment_amount numeric, payment_method text, balance numeric, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 'invoice', si.invoice_date, si.reference_number, si.description, si.invoice_number, si.subtotal, si.tax_amount,
         si.total_amount, si.amount_paid, si.amount_due, NULL::numeric, NULL::text, si.amount_due, si.created_at
  FROM public.supplier_invoices si
  WHERE si.supplier_id = p_supplier_id
    AND (p_date_from IS NULL OR si.invoice_date >= p_date_from)
    AND (p_date_to IS NULL OR si.invoice_date <= p_date_to)
  UNION ALL
  SELECT 'payment', sp.payment_date, sp.reference_number, sp.description, NULL::text, NULL::numeric, NULL::numeric,
         NULL::numeric, NULL::numeric, NULL::numeric, sp.amount, sp.payment_method, NULL::numeric, sp.created_at
  FROM public.supplier_payments sp
  WHERE sp.supplier_id = p_supplier_id
    AND (p_date_from IS NULL OR sp.payment_date >= p_date_from)
    AND (p_date_to IS NULL OR sp.payment_date <= p_date_to)
  ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_suppliers_summary()
RETURNS TABLE (id uuid, supplier_code text, supplier_name text, supplier_name_ar text, country text, currency_code text, current_balance numeric, payment_terms integer, is_active boolean, total_invoiced numeric, total_paid numeric, total_due numeric, invoices_count bigint, overdue_amount numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT s.id, s.supplier_code, s.supplier_name, s.supplier_name_ar, s.country, s.currency_code,
         s.current_balance, s.payment_terms, s.is_active,
         COALESCE(SUM(si.total_amount), 0),
         COALESCE(SUM(si.amount_paid), 0),
         COALESCE(SUM(si.amount_due), 0),
         COUNT(si.id),
         COALESCE(SUM(CASE WHEN si.due_date < current_date AND si.status IN ('pending','partial','overdue') THEN si.amount_due ELSE 0 END), 0)
  FROM public.suppliers s
  LEFT JOIN public.supplier_invoices si ON si.supplier_id = s.id
  WHERE s.company_id = public.get_user_current_company()
  GROUP BY s.id
  ORDER BY s.supplier_name;
$$;

CREATE OR REPLACE FUNCTION public.get_payables_aging()
RETURNS TABLE (supplier_id uuid, supplier_name text, currency_code text, current_due numeric, days_1_30 numeric, days_31_60 numeric, days_61_90 numeric, days_over_90 numeric, overdue_amount numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT s.id AS supplier_id, s.supplier_name, s.currency_code,
    COALESCE(SUM(CASE WHEN si.due_date >= current_date THEN si.amount_due ELSE 0 END), 0) AS current_due,
    COALESCE(SUM(CASE WHEN current_date - si.due_date BETWEEN 1 AND 30 THEN si.amount_due ELSE 0 END), 0) AS days_1_30,
    COALESCE(SUM(CASE WHEN current_date - si.due_date BETWEEN 31 AND 60 THEN si.amount_due ELSE 0 END), 0) AS days_31_60,
    COALESCE(SUM(CASE WHEN current_date - si.due_date BETWEEN 61 AND 90 THEN si.amount_due ELSE 0 END), 0) AS days_61_90,
    COALESCE(SUM(CASE WHEN current_date - si.due_date > 90 THEN si.amount_due ELSE 0 END), 0) AS days_over_90,
    COALESCE(SUM(CASE WHEN si.due_date < current_date THEN si.amount_due ELSE 0 END), 0) AS overdue_amount
  FROM public.suppliers s
  LEFT JOIN public.supplier_invoices si ON si.supplier_id = s.id AND si.status IN ('pending','partial','overdue')
  WHERE s.company_id = public.get_user_current_company()
  GROUP BY s.id, s.supplier_name, s.currency_code
  ORDER BY overdue_amount DESC;
$$;

CREATE OR REPLACE FUNCTION public.refresh_product_cost_card(p_card_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.product_cost_cards p
  SET material_cost = COALESCE((SELECT SUM(total_cost) FROM public.product_cost_components WHERE cost_card_id = p_card_id AND component_type = 'material'), 0),
      labor_cost = COALESCE((SELECT SUM(total_cost) FROM public.product_cost_components WHERE cost_card_id = p_card_id AND component_type = 'labor'), 0),
      accessory_cost = COALESCE((SELECT SUM(total_cost) FROM public.product_cost_components WHERE cost_card_id = p_card_id AND component_type = 'accessory'), 0),
      overhead_cost = COALESCE((SELECT SUM(total_cost) FROM public.product_cost_components WHERE cost_card_id = p_card_id AND component_type = 'overhead'), 0),
      total_cost = COALESCE((SELECT SUM(total_cost) FROM public.product_cost_components WHERE cost_card_id = p_card_id), 0),
      last_updated = now(),
      updated_at = now()
  WHERE p.id = p_card_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.product_component_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_product_cost_card(COALESCE(NEW.cost_card_id, OLD.cost_card_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS product_component_changed ON public.product_cost_components;
CREATE TRIGGER product_component_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.product_cost_components
  FOR EACH ROW EXECUTE FUNCTION public.product_component_changed();

CREATE OR REPLACE FUNCTION public.get_product_cost_cards()
RETURNS TABLE (id uuid, card_code text, product_name text, product_name_ar text, product_category text, unit_of_measure text, material_cost numeric, labor_cost numeric, accessory_cost numeric, overhead_cost numeric, total_cost numeric, selling_price numeric, target_margin_pct numeric, actual_margin_pct numeric, currency_code text, component_count bigint, is_active boolean)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.card_code, p.product_name, p.product_name_ar, p.product_category, p.unit_of_measure,
         p.material_cost, p.labor_cost, p.accessory_cost, p.overhead_cost, p.total_cost,
         p.selling_price, p.target_margin_pct,
         CASE WHEN p.total_cost > 0 THEN (p.selling_price - p.total_cost) / p.total_cost * 100 ELSE 0 END,
         p.currency_code,
         COUNT(c.id),
         p.is_active
  FROM public.product_cost_cards p
  LEFT JOIN public.product_cost_components c ON c.cost_card_id = p.id
  WHERE p.company_id = public.get_user_current_company()
  GROUP BY p.id
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_expenses_list(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_category text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (id uuid, expense_number text, title text, description text, amount numeric, currency_code text, amount_in_base numeric, category text, expense_date date, status text, project_name text, vendor_name text, reference_number text, is_recurring boolean, recorded_by_name text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT e.id, e.expense_number, e.title, e.description, e.amount, e.currency_code,
         COALESCE(e.amount_in_base, e.amount * e.exchange_rate), e.category, e.expense_date, e.status,
         p.name, e.vendor_name, e.reference_number, e.is_recurring, pr.full_name, e.created_at
  FROM public.expenses e
  LEFT JOIN public.projects p ON p.id = e.project_id
  LEFT JOIN public.profiles pr ON pr.id = e.recorded_by
  WHERE e.company_id = public.get_user_current_company()
    AND (p_category IS NULL OR e.category = p_category)
    AND (p_status IS NULL OR e.status = p_status)
    AND (p_start_date IS NULL OR e.expense_date >= p_start_date)
    AND (p_end_date IS NULL OR e.expense_date <= p_end_date)
    AND (p_search IS NULL OR e.title ILIKE '%' || p_search || '%' OR COALESCE(e.description, '') ILIKE '%' || p_search || '%')
  ORDER BY e.expense_date DESC, e.created_at DESC
  LIMIT COALESCE(p_limit, 50) OFFSET COALESCE(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.get_expenses_summary(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT *
    FROM public.expenses
    WHERE company_id = public.get_user_current_company()
      AND (p_start_date IS NULL OR expense_date >= p_start_date)
      AND (p_end_date IS NULL OR expense_date <= p_end_date)
      AND (p_category IS NULL OR category = p_category)
      AND (p_status IS NULL OR status = p_status)
  ),
  cats AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('category', category, 'total', total, 'count', count)), '[]'::jsonb) AS category_breakdown
    FROM (
      SELECT category, SUM(amount_in_base) AS total, COUNT(*) AS count
      FROM filtered
      GROUP BY category
    ) x
  )
  SELECT jsonb_build_object(
    'total_amount', COALESCE((SELECT SUM(amount_in_base) FROM filtered), 0),
    'approved_amount', COALESCE((SELECT SUM(amount_in_base) FROM filtered WHERE status IN ('approved','paid')), 0),
    'pending_amount', COALESCE((SELECT SUM(amount_in_base) FROM filtered WHERE status = 'pending'), 0),
    'rejected_amount', COALESCE((SELECT SUM(amount_in_base) FROM filtered WHERE status = 'rejected'), 0),
    'total_count', COALESCE((SELECT COUNT(*) FROM filtered), 0),
    'category_breakdown', cats.category_breakdown
  )
  FROM cats;
$$;

CREATE OR REPLACE FUNCTION public.create_expense(
  p_title text,
  p_category text,
  p_amount numeric,
  p_expense_date date DEFAULT current_date,
  p_description text DEFAULT NULL,
  p_currency_code text DEFAULT 'USD',
  p_exchange_rate numeric DEFAULT 1,
  p_project_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_partner_id uuid DEFAULT NULL,
  p_employee_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT 'cash',
  p_treasury_account_id uuid DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_vendor_name text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_requires_approval boolean DEFAULT true
)
RETURNS TABLE (success boolean, message text, expense_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_company_id uuid := public.get_user_current_company();
BEGIN
  INSERT INTO public.expenses (
    company_id, expense_number, title, description, amount, currency_code, exchange_rate,
    amount_in_base, category, expense_date, project_id, supplier_id, partner_id, employee_id,
    payment_method, treasury_account_id, reference_number, vendor_name, notes, status, recorded_by, created_by
  )
  VALUES (
    v_company_id, public.generate_doc_number('EXP'), p_title, p_description, p_amount, p_currency_code, COALESCE(p_exchange_rate, 1),
    p_amount * COALESCE(p_exchange_rate, 1), p_category, COALESCE(p_expense_date, current_date), p_project_id, p_supplier_id, p_partner_id, p_employee_id,
    p_payment_method, p_treasury_account_id, p_reference_number, p_vendor_name, p_notes,
    CASE WHEN p_requires_approval THEN 'pending' ELSE 'approved' END, auth.uid(), auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN QUERY SELECT true, 'تم تسجيل المصروف', v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_expense(p_expense_id uuid, p_rejection_reason text DEFAULT NULL)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.expenses
  SET status = CASE WHEN p_rejection_reason IS NULL THEN 'approved' ELSE 'rejected' END,
      rejection_reason = p_rejection_reason,
      approved_by = auth.uid(),
      approved_at = now(),
      updated_at = now()
  WHERE id = p_expense_id AND status IN ('draft', 'pending');

  RETURN QUERY SELECT true, CASE WHEN p_rejection_reason IS NULL THEN 'تم اعتماد المصروف' ELSE 'تم رفض المصروف' END;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_expense_paid(p_expense_id uuid, p_treasury_account_id uuid DEFAULT NULL)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e public.expenses%ROWTYPE;
BEGIN
  SELECT * INTO e FROM public.expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'المصروف غير موجود';
    RETURN;
  END IF;

  UPDATE public.expenses
  SET status = 'paid',
      treasury_account_id = COALESCE(p_treasury_account_id, treasury_account_id),
      updated_at = now()
  WHERE id = p_expense_id;

  IF COALESCE(p_treasury_account_id, e.treasury_account_id) IS NOT NULL THEN
    UPDATE public.accounts
    SET balance = balance - e.amount_in_base
    WHERE id = COALESCE(p_treasury_account_id, e.treasury_account_id);
  END IF;

  RETURN QUERY SELECT true, 'تم تسجيل الدفع';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_alert_logs(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_severity text DEFAULT NULL, p_is_read boolean DEFAULT NULL)
RETURNS TABLE (id uuid, company_id uuid, alert_rule_id uuid, alert_type text, severity text, title text, message text, entity_type text, entity_id uuid, is_read boolean, is_dismissed boolean, read_by uuid, read_at timestamptz, action_taken text, action_by uuid, action_at timestamptz, metadata jsonb, triggered_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, company_id, alert_rule_id, alert_type, severity, title, message, entity_type, entity_id,
         is_read, is_dismissed, read_by, read_at, action_taken, action_by, action_at, metadata, triggered_at
  FROM public.alert_logs
  WHERE company_id = public.get_user_current_company()
    AND is_dismissed = false
    AND (p_severity IS NULL OR severity = p_severity)
    AND (p_is_read IS NULL OR is_read = p_is_read)
  ORDER BY triggered_at DESC
  LIMIT COALESCE(p_limit, 20) OFFSET COALESCE(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.get_notification_preferences()
RETURNS public.notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pref public.notification_preferences%ROWTYPE;
BEGIN
  INSERT INTO public.notification_preferences (user_id, company_id)
  VALUES (auth.uid(), public.get_user_current_company())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_pref FROM public.notification_preferences WHERE user_id = auth.uid();
  RETURN v_pref;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_notification_preferences(
  p_push_approval boolean DEFAULT true,
  p_push_transaction boolean DEFAULT true,
  p_push_alert boolean DEFAULT true,
  p_push_info boolean DEFAULT true,
  p_push_summary boolean DEFAULT false,
  p_treasury_low_balance_alert boolean DEFAULT true,
  p_treasury_low_balance_threshold numeric DEFAULT 1000,
  p_partner_outstanding_alert boolean DEFAULT true,
  p_partner_outstanding_threshold numeric DEFAULT 5000,
  p_supplier_overdue_alert boolean DEFAULT true,
  p_supplier_overdue_days integer DEFAULT 7,
  p_project_budget_alert boolean DEFAULT true,
  p_project_budget_threshold_pct numeric DEFAULT 80,
  p_expense_approval_alert boolean DEFAULT true,
  p_email_approval boolean DEFAULT false,
  p_email_alert boolean DEFAULT false,
  p_email_summary_daily boolean DEFAULT false,
  p_email_summary_weekly boolean DEFAULT false,
  p_quiet_hours_enabled boolean DEFAULT false,
  p_quiet_hours_start text DEFAULT '22:00',
  p_quiet_hours_end text DEFAULT '07:00'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (
    user_id, company_id, push_approval, push_transaction, push_alert, push_info, push_summary,
    treasury_low_balance_alert, treasury_low_balance_threshold, partner_outstanding_alert, partner_outstanding_threshold,
    supplier_overdue_alert, supplier_overdue_days, project_budget_alert, project_budget_threshold_pct, expense_approval_alert,
    email_approval, email_alert, email_summary_daily, email_summary_weekly, quiet_hours_enabled, quiet_hours_start, quiet_hours_end
  )
  VALUES (
    auth.uid(), public.get_user_current_company(), p_push_approval, p_push_transaction, p_push_alert, p_push_info, p_push_summary,
    p_treasury_low_balance_alert, p_treasury_low_balance_threshold, p_partner_outstanding_alert, p_partner_outstanding_threshold,
    p_supplier_overdue_alert, p_supplier_overdue_days, p_project_budget_alert, p_project_budget_threshold_pct, p_expense_approval_alert,
    p_email_approval, p_email_alert, p_email_summary_daily, p_email_summary_weekly, p_quiet_hours_enabled, p_quiet_hours_start, p_quiet_hours_end
  )
  ON CONFLICT (user_id) DO UPDATE SET
    push_approval = EXCLUDED.push_approval,
    push_transaction = EXCLUDED.push_transaction,
    push_alert = EXCLUDED.push_alert,
    push_info = EXCLUDED.push_info,
    push_summary = EXCLUDED.push_summary,
    treasury_low_balance_alert = EXCLUDED.treasury_low_balance_alert,
    treasury_low_balance_threshold = EXCLUDED.treasury_low_balance_threshold,
    partner_outstanding_alert = EXCLUDED.partner_outstanding_alert,
    partner_outstanding_threshold = EXCLUDED.partner_outstanding_threshold,
    supplier_overdue_alert = EXCLUDED.supplier_overdue_alert,
    supplier_overdue_days = EXCLUDED.supplier_overdue_days,
    project_budget_alert = EXCLUDED.project_budget_alert,
    project_budget_threshold_pct = EXCLUDED.project_budget_threshold_pct,
    expense_approval_alert = EXCLUDED.expense_approval_alert,
    email_approval = EXCLUDED.email_approval,
    email_alert = EXCLUDED.email_alert,
    email_summary_daily = EXCLUDED.email_summary_daily,
    email_summary_weekly = EXCLUDED.email_summary_weekly,
    quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
    quiet_hours_start = EXCLUDED.quiet_hours_start,
    quiet_hours_end = EXCLUDED.quiet_hours_end,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_alert_read(p_alert_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.alert_logs
  SET is_read = true, read_by = auth.uid(), read_at = now()
  WHERE id = p_alert_id;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_alert(p_alert_id uuid, p_action_taken text DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.alert_logs
  SET is_dismissed = true, action_taken = p_action_taken, action_by = auth.uid(), action_at = now()
  WHERE id = p_alert_id;
$$;

CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_entity_id uuid;
BEGIN
  v_company_id := COALESCE((to_jsonb(NEW)->>'company_id')::uuid, (to_jsonb(OLD)->>'company_id')::uuid);
  v_entity_id := COALESCE((to_jsonb(NEW)->>'id')::uuid, (to_jsonb(OLD)->>'id')::uuid);

  INSERT INTO public.audit_logs (company_id, user_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (v_company_id, auth.uid(), TG_OP, TG_TABLE_NAME, v_entity_id, to_jsonb(OLD), to_jsonb(NEW));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'accounts','transactions','transfers','projects','journal_entries','treasuries',
    'treasury_transactions','financial_partners','partner_ledger_entries','suppliers',
    'supplier_invoices','supplier_payments','project_expenses','project_revenues',
    'expenses','product_cost_cards','product_cost_components'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I_changes ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER audit_%I_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes()', t, t);
  END LOOP;
END $$;

-- Data rescue/backfill for old partial schemas. Existing rows without a
-- company are attached to the starter company before strict RLS is installed.
INSERT INTO public.companies (id, company_name, company_name_ar, country, default_currency)
VALUES ('00000000-0000-4000-8000-000000000001', 'ORI Finance Pro', 'أوري فاينانس برو', 'LY', 'LYD')
ON CONFLICT (id) DO UPDATE SET
  company_name = COALESCE(public.companies.company_name, EXCLUDED.company_name),
  company_name_ar = COALESCE(public.companies.company_name_ar, EXCLUDED.company_name_ar),
  country = COALESCE(public.companies.country, EXCLUDED.country),
  default_currency = COALESCE(public.companies.default_currency, EXCLUDED.default_currency),
  updated_at = now();

DO $$
DECLARE
  v_company_id uuid;
  t text;
BEGIN
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE is_active = true
  ORDER BY created_at
  LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    FOREACH t IN ARRAY ARRAY[
      'accounts','projects','transactions','transfers','approvals','journal_entries',
      'journal_entry_lines','treasuries','treasury_transactions','currency_rates',
      'financial_partners','partner_ledger_entries','suppliers','supplier_invoices',
      'supplier_payments','project_expenses','project_revenues','expenses',
      'product_cost_cards','product_cost_components','alert_rules','alert_logs',
      'audit_logs','login_history'
    ]
    LOOP
      EXECUTE format('UPDATE public.%I SET company_id = $1 WHERE company_id IS NULL', t) USING v_company_id;
    END LOOP;

    UPDATE public.profiles
    SET default_company_id = v_company_id
    WHERE default_company_id IS NULL;
  END IF;
END $$;

-- RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_cost_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_cost_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.install_policy_if_missing(p_table text, p_policy text, p_sql text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = p_table AND policyname = p_policy
  ) THEN
    EXECUTE p_sql;
  END IF;
END;
$$;

SELECT public.install_policy_if_missing('profiles', 'profiles_select', 'CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_super_admin() OR EXISTS (SELECT 1 FROM public.user_companies viewer JOIN public.user_companies target ON target.company_id = viewer.company_id WHERE viewer.user_id = auth.uid() AND target.user_id = profiles.id))');
SELECT public.install_policy_if_missing('profiles', 'profiles_update_own', 'CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_super_admin() OR public.user_is_company_admin(default_company_id)) WITH CHECK (id = auth.uid() OR public.is_super_admin() OR public.user_is_company_admin(default_company_id))');

SELECT public.install_policy_if_missing('companies', 'companies_member_select', 'CREATE POLICY companies_member_select ON public.companies FOR SELECT TO authenticated USING (public.user_is_company_member(id) OR public.is_super_admin())');
SELECT public.install_policy_if_missing('companies', 'companies_admin_write', 'CREATE POLICY companies_admin_write ON public.companies FOR ALL TO authenticated USING (public.user_is_company_admin(id)) WITH CHECK (public.user_is_company_admin(id))');

SELECT public.install_policy_if_missing('user_companies', 'user_companies_select', 'CREATE POLICY user_companies_select ON public.user_companies FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.user_is_company_admin(company_id) OR public.is_super_admin())');
SELECT public.install_policy_if_missing('user_companies', 'user_companies_admin_write', 'CREATE POLICY user_companies_admin_write ON public.user_companies FOR ALL TO authenticated USING (public.user_is_company_admin(company_id) OR public.is_super_admin()) WITH CHECK (public.user_is_company_admin(company_id) OR public.is_super_admin())');

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'accounts','projects','transactions','transfers','approvals','journal_entries',
    'journal_entry_lines','treasuries','treasury_transactions','currency_rates',
    'financial_partners','partner_ledger_entries','suppliers','supplier_invoices',
    'supplier_payments','project_expenses','project_revenues','expenses',
    'product_cost_cards','product_cost_components','alert_rules','alert_logs',
    'audit_logs','login_history'
  ]
  LOOP
    PERFORM public.install_policy_if_missing(
      t,
      t || '_company_access',
      format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.user_is_company_member(company_id) OR public.is_super_admin()) WITH CHECK (public.user_is_company_member(company_id) OR public.is_super_admin())', t || '_company_access', t)
    );
  END LOOP;
END $$;

SELECT public.install_policy_if_missing('notifications', 'notifications_own', 'CREATE POLICY notifications_own ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_super_admin()) WITH CHECK (user_id = auth.uid() OR public.is_super_admin())');
SELECT public.install_policy_if_missing('push_subscriptions', 'push_subscriptions_own', 'CREATE POLICY push_subscriptions_own ON public.push_subscriptions FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_super_admin()) WITH CHECK (user_id = auth.uid() OR public.is_super_admin())');
SELECT public.install_policy_if_missing('notification_preferences', 'notification_preferences_own', 'CREATE POLICY notification_preferences_own ON public.notification_preferences FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_super_admin()) WITH CHECK (user_id = auth.uid() OR public.is_super_admin())');

DROP FUNCTION public.install_policy_if_missing(text, text, text);

-- Minimal seed data that does not depend on a fixed auth.users row.
INSERT INTO public.accounts (company_id, code, name, name_ar, type, balance, currency, status)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'CASH-LYD', 'Main Cashbox', 'الصندوق الرئيسي', 'cashbox', 0, 'LYD', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'BANK-LYD', 'Main Bank', 'الحساب البنكي الرئيسي', 'bank', 0, 'LYD', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'INC-SALES', 'Sales Income', 'إيرادات المبيعات', 'income', 0, 'LYD', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'EXP-GEN', 'General Expenses', 'مصروفات عامة', 'expense', 0, 'LYD', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'TEMP-001', 'Temporary Account', 'حساب مؤقت', 'temporary', 0, 'LYD', 'active')
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO public.treasuries (company_id, treasury_code, treasury_name, treasury_name_ar, treasury_type, currency_code, opening_balance, current_balance)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'SAFE-LYD', 'Main Safe', 'الخزينة الرئيسية', 'cashbox', 'LYD', 0, 0),
  ('00000000-0000-4000-8000-000000000001', 'BANK-USD', 'USD Bank Reserve', 'احتياطي الدولار', 'bank', 'USD', 0, 0)
ON CONFLICT (company_id, treasury_code) DO NOTHING;

-- Grants required by PostgREST/Supabase client.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.companies TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;

COMMIT;
