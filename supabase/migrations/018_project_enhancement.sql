-- Phase 6: Project Enhancement
-- Add financial container to projects: expenses, revenues, budget tracking, profitability

-- 1. Create project_expenses table
CREATE TABLE IF NOT EXISTS project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  expense_category TEXT NOT NULL
    CHECK (expense_category IN (
      'materials', 'labor', 'equipment', 'transportation',
      'subcontractor', 'permits', 'utilities', 'insurance',
      'maintenance', 'consulting', 'other'
    )),
  description TEXT,
  amount NUMERIC(20, 4) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(20, 4) DEFAULT 1,
  amount_in_base NUMERIC(20, 4) GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_id UUID REFERENCES suppliers(id),
  partner_id UUID REFERENCES financial_partners(id),
  treasury_transaction_id UUID REFERENCES treasury_transactions(id),
  journal_entry_id UUID REFERENCES journal_entries(id),
  receipt_url TEXT,
  reference_number TEXT,
  status TEXT DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create project_revenues table
CREATE TABLE IF NOT EXISTS project_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  revenue_type TEXT NOT NULL
    CHECK (revenue_type IN (
      'contract_value', 'change_order', 'milestone_payment',
      'advance_received', 'final_payment', 'penalty', 'other'
    )),
  description TEXT,
  amount NUMERIC(20, 4) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(20, 4) DEFAULT 1,
  amount_in_base NUMERIC(20, 4) GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  revenue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number TEXT,
  treasury_transaction_id UUID REFERENCES treasury_transactions(id),
  journal_entry_id UUID REFERENCES journal_entries(id),
  reference_number TEXT,
  status TEXT DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'invoiced', 'received', 'cancelled')),
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create project_cost_breakdown view
CREATE OR REPLACE VIEW v_project_financial_summary AS
SELECT
  p.id as project_id,
  p.name as project_name,
  p.code as project_code,
  p.company_id,
  p.budget as project_budget,
  p.currency as project_currency,
  p.status as project_status,
  COALESCE(SUM(pe.amount_in_base), 0) as total_expenses,
  COALESCE(SUM(CASE WHEN pe.expense_category = 'materials' THEN pe.amount_in_base ELSE 0 END), 0) as materials_cost,
  COALESCE(SUM(CASE WHEN pe.expense_category = 'labor' THEN pe.amount_in_base ELSE 0 END), 0) as labor_cost,
  COALESCE(SUM(CASE WHEN pe.expense_category = 'equipment' THEN pe.amount_in_base ELSE 0 END), 0) as equipment_cost,
  COALESCE(SUM(CASE WHEN pe.expense_category = 'transportation' THEN pe.amount_in_base ELSE 0 END), 0) as transportation_cost,
  COALESCE(SUM(CASE WHEN pe.expense_category = 'subcontractor' THEN pe.amount_in_base ELSE 0 END), 0) as subcontractor_cost,
  COALESCE(SUM(CASE WHEN pe.expense_category NOT IN ('materials', 'labor', 'equipment', 'transportation', 'subcontractor') THEN pe.amount_in_base ELSE 0 END), 0) as other_costs,
  COALESCE(SUM(pr.amount_in_base), 0) as total_revenues,
  COALESCE(SUM(pr.amount_in_base), 0) - COALESCE(SUM(pe.amount_in_base), 0) as net_profit,
  CASE WHEN p.budget > 0
    THEN (COALESCE(SUM(pe.amount_in_base), 0) / p.budget * 100)
    ELSE 0 END as budget_utilization_pct,
  COUNT(DISTINCT pe.id) as expense_count,
  COUNT(DISTINCT pr.id) as revenue_count
FROM projects p
LEFT JOIN project_expenses pe ON pe.project_id = p.id AND pe.status = 'approved'
LEFT JOIN project_revenues pr ON pr.project_id = p.id AND pr.status IN ('confirmed', 'invoiced', 'received')
GROUP BY p.id, p.name, p.code, p.company_id, p.budget, p.currency, p.status;

-- 4. Enable RLS
ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_revenues ENABLE ROW LEVEL SECURITY;

-- 5. RLS: project_expenses
DROP POLICY IF EXISTS "project_expenses_select" ON project_expenses;
DROP POLICY IF EXISTS "project_expenses_insert" ON project_expenses;
DROP POLICY IF EXISTS "project_expenses_update" ON project_expenses;
CREATE POLICY "project_expenses_select" ON project_expenses FOR SELECT TO authenticated
USING (company_id = get_user_current_company());
CREATE POLICY "project_expenses_insert" ON project_expenses FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'operations', 'accountant'))
);
CREATE POLICY "project_expenses_update" ON project_expenses FOR UPDATE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'accountant'))
);

