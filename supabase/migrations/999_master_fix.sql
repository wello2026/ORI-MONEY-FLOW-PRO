-- ORIFinancial ERP — Complete Clean Migration
-- DROP all existing tables first, then CREATE everything fresh.

-- ============================================================
-- STEP 1: DROP ALL EXISTING TABLES (dependency order)
-- ============================================================

DROP TABLE IF EXISTS product_cost_components CASCADE;
DROP TABLE IF EXISTS product_cost_cards CASCADE;
DROP TABLE IF EXISTS supplier_payments CASCADE;
DROP TABLE IF EXISTS supplier_invoices CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS partner_ledger_entries CASCADE;
DROP TABLE IF EXISTS financial_partners CASCADE;
DROP TABLE IF EXISTS treasury_transactions CASCADE;
DROP TABLE IF EXISTS treasuries CASCADE;
DROP TABLE IF EXISTS project_revenues CASCADE;
DROP TABLE IF EXISTS project_expenses CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS journal_entry_lines CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS alert_logs CASCADE;
DROP TABLE IF EXISTS alert_rules CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS user_companies CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS login_history CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- ============================================================
-- STEP 2: CREATE ALL TABLES (dependency order)
-- ============================================================

-- companies (no dependencies)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_name_ar TEXT,
  country TEXT,
  city TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  default_currency TEXT DEFAULT 'LYD',
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- profiles (depends on auth.users + companies)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('super_admin','owner','admin','accountant','treasury','operations','viewer')),
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  device_info JSONB,
  last_login TIMESTAMPTZ,
  default_company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_companies
CREATE TABLE user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'viewer' CHECK (user_role IN ('owner','admin','accountant','treasury','operations','viewer')),
  is_current BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  owner_id UUID REFERENCES profiles(id),
  account_number TEXT,
  account_name TEXT NOT NULL,
  account_name_ar TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  parent_id UUID REFERENCES accounts(id),
  balance NUMERIC(20,4) DEFAULT 0,
  currency TEXT DEFAULT 'LYD',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  is_active BOOLEAN DEFAULT true,
  allow_negative BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, account_number)
);

-- transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  account_id UUID REFERENCES accounts(id),
  transaction_type TEXT NOT NULL,
  amount NUMERIC(20,4) NOT NULL,
  currency TEXT DEFAULT 'LYD',
  exchange_rate NUMERIC(18,8) DEFAULT 1,
  description TEXT,
  reference_number TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- transfers
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  from_account_id UUID REFERENCES accounts(id),
  to_account_id UUID REFERENCES accounts(id),
  amount NUMERIC(20,4) NOT NULL,
  currency TEXT DEFAULT 'LYD',
  exchange_rate NUMERIC(18,8) DEFAULT 1,
  destination_amount NUMERIC(20,4),
  destination_currency TEXT,
  description TEXT,
  reference_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  code TEXT,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('planning','active','on_hold','completed','cancelled')),
  start_date DATE,
  end_date DATE,
  budget NUMERIC(20,4),
  currency TEXT DEFAULT 'LYD',
  manager_id UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- approvals
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  approval_type TEXT NOT NULL,
  requested_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  notes TEXT,
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  contact_type TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  address TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- journal_entries
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  entry_number TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  reference_number TEXT,
  source_type TEXT,
  source_id UUID,
  is_posted BOOLEAN DEFAULT false,
  posted_by UUID REFERENCES profiles(id),
  posted_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- journal_entry_lines
CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  debit NUMERIC(20,4) DEFAULT 0,
  credit NUMERIC(20,4) DEFAULT 0,
  description TEXT,
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- treasuries
CREATE TABLE treasuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  treasury_code TEXT NOT NULL,
  treasury_name TEXT NOT NULL,
  treasury_name_ar TEXT,
  treasury_type TEXT NOT NULL DEFAULT 'cashbox' CHECK (treasury_type IN ('cashbox','bank','reserve','petty_cash','escrow')),
  currency_code TEXT NOT NULL DEFAULT 'LYD',
  country TEXT,
  opening_balance NUMERIC(20,4) DEFAULT 0,
  current_balance NUMERIC(20,4) DEFAULT 0,
  bank_name TEXT,
  account_number TEXT,
  iban TEXT,
  swift TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  allow_overdraft BOOLEAN DEFAULT false,
  min_balance NUMERIC(20,4) DEFAULT 0,
  max_balance NUMERIC(20,4),
  alert_threshold NUMERIC(20,4),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, treasury_code)
);

-- treasury_transactions
CREATE TABLE treasury_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  treasury_id UUID,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit','withdrawal','transfer_in','transfer_out','exchange_in','exchange_out','adjustment','reconciliation')),
  amount NUMERIC(20,4) NOT NULL,
  currency_code TEXT NOT NULL,
  exchange_rate NUMERIC(18,8) DEFAULT 1,
  destination_amount NUMERIC(20,4),
  destination_currency TEXT,
  destination_treasury_id UUID REFERENCES treasuries(id),
  description TEXT,
  reference_number TEXT,
  project_id UUID REFERENCES projects(id),
  partner_id UUID,
  journal_entry_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- financial_partners
CREATE TABLE financial_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  partner_code TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  partner_name_ar TEXT,
  partner_type TEXT DEFAULT 'vendor' CHECK (partner_type IN ('vendor','manufacturer','subcontractor','consultant','other')),
  country TEXT,
  city TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  preferred_currency TEXT DEFAULT 'USD',
  balance NUMERIC(20,4) DEFAULT 0,
  credit_limit NUMERIC(20,4),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, partner_code)
);

-- partner_ledger_entries
CREATE TABLE partner_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  partner_id UUID NOT NULL REFERENCES financial_partners(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('advance_sent','advance_returned','material_purchase','labor_cost','reimbursement','settlement','adjustment','initial')),
  amount NUMERIC(20,4) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(18,8) DEFAULT 1,
  amount_in_base NUMERIC(20,4),
  balance_after NUMERIC(20,4) NOT NULL,
  description TEXT,
  reference_number TEXT,
  treasury_transaction_id UUID,
  journal_entry_id UUID,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  supplier_code TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_name_ar TEXT,
  contact_person TEXT,
  country TEXT,
  city TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  payment_terms TEXT DEFAULT 'net_30',
  current_balance NUMERIC(20,4) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, supplier_code)
);

-- supplier_invoices
CREATE TABLE supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  total_amount NUMERIC(20,4) NOT NULL,
  paid_amount NUMERIC(20,4) DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'LYD',
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','overdue','cancelled')),
  project_id UUID REFERENCES projects(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);

-- supplier_payments
CREATE TABLE supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  invoice_id UUID REFERENCES supplier_invoices(id) ON DELETE SET NULL,
  payment_number TEXT,
  amount NUMERIC(20,4) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'LYD',
  payment_method TEXT DEFAULT 'bank' CHECK (payment_method IN ('cash','bank','cheque','transfer','card')),
  payment_date DATE DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  treasury_account_id UUID REFERENCES accounts(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- product_cost_cards
CREATE TABLE product_cost_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_name_ar TEXT,
  unit TEXT DEFAULT 'unit',
  total_cost NUMERIC(20,4) DEFAULT 0,
  selling_price NUMERIC(20,4),
  currency TEXT DEFAULT 'USD',
  margin_percentage NUMERIC(5,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, product_code)
);

