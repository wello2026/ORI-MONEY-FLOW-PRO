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

-- profiles (depends on auth.users, created automatically by Supabase)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('super_admin','owner','admin','accountant','treasury','operations','viewer')),
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- companies
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
  account_number TEXT,
  account_name TEXT NOT NULL,
  account_name_ar TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  parent_id UUID REFERENCES accounts(id),
  balance NUMERIC(20,4) DEFAULT 0,
  currency TEXT DEFAULT 'LYD',
  is_active BOOLEAN DEFAULT true,
  allow_negative BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    WHERE user_id = auth.uid() AND company_id = get_user_current_company() AND role IN ('owner','admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_companies()
RETURNS TABLE (company_id UUID, company_name TEXT, company_name_ar TEXT, country TEXT, default_currency TEXT, role TEXT, is_current BOOLEAN) AS $$
BEGIN
  RETURN QUERY SELECT c.id, c.company_name, c.company_name_ar, c.country, c.default_currency, uc.role, uc.is_current
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
-- STEP 4: RLS POLICIES (all tables)
-- ============================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_all" ON accounts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_all" ON transactions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfers_all" ON transfers FOR ALL TO authenticated
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

ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal_entry_lines_all" ON journal_entry_lines FOR ALL TO authenticated
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
  USING (company_id = get_user_current_company()
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treasury_transactions_all" ON treasury_transactions FOR ALL TO authenticated
  USING (company_id = get_user_current_company()
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE financial_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_partners_all" ON financial_partners FOR ALL TO authenticated
  USING (company_id = get_user_current_company()
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE partner_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_ledger_entries_all" ON partner_ledger_entries FOR ALL TO authenticated
  USING (company_id = get_user_current_company()
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_all" ON suppliers FOR ALL TO authenticated
  USING (company_id = get_user_current_company()
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier_invoices_all" ON supplier_invoices FOR ALL TO authenticated
  USING (company_id = get_user_current_company()
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier_payments_all" ON supplier_payments FOR ALL TO authenticated
  USING (company_id = get_user_current_company()
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE product_cost_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_cost_cards_all" ON product_cost_cards FOR ALL TO authenticated
  USING (company_id = get_user_current_company()
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE product_cost_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_cost_components_all" ON product_cost_components FOR ALL TO authenticated
  USING (company_id = get_user_current_company()
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_expenses_all" ON project_expenses FOR ALL TO authenticated
  USING (company_id = get_user_current_company()
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE project_revenues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_revenues_all" ON project_revenues FOR ALL TO authenticated
  USING (company_id = get_user_current_company()
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_all" ON expenses FOR ALL TO authenticated
  USING (company_id = get_user_current_company()
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_all" ON notifications FOR ALL TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subscriptions_all" ON push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alert_rules_all" ON alert_rules FOR ALL TO authenticated
  USING (company_id = get_user_current_company()
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