-- 6. RLS: project_revenues
DROP POLICY IF EXISTS "project_revenues_select" ON project_revenues;
DROP POLICY IF EXISTS "project_revenues_insert" ON project_revenues;
CREATE POLICY "project_revenues_select" ON project_revenues FOR SELECT TO authenticated
USING (company_id = get_user_current_company());
CREATE POLICY "project_revenues_insert" ON project_revenues FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'accountant'))
);

-- 7. Audit triggers
DROP TRIGGER IF EXISTS audit_project_expenses_changes ON project_expenses;
CREATE TRIGGER audit_project_expenses_changes
  AFTER INSERT OR UPDATE OR DELETE ON project_expenses
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_project_revenues_changes ON project_revenues;
CREATE TRIGGER audit_project_revenues_changes
  AFTER INSERT OR UPDATE OR DELETE ON project_revenues
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_project_expenses_project ON project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_category ON project_expenses(expense_category);
CREATE INDEX IF NOT EXISTS idx_project_expenses_date ON project_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_project_revenues_project ON project_revenues(project_id);
CREATE INDEX IF NOT EXISTS idx_project_revenues_type ON project_revenues(revenue_type);
CREATE INDEX IF NOT EXISTS idx_project_revenues_date ON project_revenues(revenue_date);

-- 9. RPC: Add project expense
CREATE OR REPLACE FUNCTION add_project_expense(
  p_project_id UUID,
  p_expense_category TEXT,
  p_description TEXT DEFAULT NULL,
  p_amount NUMERIC,
  p_currency_code TEXT DEFAULT 'USD',
  p_exchange_rate NUMERIC DEFAULT 1,
  p_expense_date DATE DEFAULT CURRENT_DATE,
  p_vendor_id UUID DEFAULT NULL,
  p_partner_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_treasury_transaction_id UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, expense_id UUID, journal_entry_id UUID) AS $$
DECLARE
  v_project projects%ROWTYPE;
  v_company_id UUID;
  v_expense_id UUID;
  v_je_id UUID;
  v_je_num TEXT;
BEGIN
  SELECT * INTO v_project FROM projects WHERE id = p_project_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'المشروع غير موجود', NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  v_company_id := v_project.company_id;

  INSERT INTO project_expenses (
    company_id, project_id, expense_category, description, amount, currency_code,
    exchange_rate, expense_date, vendor_id, partner_id, reference_number,
    treasury_transaction_id, status, recorded_by
  ) VALUES (
    v_company_id, p_project_id, p_expense_category, p_description, p_amount,
    p_currency_code, p_exchange_rate, p_expense_date, p_vendor_id, p_partner_id,
    p_reference_number, p_treasury_transaction_id, 'approved', auth.uid()
  ) RETURNING id INTO v_expense_id;

  -- Create journal entry
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(COALESCE(MAX(SUBSTRING(entry_number FROM '-\d+$')::INT), 0) + 1, 6, '0')
  INTO v_je_num
  FROM journal_entries WHERE entry_number LIKE 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-%';

  INSERT INTO journal_entries (
    company_id, entry_number, entry_date, description, reference_number,
    source_type, source_id, project_id, status, posted_by, posted_at
  ) VALUES (
    v_company_id, v_je_num, p_expense_date,
    'مصروف مشروع: ' || v_project.name || COALESCE(' - ' || p_description, ''),
    p_reference_number, 'auto_project_expense', v_expense_id, p_project_id,
    'posted', auth.uid(), NOW()
  ) RETURNING id INTO v_je_id;

  -- Debit: Project Cost / Expense
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
  SELECT v_je_id, a.id, p_amount * p_exchange_rate, 0, p_currency_code,
         'مصروف مشروع: ' || v_project.name || ' (' || p_expense_category || ')', v_company_id
  FROM accounts a WHERE a.company_id = v_company_id AND a.type = 'expense' LIMIT 1;

  -- Credit: Cash/Bank (or vendor/partner liability)
  IF p_vendor_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
    SELECT v_je_id, a.id, 0, p_amount * p_exchange_rate, p_currency_code,
           'واجب للمورد', v_company_id
    FROM accounts a WHERE a.company_id = v_company_id AND a.type IN ('expense', 'temporary')
      AND a.name ILIKE '%مورد%' LIMIT 1;
  ELSIF p_partner_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
    SELECT v_je_id, a.id, 0, p_amount * p_exchange_rate, p_currency_code,
           'سلفة شريك مستخدمة', v_company_id
    FROM accounts a WHERE a.company_id = v_company_id AND a.type IN ('expense', 'temporary')
      AND a.name ILIKE '%شريك%' LIMIT 1;
  ELSE
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
    SELECT v_je_id, a.id, 0, p_amount * p_exchange_rate, p_currency_code,
           'صرف مصروف', v_company_id
    FROM accounts a WHERE a.company_id = v_company_id AND a.is_treasury_account = true
      AND a.currency_code = p_currency_code LIMIT 1;
  END IF;

  RETURN QUERY SELECT true, 'تم تسجيل المصروف بنجاح', v_expense_id, v_je_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: Add project revenue