-- product_cost_components
CREATE TABLE product_cost_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  cost_card_id UUID NOT NULL REFERENCES product_cost_cards(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL CHECK (component_type IN ('material','labor','accessory','overhead','other')),
  component_name TEXT NOT NULL,
  unit_cost NUMERIC(20,4) DEFAULT 0,
  quantity NUMERIC(20,4) DEFAULT 1,
  total_cost NUMERIC(20,4) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  supplier_id UUID REFERENCES suppliers(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- project_expenses
CREATE TABLE project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  expense_category TEXT NOT NULL CHECK (expense_category IN ('materials','labor','equipment','transportation','subcontractor','permits','utilities','insurance','maintenance','consulting','other')),
  description TEXT,
  amount NUMERIC(20,4) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(20,4) DEFAULT 1,
  amount_in_base NUMERIC(20,4),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_id UUID REFERENCES suppliers(id),
  partner_id UUID,
  treasury_transaction_id UUID,
  journal_entry_id UUID,
  receipt_url TEXT,
  reference_number TEXT,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- project_revenues
CREATE TABLE project_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  revenue_type TEXT NOT NULL CHECK (revenue_type IN ('contract_value','change_order','milestone_payment','advance_received','final_payment','penalty','other')),
  description TEXT,
  amount NUMERIC(20,4) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(20,4) DEFAULT 1,
  amount_in_base NUMERIC(20,4),
  revenue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number TEXT,
  treasury_transaction_id UUID,
  journal_entry_id UUID,
  reference_number TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','invoiced','received','cancelled')),
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  expense_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(20,4) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(20,4) DEFAULT 1,
  amount_in_base NUMERIC(20,4),
  category TEXT NOT NULL CHECK (category IN ('rent','utilities','salaries','supplies','equipment','maintenance','insurance','marketing','travel','training','consulting','legal','licenses','software','fuel','communication','other')),
  project_id UUID REFERENCES projects(id),
  supplier_id UUID REFERENCES suppliers(id),
  partner_id UUID,
  employee_id UUID REFERENCES profiles(id),
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash','bank','cheque','transfer','card')),
  treasury_account_id UUID REFERENCES accounts(id),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  reference_number TEXT,
  vendor_name TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('draft','pending','approved','rejected','paid','cancelled')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  is_recurring BOOLEAN DEFAULT false,
  journal_entry_id UUID,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  action_url TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- push_subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- alert_rules
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('treasury_balance','partner_outstanding','supplier_overdue','project_budget','expense_threshold','custom')),
  target_id UUID,
  threshold_value NUMERIC(20,4),
  comparison_operator TEXT DEFAULT 'less_than' CHECK (comparison_operator IN ('less_than','greater_than','equals')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  is_enabled BOOLEAN DEFAULT true,
  notification_channels TEXT[] DEFAULT ARRAY['in_app'],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- alert_logs
CREATE TABLE alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  alert_rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  related_entity_type TEXT,
  related_entity_id UUID,
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

-- notification_preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,
  treasury_balance_threshold NUMERIC(20,4),
  partner_outstanding_threshold NUMERIC(20,4),
  supplier_overdue_threshold NUMERIC(20,4),
  project_budget_threshold NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- login_history
CREATE TABLE login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 3: SECURITY FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_current_company()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT company_id FROM user_companies
    WHERE user_id = auth.uid() AND is_current = true LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_has_company_access(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = p_company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_company_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = auth.uid() AND company_id = get_user_current_company() AND user_role IN ('owner','admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_companies()
RETURNS TABLE (company_id UUID, company_name TEXT, company_name_ar TEXT, country TEXT, default_currency TEXT, role TEXT, is_current BOOLEAN) AS $$
BEGIN
  RETURN QUERY SELECT c.id, c.company_name, c.company_name_ar, c.country, c.default_currency, uc.user_role AS role, uc.is_current
  FROM companies c JOIN user_companies uc ON uc.company_id = c.id
  WHERE uc.user_id = auth.uid() ORDER BY uc.is_current DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION make_current_company(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT user_has_company_access(p_company_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  UPDATE user_companies SET is_current = false WHERE user_id = auth.uid();
  UPDATE user_companies SET is_current = true WHERE user_id = auth.uid() AND company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 3b: BUSINESS LOGIC RPC FUNCTIONS
-- ============================================================

-- Trial Balance
CREATE OR REPLACE FUNCTION get_trial_balance(p_company_id UUID DEFAULT NULL, p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (account_id UUID, account_number TEXT, account_name TEXT, account_type TEXT, debit NUMERIC, credit NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.account_number, a.account_name, a.account_type,
    COALESCE(SUM(jel.debit), 0) AS debit,
    COALESCE(SUM(jel.credit), 0) AS credit
  FROM accounts a
  LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.is_posted = true
  WHERE je.entry_date <= p_as_of_date
    AND (p_company_id IS NULL OR a.company_id = p_company_id)
    AND (p_company_id IS NULL OR je.company_id = p_company_id OR je.company_id IS NULL)
  GROUP BY a.id, a.account_number, a.account_name, a.account_type
  ORDER BY a.account_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- General Journal
CREATE OR REPLACE FUNCTION get_general_journal(p_company_id UUID DEFAULT NULL, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (entry_id UUID, entry_number TEXT, entry_date DATE, description TEXT, account_id UUID, account_name TEXT, debit NUMERIC, credit NUMERIC, source_type TEXT, source_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT
    je.id, je.entry_number, je.entry_date, je.description,
    a.id, a.account_name,
    jel.debit, jel.credit,
    je.source_type, je.source_id
  FROM journal_entries je
  JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
  JOIN accounts a ON a.id = jel.account_id
  WHERE je.is_posted = true
    AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
    AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
    AND (p_company_id IS NULL OR je.company_id = p_company_id)
  ORDER BY je.entry_date DESC, je.entry_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Income Statement
CREATE OR REPLACE FUNCTION get_income_statement(p_company_id UUID DEFAULT NULL, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (account_id UUID, account_number TEXT, account_name TEXT, account_type TEXT, total NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.account_number, a.account_name, a.account_type,
    COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) AS total
  FROM accounts a
  LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.is_posted = true
  WHERE a.account_type IN ('revenue','expense')
    AND je.entry_date >= COALESCE(p_start_date, DATE_TRUNC('year', CURRENT_DATE))
    AND je.entry_date <= COALESCE(p_end_date, CURRENT_DATE)
    AND (p_company_id IS NULL OR a.company_id = p_company_id)
  GROUP BY a.id, a.account_number, a.account_name, a.account_type
  ORDER BY a.account_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Balance Sheet
CREATE OR REPLACE FUNCTION get_balance_sheet(p_company_id UUID DEFAULT NULL, p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (account_id UUID, account_number TEXT, account_name TEXT, account_type TEXT, balance NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.account_number, a.account_name, a.account_type,
    COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) AS balance
  FROM accounts a
  LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.is_posted = true
  WHERE a.account_type IN ('asset','liability','equity')
    AND je.entry_date <= p_as_of_date
    AND (p_company_id IS NULL OR a.company_id = p_company_id)
  GROUP BY a.id, a.account_number, a.account_name, a.account_type
  ORDER BY a.account_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Account Ledger
CREATE OR REPLACE FUNCTION get_account_ledger(p_account_id UUID, p_company_id UUID DEFAULT NULL, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (entry_id UUID, entry_number TEXT, entry_date DATE, description TEXT, debit NUMERIC, credit NUMERIC, running_balance NUMERIC) AS $$
DECLARE v_running NUMERIC := 0;
BEGIN
  FOR entry_id, entry_number, entry_date, description, debit, credit IN
    SELECT je.id, COALESCE(je.entry_number,''), COALESCE(je.entry_date, CURRENT_DATE), COALESCE(je.description,''), COALESCE(jel.debit,0), COALESCE(jel.credit,0)
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    WHERE jel.account_id = p_account_id
      AND je.is_posted = true
      AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
      AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
      AND (p_company_id IS NULL OR je.company_id = p_company_id)
    ORDER BY je.entry_date, je.created_at
  LOOP
    v_running := v_running + debit - credit;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create Journal Entry
CREATE OR REPLACE FUNCTION create_journal_entry(
  p_entry_date DATE, p_description TEXT, p_lines JSONB,
  p_source_type TEXT DEFAULT NULL, p_source_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE v_entry_id UUID; v_total_debit NUMERIC; v_total_credit NUMERIC;
BEGIN
  SELECT INTO v_total_debit, v_total_credit
    COALESCE(SUM((l->>'debit')::NUMERIC), 0), COALESCE(SUM((l->>'credit')::NUMERIC), 0)
  FROM jsonb_array_elements(p_lines) l;
  IF v_total_debit <> v_total_credit THEN
    RAISE EXCEPTION 'Journal entry must be balanced. Debit: % Credit: %', v_total_debit, v_total_credit;
  END IF;
  INSERT INTO journal_entries (company_id, entry_date, description, source_type, source_id, created_by)
  VALUES (get_user_current_company(), p_entry_date, p_description, p_source_type, p_source_id, auth.uid())
  RETURNING id INTO v_entry_id;
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, company_id)
  SELECT v_entry_id, (l->>'account_id')::UUID, COALESCE((l->>'debit')::NUMERIC,0), COALESCE((l->>'credit')::NUMERIC,0), l->>'description', get_user_current_company()
  FROM jsonb_array_elements(p_lines) l;
  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search Accounts for Journal
CREATE OR REPLACE FUNCTION search_accounts_for_journal(p_search TEXT DEFAULT '', p_company_id UUID DEFAULT NULL, p_limit INT DEFAULT 20)
RETURNS TABLE (id UUID, account_number TEXT, account_name TEXT, account_name_ar TEXT, account_type TEXT, balance NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.account_number, a.account_name, a.account_name_ar, a.account_type, a.balance
  FROM accounts a
  WHERE a.is_active = true
    AND (p_search = '' OR a.account_name ILIKE '%' || p_search || '%' OR a.account_name_ar ILIKE '%' || p_search || '%' OR a.account_number ILIKE '%' || p_search || '%')
    AND (p_company_id IS NULL OR a.company_id = p_company_id)
  ORDER BY a.account_number LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Approve Transaction
CREATE OR REPLACE FUNCTION approve_transaction(p_transaction_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE transactions SET status = 'approved', approved_by = auth.uid(), approved_at = NOW()
  WHERE id = p_transaction_id AND status = 'pending';
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve Transfer
CREATE OR REPLACE FUNCTION approve_transfer(p_transfer_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE transfers SET status = 'approved', approved_by = auth.uid(), approved_at = NOW()
  WHERE id = p_transfer_id AND status = 'pending';
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve Treasury Transaction
CREATE OR REPLACE FUNCTION approve_treasury_transaction(p_transaction_id UUID)
RETURNS BOOLEAN AS $$
DECLARE v_treasury_id UUID; v_amount NUMERIC; v_type TEXT;
BEGIN
  SELECT treasury_id, amount, transaction_type INTO v_treasury_id, v_amount, v_type
  FROM treasury_transactions WHERE id = p_transaction_id AND status = 'pending';
  IF NOT FOUND THEN RETURN FALSE; END IF;
  UPDATE treasury_transactions SET status = 'approved', approved_by = auth.uid(), approved_at = NOW()
  WHERE id = p_transaction_id;
  UPDATE treasuries SET current_balance = current_balance +
    CASE v_type WHEN 'deposit' THEN v_amount WHEN 'withdrawal' THEN -v_amount
    WHEN 'transfer_in' THEN v_amount WHEN 'transfer_out' THEN -v_amount
    ELSE 0 END
  WHERE id = v_treasury_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Currency Transfer
CREATE OR REPLACE FUNCTION create_currency_transfer(
  p_from_treasury UUID, p_to_treasury UUID, p_amount NUMERIC,
  p_from_currency TEXT, p_to_currency TEXT, p_exchange_rate NUMERIC, p_description TEXT
) RETURNS UUID AS $$
DECLARE v_transfer_id UUID; v_dest_amount NUMERIC;
BEGIN
  v_dest_amount := p_amount * p_exchange_rate;
  INSERT INTO treasury_transactions (company_id, treasury_id, transaction_type, amount, currency_code, exchange_rate, destination_amount, destination_currency, destination_treasury_id, description, created_by)
  VALUES (get_user_current_company(), p_from_treasury, 'transfer_out', p_amount, p_from_currency, p_exchange_rate, v_dest_amount, p_to_currency, p_to_treasury, p_description, auth.uid())
  RETURNING id INTO v_transfer_id;
  INSERT INTO treasury_transactions (company_id, treasury_id, transaction_type, amount, currency_code, exchange_rate, destination_amount, destination_currency, destination_treasury_id, description, created_by)
  VALUES (get_user_current_company(), p_to_treasury, 'transfer_in', v_dest_amount, p_to_currency, 1, p_amount, p_from_currency, p_from_treasury, p_description, auth.uid());
  RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expense Management RPCs
CREATE OR REPLACE FUNCTION get_expenses_list(p_company_id UUID DEFAULT NULL, p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)
RETURNS TABLE (id UUID, expense_number TEXT, title TEXT, amount NUMERIC, category TEXT, status TEXT, expense_date DATE, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.expense_number, e.title, e.amount, e.category, e.status, e.expense_date, e.created_at
  FROM expenses e
  WHERE p_company_id IS NULL OR e.company_id = p_company_id
  ORDER BY e.expense_date DESC, e.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_expenses_summary(p_company_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
BEGIN
  RETURN JSONB_BUILD_OBJECT(
    'total', (SELECT COUNT(*) FROM expenses WHERE p_company_id IS NULL OR company_id = p_company_id),
    'approved', (SELECT COUNT(*) FROM expenses WHERE status = 'approved' AND (p_company_id IS NULL OR company_id = p_company_id)),
    'pending', (SELECT COUNT(*) FROM expenses WHERE status = 'pending' AND (p_company_id IS NULL OR company_id = p_company_id)),
    'rejected', (SELECT COUNT(*) FROM expenses WHERE status = 'rejected' AND (p_company_id IS NULL OR company_id = p_company_id))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION create_expense(p_data JSONB) RETURNS UUID AS $$
DECLARE v_expense_id UUID; v_expense_number TEXT;
BEGIN
  SELECT 'EXP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(COALESCE((SELECT COUNT(*)+1 FROM expenses WHERE expense_number LIKE 'EXP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%'), 1)::TEXT, 4, '0') INTO v_expense_number;
  INSERT INTO expenses (company_id, expense_number, title, description, amount, currency_code, exchange_rate, amount_in_base, category, expense_date, project_id, supplier_id, partner_id, payment_method, treasury_account_id, notes, status, created_by)
  SELECT get_user_current_company(), v_expense_number, p_data->>'title', p_data->>'description', (p_data->>'amount')::NUMERIC,
    COALESCE(p_data->>'currency_code','USD'), COALESCE((p_data->>'exchange_rate')::NUMERIC,1),
    (p_data->>'amount')::NUMERIC * COALESCE((p_data->>'exchange_rate')::NUMERIC,1),
    p_data->>'category', COALESCE((p_data->>'expense_date')::DATE, CURRENT_DATE),
    (p_data->>'project_id')::UUID, (p_data->>'supplier_id')::UUID, (p_data->>'partner_id')::UUID,
    p_data->>'payment_method', (p_data->>'treasury_account_id')::UUID, p_data->>'notes', 'pending', auth.uid()
  RETURNING id INTO v_expense_id;
  RETURN v_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_expense(p_expense_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE expenses SET status = 'approved', approved_by = auth.uid(), approved_at = NOW()
  WHERE id = p_expense_id AND status = 'pending';
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_expense_paid(p_expense_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE expenses SET status = 'paid' WHERE id = p_expense_id AND status = 'approved';
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Product Cost Cards
CREATE OR REPLACE FUNCTION get_product_cost_cards(p_company_id UUID DEFAULT NULL)
RETURNS TABLE (id UUID, card_code TEXT, product_name TEXT, product_name_ar TEXT, total_cost NUMERIC, selling_price NUMERIC, currency TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT pcc.id, pcc.product_code, pcc.product_name, pcc.product_name_ar, pcc.total_cost, pcc.selling_price, pcc.currency
  FROM product_cost_cards pcc
  WHERE pcc.is_active = true AND (p_company_id IS NULL OR pcc.company_id = p_company_id)
  ORDER BY pcc.product_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Project Financials
CREATE OR REPLACE FUNCTION get_project_financials(p_project_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN JSONB_BUILD_OBJECT(
    'total_expenses', COALESCE((SELECT SUM(amount_in_base) FROM project_expenses WHERE project_id = p_project_id), 0),
    'total_revenues', COALESCE((SELECT SUM(amount_in_base) FROM project_revenues WHERE project_id = p_project_id), 0),
    'expense_count', (SELECT COUNT(*) FROM project_expenses WHERE project_id = p_project_id),
    'revenue_count', (SELECT COUNT(*) FROM project_revenues WHERE project_id = p_project_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_project_expenses(p_project_id UUID)
RETURNS TABLE (id UUID, expense_category TEXT, description TEXT, amount NUMERIC, currency_code TEXT, expense_date DATE, status TEXT) AS $$
BEGIN
  RETURN QUERY SELECT pe.id, pe.expense_category, pe.description, pe.amount, pe.currency_code, pe.expense_date, pe.status
  FROM project_expenses pe WHERE pe.project_id = p_project_id ORDER BY pe.expense_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION add_project_expense(p_data JSONB) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO project_expenses (company_id, project_id, expense_category, description, amount, currency_code, exchange_rate, amount_in_base, expense_date, status, recorded_by)
  VALUES (get_user_current_company(), (p_data->>'project_id')::UUID, p_data->>'expense_category', p_data->>'description',
    (p_data->>'amount')::NUMERIC, COALESCE(p_data->>'currency_code','USD'), COALESCE((p_data->>'exchange_rate')::NUMERIC,1),
    (p_data->>'amount')::NUMERIC * COALESCE((p_data->>'exchange_rate')::NUMERIC,1),
    COALESCE((p_data->>'expense_date')::DATE, CURRENT_DATE), 'approved', auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_project_revenue(p_data JSONB) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO project_revenues (company_id, project_id, revenue_type, description, amount, currency_code, exchange_rate, amount_in_base, revenue_date, invoice_number, status, recorded_by)
  VALUES (get_user_current_company(), (p_data->>'project_id')::UUID, p_data->>'revenue_type', p_data->>'description',
    (p_data->>'amount')::NUMERIC, COALESCE(p_data->>'currency_code','USD'), COALESCE((p_data->>'exchange_rate')::NUMERIC,1),
    (p_data->>'amount')::NUMERIC * COALESCE((p_data->>'exchange_rate')::NUMERIC,1),
    COALESCE((p_data->>'revenue_date')::DATE, CURRENT_DATE), p_data->>'invoice_number', 'confirmed', auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Financial Partners
CREATE OR REPLACE FUNCTION record_partner_advance(p_partner_id UUID, p_amount NUMERIC, p_currency_code TEXT DEFAULT 'USD', p_description TEXT DEFAULT NULL) RETURNS UUID AS $$
DECLARE v_id UUID; v_balance NUMERIC;
BEGIN
  SELECT balance INTO v_balance FROM financial_partners WHERE id = p_partner_id;
  v_balance := COALESCE(v_balance, 0) + p_amount;
  UPDATE financial_partners SET balance = v_balance WHERE id = p_partner_id;
  INSERT INTO partner_ledger_entries (company_id, partner_id, entry_type, amount, currency_code, balance_after, description, recorded_by)
  VALUES (get_user_current_company(), p_partner_id, 'advance_sent', p_amount, p_currency_code, v_balance, p_description, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_partner_expense(p_partner_id UUID, p_amount NUMERIC, p_currency_code TEXT DEFAULT 'USD', p_description TEXT DEFAULT NULL) RETURNS UUID AS $$
DECLARE v_id UUID; v_balance NUMERIC;
BEGIN
  SELECT balance INTO v_balance FROM financial_partners WHERE id = p_partner_id;
  v_balance := COALESCE(v_balance, 0) - p_amount;
  UPDATE financial_partners SET balance = v_balance WHERE id = p_partner_id;
  INSERT INTO partner_ledger_entries (company_id, partner_id, entry_type, amount, currency_code, balance_after, description, recorded_by)
  VALUES (get_user_current_company(), p_partner_id, 'material_purchase', -p_amount, p_currency_code, v_balance, p_description, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION settle_partner(p_partner_id UUID, p_amount NUMERIC, p_currency_code TEXT DEFAULT 'USD', p_description TEXT DEFAULT NULL) RETURNS UUID AS $$
DECLARE v_id UUID; v_balance NUMERIC;
BEGIN
  SELECT balance INTO v_balance FROM financial_partners WHERE id = p_partner_id;
  v_balance := v_balance - p_amount;
  UPDATE financial_partners SET balance = v_balance WHERE id = p_partner_id;
  INSERT INTO partner_ledger_entries (company_id, partner_id, entry_type, amount, currency_code, balance_after, description, recorded_by)
  VALUES (get_user_current_company(), p_partner_id, 'settlement', -p_amount, p_currency_code, v_balance, p_description, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_partner_statement(p_partner_id UUID)
RETURNS TABLE (id UUID, entry_type TEXT, amount NUMERIC, balance_after NUMERIC, description TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY SELECT ple.id, ple.entry_type, ple.amount, ple.balance_after, ple.description, ple.created_at
  FROM partner_ledger_entries ple
  WHERE ple.partner_id = p_partner_id
  ORDER BY ple.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_partner_balance(p_partner_id UUID) RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE((SELECT balance FROM financial_partners WHERE id = p_partner_id), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_partners_summary() RETURNS JSONB AS $$
BEGIN
  RETURN JSONB_BUILD_OBJECT(
    'total', (SELECT COUNT(*) FROM financial_partners WHERE is_active = true),
    'total_balance', (SELECT COALESCE(SUM(balance), 0) FROM financial_partners WHERE is_active = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Supplier Management
CREATE OR REPLACE FUNCTION create_supplier_invoice(p_data JSONB) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO supplier_invoices (company_id, supplier_id, invoice_number, invoice_date, due_date, total_amount, currency_code, description, status, project_id, created_by)
  VALUES (get_user_current_company(), (p_data->>'supplier_id')::UUID, p_data->>'invoice_number',
    COALESCE((p_data->>'invoice_date')::DATE, CURRENT_DATE), (p_data->>'due_date')::DATE,
    (p_data->>'total_amount')::NUMERIC, COALESCE(p_data->>'currency_code','LYD'),
    p_data->>'description', 'pending', (p_data->>'project_id')::UUID, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION pay_supplier_invoice(p_invoice_id UUID, p_amount NUMERIC, p_payment_method TEXT DEFAULT 'bank') RETURNS UUID AS $$
DECLARE v_payment_id UUID; v_supplier_id UUID; v_new_balance NUMERIC;
BEGIN
  SELECT supplier_id INTO v_supplier_id FROM supplier_invoices WHERE id = p_invoice_id;
  INSERT INTO supplier_payments (company_id, supplier_id, invoice_id, amount, currency_code, payment_method, payment_date, recorded_by)
  VALUES (get_user_current_company(), v_supplier_id, p_invoice_id, p_amount, 'LYD', p_payment_method, CURRENT_DATE, auth.uid())
  RETURNING id INTO v_payment_id;
  UPDATE supplier_invoices SET paid_amount = paid_amount + p_amount, status = CASE WHEN paid_amount + p_amount >= total_amount THEN 'paid' ELSE 'partial' END
  WHERE id = p_invoice_id;
  SELECT current_balance INTO v_new_balance FROM suppliers WHERE id = v_supplier_id;
  UPDATE suppliers SET current_balance = v_new_balance - p_amount WHERE id = v_supplier_id;
  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_supplier_statement(p_supplier_id UUID)
RETURNS TABLE (id UUID, invoice_number TEXT, total_amount NUMERIC, paid_amount NUMERIC, status TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY SELECT si.id, si.invoice_number, si.total_amount, si.paid_amount, si.status, si.created_at
  FROM supplier_invoices si WHERE si.supplier_id = p_supplier_id ORDER BY si.invoice_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_suppliers_summary() RETURNS JSONB AS $$
BEGIN
  RETURN JSONB_BUILD_OBJECT(
    'total', (SELECT COUNT(*) FROM suppliers WHERE is_active = true),
    'total_payable', (SELECT COALESCE(SUM(current_balance), 0) FROM suppliers WHERE is_active = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_payables_aging() RETURNS TABLE (supplier_id UUID, supplier_name TEXT, total_due NUMERIC, days_overdue INT) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.supplier_name, COALESCE(SUM(si.total_amount - si.paid_amount), 0) AS total_due,
    GREATEST(0, CURRENT_DATE - MIN(si.due_date))::INT AS days_overdue
  FROM suppliers s
  LEFT JOIN supplier_invoices si ON si.supplier_id = s.id AND si.status IN ('pending','partial')
  WHERE s.is_active = true
  GROUP BY s.id, s.supplier_name
  HAVING COALESCE(SUM(si.total_amount - si.paid_amount), 0) > 0
  ORDER BY days_overdue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Notifications & Alerts
CREATE OR REPLACE FUNCTION get_alert_logs(p_company_id UUID DEFAULT NULL, p_limit INT DEFAULT 20)
RETURNS TABLE (id UUID, title TEXT, body TEXT, severity TEXT, is_read BOOLEAN, triggered_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT al.id, al.title, al.body, al.severity, al.is_read, al.triggered_at
  FROM alert_logs al
  WHERE al.is_dismissed = false AND (p_company_id IS NULL OR al.company_id = p_company_id)
  ORDER BY al.triggered_at DESC LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_notification_preferences() RETURNS notification_preferences AS $$
BEGIN
  RETURN (SELECT np FROM notification_preferences np WHERE np.user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION upsert_notification_preferences(p_data JSONB) RETURNS VOID AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, push_enabled, email_enabled, treasury_balance_threshold, partner_outstanding_threshold, supplier_overdue_threshold, project_budget_threshold)
  VALUES (auth.uid(), COALESCE((p_data->>'push_enabled')::BOOLEAN, true), COALESCE((p_data->>'email_enabled')::BOOLEAN, false),
    COALESCE((p_data->>'treasury_balance_threshold')::NUMERIC, 1000),
    COALESCE((p_data->>'partner_outstanding_threshold')::NUMERIC, 10000),
    COALESCE((p_data->>'supplier_overdue_threshold')::NUMERIC, 30),
    COALESCE((p_data->>'project_budget_threshold_pct')::NUMERIC, 80))
  ON CONFLICT (user_id) DO UPDATE SET
    push_enabled = EXCLUDED.push_enabled, email_enabled = EXCLUDED.email_enabled,
    treasury_balance_threshold = EXCLUDED.treasury_balance_threshold,
    partner_outstanding_threshold = EXCLUDED.partner_outstanding_threshold,
    supplier_overdue_threshold = EXCLUDED.supplier_overdue_threshold,
    project_budget_threshold = EXCLUDED.project_budget_threshold,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_alert_read(p_alert_id UUID) RETURNS VOID AS $$
BEGIN UPDATE alert_logs SET is_read = true WHERE id = p_alert_id; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION dismiss_alert(p_alert_id UUID) RETURNS VOID AS $$
BEGIN UPDATE alert_logs SET is_dismissed = true WHERE id = p_alert_id; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 4: RLS POLICIES (all tables)
-- ============================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_all" ON accounts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "accounts_select" ON accounts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_all" ON transactions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfers_all" ON transfers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "transfers_select" ON transfers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_all" ON projects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals_all" ON approvals FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_all" ON contacts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal_entries_all" ON journal_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "journal_entries_select" ON journal_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal_entry_lines_all" ON journal_entry_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "journal_entry_lines_select" ON journal_entry_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_all" ON companies FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = companies.id)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_companies_all" ON user_companies FOR ALL TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = user_companies.company_id AND user_role = 'owner'));

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_all" ON profiles FOR ALL TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND user_role IN ('owner','admin'))
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE treasuries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treasuries_all" ON treasuries FOR ALL TO authenticated
  USING ((company_id = get_user_current_company() OR company_id IS NULL)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treasury_transactions_all" ON treasury_transactions FOR ALL TO authenticated
  USING ((company_id = get_user_current_company() OR company_id IS NULL)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE financial_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_partners_all" ON financial_partners FOR ALL TO authenticated
  USING ((company_id = get_user_current_company() OR company_id IS NULL)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE partner_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_ledger_entries_all" ON partner_ledger_entries FOR ALL TO authenticated
  USING ((company_id = get_user_current_company() OR company_id IS NULL)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_all" ON suppliers FOR ALL TO authenticated
  USING ((company_id = get_user_current_company() OR company_id IS NULL)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier_invoices_all" ON supplier_invoices FOR ALL TO authenticated
  USING ((company_id = get_user_current_company() OR company_id IS NULL)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier_payments_all" ON supplier_payments FOR ALL TO authenticated
  USING ((company_id = get_user_current_company() OR company_id IS NULL)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE product_cost_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_cost_cards_all" ON product_cost_cards FOR ALL TO authenticated
  USING ((company_id = get_user_current_company() OR company_id IS NULL)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE product_cost_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_cost_components_all" ON product_cost_components FOR ALL TO authenticated
  USING ((company_id = get_user_current_company() OR company_id IS NULL)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_expenses_all" ON project_expenses FOR ALL TO authenticated
  USING ((company_id = get_user_current_company() OR company_id IS NULL)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE project_revenues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_revenues_all" ON project_revenues FOR ALL TO authenticated
  USING ((company_id = get_user_current_company() OR company_id IS NULL)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_all" ON expenses FOR ALL TO authenticated
  USING ((company_id = get_user_current_company() OR company_id IS NULL)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_all" ON notifications FOR ALL TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subscriptions_all" ON push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alert_rules_all" ON alert_rules FOR ALL TO authenticated
  USING ((company_id = get_user_current_company() OR company_id IS NULL)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alert_logs_all" ON alert_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_preferences_all" ON notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_all" ON audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "login_history_all" ON login_history FOR ALL TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND user_role IN ('owner','admin'))
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- ============================================================
-- STEP 5: INDEXES
-- ============================================================

CREATE INDEX idx_user_companies_user ON user_companies(user_id);
CREATE INDEX idx_user_companies_company ON user_companies(company_id);
CREATE INDEX idx_accounts_company ON accounts(company_id);
CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transfers_company ON transfers(company_id);
CREATE INDEX idx_treasuries_company ON treasuries(company_id);
CREATE INDEX idx_treasury_transactions_treasury ON treasury_transactions(treasury_id);
CREATE INDEX idx_treasury_transactions_company ON treasury_transactions(company_id);
CREATE INDEX idx_financial_partners_company ON financial_partners(company_id);
CREATE INDEX idx_partner_ledger_partner ON partner_ledger_entries(partner_id);
CREATE INDEX idx_partner_ledger_company ON partner_ledger_entries(company_id);
CREATE INDEX idx_suppliers_company ON suppliers(company_id);
CREATE INDEX idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX idx_supplier_invoices_company ON supplier_invoices(company_id);
CREATE INDEX idx_supplier_payments_supplier ON supplier_payments(supplier_id);
CREATE INDEX idx_supplier_payments_company ON supplier_payments(company_id);
CREATE INDEX idx_expenses_company ON expenses(company_id);
CREATE INDEX idx_expenses_project ON expenses(project_id);
CREATE INDEX idx_project_expenses_project ON project_expenses(project_id);
CREATE INDEX idx_project_expenses_company ON project_expenses(company_id);
CREATE INDEX idx_project_revenues_project ON project_revenues(project_id);
CREATE INDEX idx_project_revenues_company ON project_revenues(company_id);
CREATE INDEX idx_product_cost_cards_company ON product_cost_cards(company_id);
CREATE INDEX idx_product_cost_components_company ON product_cost_components(company_id);
CREATE INDEX idx_product_cost_components_card ON product_cost_components(cost_card_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_login_history_user ON login_history(user_id);
CREATE INDEX idx_alert_logs_rule ON alert_logs(alert_rule_id);

-- ============================================================
-- STEP 6: INITIAL SEED DATA (Master Setup)
-- ============================================================

-- 1. Create Default Company
INSERT INTO companies (id, company_name, company_name_ar, country, default_currency)
VALUES ('c0a80101-c0a8-0101-c0a8-0101c0a80101', 'ORI Gold ERP', 'أوري جولد ERP', 'LY', 'LYD')
ON CONFLICT (id) DO NOTHING;

-- 2. Create/Update Profile for the User
INSERT INTO profiles (id, email, full_name, role, is_active)
VALUES ('b3234074-369f-4ac8-999f-859540c5571c', 'admin@origold.com', 'Admin User', 'owner', true)
ON CONFLICT (id) DO UPDATE SET role = 'owner', is_active = true;

-- 3. Link User to Company as Owner
INSERT INTO user_companies (user_id, company_id, user_role, is_current)
VALUES ('b3234074-369f-4ac8-999f-859540c5571c', 'c0a80101-c0a8-0101-c0a8-0101c0a80101', 'owner', true)
ON CONFLICT (user_id, company_id) DO UPDATE SET user_role = 'owner', is_current = true;

-- 4. Create Initial Treasury (Main Safe)
INSERT INTO treasuries (company_id, treasury_code, treasury_name, treasury_name_ar, treasury_type, currency_code, opening_balance, current_balance)
VALUES ('c0a80101-c0a8-0101-c0a8-0101c0a80101', 'SAFE-01', 'Main Safe', 'الخزينة الرئيسية', 'cashbox', 'LYD', 0, 0)
ON CONFLICT (company_id, treasury_code) DO NOTHING;

-- 5. Create Default Chart of Accounts for ORI Gold ERP
-- Assets
INSERT INTO accounts (company_id, account_number, account_name, account_name_ar, account_type, balance, currency, is_active, allow_negative, created_by)
VALUES
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '1010', 'Cash - Main Safe', 'النقد - الخزينة الرئيسية', 'asset', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '1020', 'Cash - Bank USD', 'النقد - البنك USD', 'asset', 0, 'USD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '1030', 'Accounts Receivable', 'حساب المدينين', 'asset', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '1040', 'Prepaid Expenses', 'المصروفات المدفوعة مقدماً', 'asset', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '1050', 'Advances to Employees', 'سلف للعاملين', 'asset', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c')
ON CONFLICT (company_id, account_number) DO NOTHING;

-- Liabilities
INSERT INTO accounts (company_id, account_number, account_name, account_name_ar, account_type, balance, currency, is_active, allow_negative, created_by)
VALUES
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '2010', 'Accounts Payable', 'حساب الدائنين', 'liability', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '2020', 'Accrued Expenses', 'المصروفات المستحقة', 'liability', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '2030', 'Salaries Payable', 'مرتبات مستحقة', 'liability', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c')
ON CONFLICT (company_id, account_number) DO NOTHING;

-- Equity
INSERT INTO accounts (company_id, account_number, account_name, account_name_ar, account_type, balance, currency, is_active, allow_negative, created_by)
VALUES
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '3010', 'Owners Capital', 'رأس مال المالك', 'equity', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '3020', 'Retained Earnings', 'الأرباح المحتجزة', 'equity', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c')
ON CONFLICT (company_id, account_number) DO NOTHING;

-- Revenue
INSERT INTO accounts (company_id, account_number, account_name, account_name_ar, account_type, balance, currency, is_active, allow_negative, created_by)
VALUES
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '4010', 'Sales Revenue', 'إيرادات المبيعات', 'revenue', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '4020', 'Service Revenue', 'إيرادات الخدمات', 'revenue', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '4030', 'Project Revenue', 'إيرادات المشاريع', 'revenue', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c')
ON CONFLICT (company_id, account_number) DO NOTHING;

-- Expenses
INSERT INTO accounts (company_id, account_number, account_name, account_name_ar, account_type, balance, currency, is_active, allow_negative, created_by)
VALUES
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '5010', 'Rent Expense', 'مصروف الإيجار', 'expense', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '5020', 'Utilities Expense', 'مصروفات المرافق', 'expense', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '5030', 'Salaries & Wages', 'المرتبات والأجور', 'expense', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '5040', 'Materials & Supplies', 'المواد والمستلزمات', 'expense', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '5050', 'Transportation Expense', 'مصروفات النقل', 'expense', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '5060', 'Equipment & Maintenance', 'المعدات والصيانة', 'expense', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '5070', 'Consulting & Professional', 'الاستشارات المهنية', 'expense', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '5080', 'Insurance Expense', 'مصروفات التأمين', 'expense', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c'),
  ('c0a80101-c0a8-0101-c0a8-0101c0a80101', '5090', 'General & Administrative', 'مصروفات إدارية عامة', 'expense', 0, 'LYD', true, false, 'b3234074-369f-4ac8-999f-859540c5571c')
ON CONFLICT (company_id, account_number) DO NOTHING;

-- ============================================================
-- STEP 7: MISSING RPC FUNCTIONS (fix parameter mismatches)
-- ============================================================

-- get_alert_logs (matches notificationStore call)
CREATE OR REPLACE FUNCTION get_alert_logs(p_company_id UUID DEFAULT NULL, p_limit INT DEFAULT 20, p_offset INT DEFAULT 0, p_severity TEXT DEFAULT NULL, p_is_read BOOLEAN DEFAULT NULL)
RETURNS TABLE (id UUID, title TEXT, body TEXT, severity TEXT, is_read BOOLEAN, triggered_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT al.id, al.title, al.body, al.severity, al.is_read, al.triggered_at
  FROM alert_logs al
  WHERE al.is_dismissed = false
    AND (p_company_id IS NULL OR al.company_id = p_company_id)
    AND (p_severity IS NULL OR al.severity = p_severity)
    AND (p_is_read IS NULL OR al.is_read = p_is_read)
  ORDER BY al.triggered_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- approve_treasury_transaction (matches treasuryStore call with p_approver_id)
CREATE OR REPLACE FUNCTION approve_treasury_transaction(p_transaction_id UUID, p_approver_id UUID DEFAULT NULL)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE v_treasury_id UUID; v_amount NUMERIC; v_type TEXT;
BEGIN
  SELECT treasury_id, amount, transaction_type INTO v_treasury_id, v_amount, v_type
  FROM treasury_transactions WHERE id = p_transaction_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'المعاملة غير موجودة أو ليست معلقة';
    RETURN;
  END IF;
  UPDATE treasury_transactions SET status = 'approved', approved_by = COALESCE(p_approver_id, auth.uid()), approved_at = NOW()
  WHERE id = p_transaction_id;
  UPDATE treasuries SET current_balance = current_balance +
    CASE v_type WHEN 'deposit' THEN v_amount WHEN 'withdrawal' THEN -v_amount
    WHEN 'transfer_in' THEN v_amount WHEN 'transfer_out' THEN -v_amount
    ELSE 0 END
  WHERE id = v_treasury_id;
  RETURN QUERY SELECT true, 'تمت الموافقة بنجاح';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- upsert_notification_preferences (matches notificationStore call with push_* fields)
CREATE OR REPLACE FUNCTION upsert_notification_preferences(
  p_push_approval BOOLEAN DEFAULT true,
  p_push_transaction BOOLEAN DEFAULT true,
  p_push_alert BOOLEAN DEFAULT true,
  p_push_info BOOLEAN DEFAULT true,
  p_push_summary BOOLEAN DEFAULT false,
  p_treasury_low_balance_alert BOOLEAN DEFAULT true,
  p_treasury_low_balance_threshold NUMERIC DEFAULT 1000,
  p_partner_outstanding_alert BOOLEAN DEFAULT true,
  p_partner_outstanding_threshold NUMERIC DEFAULT 5000,
  p_supplier_overdue_alert BOOLEAN DEFAULT true,
  p_supplier_overdue_days INT DEFAULT 7,
  p_project_budget_alert BOOLEAN DEFAULT true,
  p_project_budget_threshold_pct NUMERIC DEFAULT 80,
  p_expense_approval_alert BOOLEAN DEFAULT true,
  p_email_approval BOOLEAN DEFAULT false,
  p_email_alert BOOLEAN DEFAULT false,
  p_email_summary_daily BOOLEAN DEFAULT false,
  p_email_summary_weekly BOOLEAN DEFAULT false,
  p_quiet_hours_enabled BOOLEAN DEFAULT false,
  p_quiet_hours_start TEXT DEFAULT '22:00',
  p_quiet_hours_end TEXT DEFAULT '07:00'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, push_approval, push_transaction, push_alert, push_info, push_summary,
    treasury_low_balance_alert, treasury_low_balance_threshold, partner_outstanding_alert, partner_outstanding_threshold,
    supplier_overdue_alert, supplier_overdue_days, project_budget_alert, project_budget_threshold_pct, expense_approval_alert,
    email_approval, email_alert, email_summary_daily, email_summary_weekly, quiet_hours_enabled, quiet_hours_start, quiet_hours_end)
  VALUES (auth.uid(), p_push_approval, p_push_transaction, p_push_alert, p_push_info, p_push_summary,
    p_treasury_low_balance_alert, p_treasury_low_balance_threshold, p_partner_outstanding_alert, p_partner_outstanding_threshold,
    p_supplier_overdue_alert, p_supplier_overdue_days, p_project_budget_alert, p_project_budget_threshold_pct, p_expense_approval_alert,
    p_email_approval, p_email_alert, p_email_summary_daily, p_email_summary_weekly, p_quiet_hours_enabled, p_quiet_hours_start, p_quiet_hours_end)
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
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- create_currency_transfer (matches treasuryStore call with source/destination_treasury_id)
CREATE OR REPLACE FUNCTION create_currency_transfer(
  p_source_treasury_id UUID,
  p_destination_treasury_id UUID,
  p_source_amount NUMERIC,
  p_exchange_rate NUMERIC DEFAULT 1,
  p_description TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
) RETURNS TABLE (success BOOLEAN, message TEXT, transaction_id UUID) AS $$
DECLARE v_transfer_id UUID; v_dest_amount NUMERIC;
BEGIN
  v_dest_amount := p_source_amount * p_exchange_rate;
  INSERT INTO treasury_transactions (company_id, treasury_id, transaction_type, amount, currency_code, exchange_rate,
    destination_amount, destination_currency, destination_treasury_id, description, reference_number, project_id, status, created_by)
  VALUES (get_user_current_company(), p_source_treasury_id, 'transfer_out', p_source_amount,
    (SELECT currency_code FROM treasuries WHERE id = p_source_treasury_id), p_exchange_rate,
    v_dest_amount, (SELECT currency_code FROM treasuries WHERE id = p_destination_treasury_id),
    p_destination_treasury_id, p_description, p_reference, p_project_id, 'pending', auth.uid())
  RETURNING id INTO v_transfer_id;
  INSERT INTO treasury_transactions (company_id, treasury_id, transaction_type, amount, currency_code, exchange_rate,
    destination_amount, destination_currency, destination_treasury_id, description, reference_number, project_id, status, created_by)
  VALUES (get_user_current_company(), p_destination_treasury_id, 'transfer_in', v_dest_amount,
    (SELECT currency_code FROM treasuries WHERE id = p_destination_treasury_id), 1,
    p_source_amount, (SELECT currency_code FROM treasuries WHERE id = p_source_treasury_id),
    p_source_treasury_id, p_description, p_reference, p_project_id, 'pending', auth.uid());
  RETURN QUERY SELECT true, 'تم إنشاء التحويل بنجاح', v_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- mark_alert_read (updated to match notificationStore call)
CREATE OR REPLACE FUNCTION mark_alert_read(p_alert_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE alert_logs SET is_read = true WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- dismiss_alert (updated to match notificationStore call with p_action_taken)
CREATE OR REPLACE FUNCTION dismiss_alert(p_alert_id UUID, p_action_taken TEXT DEFAULT NULL) RETURNS VOID AS $$
BEGIN
  UPDATE alert_logs SET is_dismissed = true WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_trial_balance (fixed params: p_company_id, p_as_of_date)
CREATE OR REPLACE FUNCTION get_trial_balance(p_company_id UUID DEFAULT NULL, p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (account_id UUID, account_number TEXT, account_name TEXT, account_type TEXT, debit NUMERIC, credit NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.account_number, a.account_name, a.account_type,
    COALESCE(SUM(jel.debit), 0) AS debit,
    COALESCE(SUM(jel.credit), 0) AS credit
  FROM accounts a
  LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.is_posted = true
  WHERE je.entry_date <= p_as_of_date
    AND (p_company_id IS NULL OR a.company_id = p_company_id)
    AND (p_company_id IS NULL OR je.company_id = p_company_id OR je.company_id IS NULL)
  GROUP BY a.id, a.account_number, a.account_name, a.account_type
  ORDER BY a.account_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- get_general_journal (fixed params: p_company_id, p_start_date, p_end_date)
CREATE OR REPLACE FUNCTION get_general_journal(p_company_id UUID DEFAULT NULL, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (entry_id UUID, entry_number TEXT, entry_date DATE, description TEXT, account_id UUID, account_name TEXT, debit NUMERIC, credit NUMERIC, source_type TEXT, source_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT
    je.id, je.entry_number, je.entry_date, je.description,
    a.id, a.account_name,
    jel.debit, jel.credit,
    je.source_type, je.source_id
  FROM journal_entries je
  JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
  JOIN accounts a ON a.id = jel.account_id
  WHERE je.is_posted = true
    AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
    AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
    AND (p_company_id IS NULL OR je.company_id = p_company_id)
  ORDER BY je.entry_date DESC, je.entry_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- get_income_statement (fixed params)
CREATE OR REPLACE FUNCTION get_income_statement(p_company_id UUID DEFAULT NULL, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (account_id UUID, account_number TEXT, account_name TEXT, account_type TEXT, total NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.account_number, a.account_name, a.account_type,
    COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) AS total
  FROM accounts a
  LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.is_posted = true
  WHERE a.account_type IN ('revenue','expense')
    AND je.entry_date >= COALESCE(p_start_date, DATE_TRUNC('year', CURRENT_DATE))
    AND je.entry_date <= COALESCE(p_end_date, CURRENT_DATE)
    AND (p_company_id IS NULL OR a.company_id = p_company_id)
  GROUP BY a.id, a.account_number, a.account_name, a.account_type
  ORDER BY a.account_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- get_balance_sheet (fixed params)
CREATE OR REPLACE FUNCTION get_balance_sheet(p_company_id UUID DEFAULT NULL, p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (account_id UUID, account_number TEXT, account_name TEXT, account_type TEXT, balance NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.account_number, a.account_name, a.account_type,
    COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) AS balance
  FROM accounts a
  LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.is_posted = true
  WHERE a.account_type IN ('asset','liability','equity')
    AND je.entry_date <= p_as_of_date
    AND (p_company_id IS NULL OR a.company_id = p_company_id)
  GROUP BY a.id, a.account_number, a.account_name, a.account_type
  ORDER BY a.account_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- get_account_ledger (fixed params)
CREATE OR REPLACE FUNCTION get_account_ledger(p_account_id UUID, p_company_id UUID DEFAULT NULL, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (entry_id UUID, entry_number TEXT, entry_date DATE, description TEXT, debit NUMERIC, credit NUMERIC, running_balance NUMERIC) AS $$
DECLARE v_running NUMERIC := 0;
BEGIN
  FOR entry_id, entry_number, entry_date, description, debit, credit IN
    SELECT je.id, COALESCE(je.entry_number,''), COALESCE(je.entry_date, CURRENT_DATE), COALESCE(je.description,''), COALESCE(jel.debit,0), COALESCE(jel.credit,0)
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    WHERE jel.account_id = p_account_id
      AND je.is_posted = true
      AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
      AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
      AND (p_company_id IS NULL OR je.company_id = p_company_id)
    ORDER BY je.entry_date, je.created_at
  LOOP
    v_running := v_running + debit - credit;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- create_journal_entry (fixed params match journalEntryStore)
CREATE OR REPLACE FUNCTION create_journal_entry(
  p_entry_date DATE, p_description TEXT, p_lines JSONB,
  p_source_type TEXT DEFAULT NULL, p_source_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL, p_project_id UUID DEFAULT NULL
) RETURNS TABLE (success BOOLEAN, message TEXT, journal_entry_id UUID) AS $$
DECLARE v_entry_id UUID; v_total_debit NUMERIC; v_total_credit NUMERIC;
BEGIN
  SELECT INTO v_total_debit, v_total_credit
    COALESCE(SUM((l->>'debit')::NUMERIC), 0), COALESCE(SUM((l->>'credit')::NUMERIC), 0)
  FROM jsonb_array_elements(p_lines) l;
  IF v_total_debit <> v_total_credit THEN
    RETURN QUERY SELECT false, 'Journal entry must be balanced. Debit: ' || v_total_debit::TEXT || ' Credit: ' || v_total_credit::TEXT, NULL::UUID;
    RETURN;
  END IF;
  INSERT INTO journal_entries (company_id, entry_date, description, source_type, source_id, reference_number, project_id, created_by)
  VALUES (get_user_current_company(), p_entry_date, p_description, p_source_type, p_source_id, p_reference_number, p_project_id, auth.uid())
  RETURNING id INTO v_entry_id;
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, company_id)
  SELECT v_entry_id, (l->>'account_id')::UUID, COALESCE((l->>'debit')::NUMERIC,0), COALESCE((l->>'credit')::NUMERIC,0), l->>'description', get_user_current_company()
  FROM jsonb_array_elements(p_lines) l;
  RETURN QUERY SELECT true, 'تم إنشاء القيد بنجاح', v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- search_accounts_for_journal (fixed params)
CREATE OR REPLACE FUNCTION search_accounts_for_journal(p_search TEXT DEFAULT '', p_company_id UUID DEFAULT NULL, p_limit INT DEFAULT 20)
RETURNS TABLE (id UUID, account_number TEXT, account_name TEXT, account_name_ar TEXT, account_type TEXT, balance NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.account_number, a.account_name, a.account_name_ar, a.account_type, a.balance
  FROM accounts a
  WHERE a.is_active = true
    AND (p_search = '' OR a.account_name ILIKE '%' || p_search || '%' OR a.account_name_ar ILIKE '%' || p_search || '%' OR a.account_number ILIKE '%' || p_search || '%')
    AND (p_company_id IS NULL OR a.company_id = p_company_id)
  ORDER BY a.account_number LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- STEP 8: CURRENCY RATES TABLE (required by treasuryStore)
-- ============================================================

CREATE TABLE IF NOT EXISTS currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC(20,8) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, base_currency, target_currency, effective_date)
);

ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "currency_rates_all" ON currency_rates FOR ALL TO authenticated
  USING ((company_id = get_user_current_company() OR company_id IS NULL)
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE INDEX idx_currency_rates_company ON currency_rates(company_id);