CREATE OR REPLACE FUNCTION add_project_revenue(
  p_project_id UUID,
  p_revenue_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_amount NUMERIC,
  p_currency_code TEXT DEFAULT 'USD',
  p_exchange_rate NUMERIC DEFAULT 1,
  p_revenue_date DATE DEFAULT CURRENT_DATE,
  p_invoice_number TEXT DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, revenue_id UUID, journal_entry_id UUID) AS $$
DECLARE
  v_project projects%ROWTYPE;
  v_company_id UUID;
  v_revenue_id UUID;
  v_je_id UUID;
  v_je_num TEXT;
BEGIN
  SELECT * INTO v_project FROM projects WHERE id = p_project_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'المشروع غير موجود', NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  v_company_id := v_project.company_id;

  INSERT INTO project_revenues (
    company_id, project_id, revenue_type, description, amount, currency_code,
    exchange_rate, revenue_date, invoice_number, reference_number, status, recorded_by
  ) VALUES (
    v_company_id, p_project_id, p_revenue_type, p_description, p_amount,
    p_currency_code, p_exchange_rate, p_revenue_date, p_invoice_number,
    p_reference_number, 'confirmed', auth.uid()
  ) RETURNING id INTO v_revenue_id;

  -- Create journal entry
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(COALESCE(MAX(SUBSTRING(entry_number FROM '-\d+$')::INT), 0) + 1, 6, '0')
  INTO v_je_num
  FROM journal_entries WHERE entry_number LIKE 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-%';

  INSERT INTO journal_entries (
    company_id, entry_number, entry_date, description, reference_number,
    source_type, source_id, project_id, status, posted_by, posted_at
  ) VALUES (
    v_company_id, v_je_num, p_revenue_date,
    'إيراد مشروع: ' || v_project.name || COALESCE(' - ' || p_description, ''),
    p_reference_number, 'auto_project_revenue', v_revenue_id, p_project_id,
    'posted', auth.uid(), NOW()
  ) RETURNING id INTO v_je_id;

  -- Debit: Cash/Bank
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
  SELECT v_je_id, a.id, p_amount * p_exchange_rate, 0, p_currency_code,
         'تحصيل مشروع: ' || v_project.name, v_company_id
  FROM accounts a WHERE a.company_id = v_company_id AND a.is_treasury_account = true
    AND a.currency_code = p_currency_code LIMIT 1;

  -- Credit: Project Income
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
  SELECT v_je_id, a.id, 0, p_amount * p_exchange_rate, p_currency_code,
         'إيراد مشروع: ' || v_project.name, v_company_id
  FROM accounts a WHERE a.company_id = v_company_id AND a.type = 'income' LIMIT 1;

  RETURN QUERY SELECT true, 'تم تسجيل الإيراد بنجاح', v_revenue_id, v_je_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC: Get project financial details
CREATE OR REPLACE FUNCTION get_project_financials(p_project_id UUID)
RETURNS TABLE(
  project_id UUID,
  project_name TEXT,
  project_code TEXT,
  project_budget NUMERIC,
  project_currency TEXT,
  project_status TEXT,
  total_expenses NUMERIC,
  total_revenues NUMERIC,
  net_profit NUMERIC,
  budget_utilization_pct NUMERIC,
  materials_cost NUMERIC,
  labor_cost NUMERIC,
  equipment_cost NUMERIC,
  transportation_cost NUMERIC,
  subcontractor_cost NUMERIC,
  other_costs NUMERIC,
  expense_count BIGINT,
  revenue_count BIGINT
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM v_project_financial_summary WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC: Get project expense breakdown
CREATE OR REPLACE FUNCTION get_project_expenses(p_project_id UUID)
RETURNS TABLE(
  id UUID,
  expense_category TEXT,
  description TEXT,
  amount NUMERIC,
  currency_code TEXT,
  amount_in_base NUMERIC,
  expense_date DATE,
  vendor_name TEXT,
  partner_name TEXT,
  reference_number TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.id,
    pe.expense_category,
    pe.description,
    pe.amount,
    pe.currency_code,
    pe.amount_in_base,
    pe.expense_date,
    COALESCE(s.supplier_name, '—') as vendor_name,
    COALESCE(fp.partner_name, '—') as partner_name,
    COALESCE(pe.reference_number, '—') as reference_number,
    pe.status,
    pe.created_at
  FROM project_expenses pe
  LEFT JOIN suppliers s ON s.id = pe.vendor_id
  LEFT JOIN financial_partners fp ON fp.id = pe.partner_id
  WHERE pe.project_id = p_project_id
  ORDER BY pe.expense_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;