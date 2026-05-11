-- Phase 3.1: Accounting Enhancement + Full UI Support
-- Enhances journal entries, adds accounting reports RPCs, improves accounts hierarchy

-- 1. Enhance journal_entries table with company_id and entry_number
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS entry_number TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS entry_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS posted_by UUID REFERENCES profiles(id);
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

-- 2. Enhance journal_entry_lines with currency, exchange_rate, description
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'LYD';
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18, 8) DEFAULT 1;
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS line_description TEXT;

-- 3. Enhance accounts with proper accounting hierarchy
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_type_detail TEXT
  CHECK (account_type_detail IN (
    'cash', 'bank_deposit', 'accounts_receivable', 'inventory',
    'accounts_payable', 'loans_payable', 'taxes_payable',
    'capital', 'retained_earnings',
    'sales_revenue', 'service_revenue', 'other_income',
    'cost_of_goods', 'labor_cost', 'operating_expense', 'financial_expense'
  ));
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_treasury_account BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS treasury_id UUID REFERENCES treasuries(id);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS iscontra BOOLEAN DEFAULT false;  -- contra account (reverses normal balance)

-- 4. Create chart_of_accounts view for display
CREATE OR REPLACE VIEW v_chart_of_accounts AS
SELECT
  a.id,
  a.company_id,
  a.account_number,
  a.account_name,
  a.account_name_ar,
  a.type as main_type,
  a.account_type_detail,
  a.currency_code,
  a.parent_id,
  a.is_treasury_account,
  a.treasury_id,
  a.iscontra,
  a.is_active,
  a.created_by,
  -- Calculate balance from journal entries
  COALESCE(SUM(jel.debit), 0) as total_debit,
  COALESCE(SUM(jel.credit), 0) as total_credit,
  CASE
    WHEN a.type IN ('cashbox', 'bank', 'employee', 'expense', 'temporary') THEN
      COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
    WHEN a.type = 'income' THEN
      COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
    ELSE 0
  END as computed_balance,
  a.created_at
FROM accounts a
LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
GROUP BY a.id
ORDER BY a.account_number;

-- 5. RPC: Create manual journal entry (balanced)
CREATE OR REPLACE FUNCTION create_journal_entry(
  p_lines JSONB,  -- Array of {account_id, debit, credit, currency_code, exchange_rate, description}
  p_description TEXT,
  p_reference_number TEXT DEFAULT NULL,
  p_entry_date DATE DEFAULT CURRENT_DATE,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, journal_entry_id UUID) AS $$
DECLARE
  v_je_id UUID;
  v_line JSONB;
  v_total_debit NUMERIC(20, 4) := 0;
  v_total_credit NUMERIC(20, 4) := 0;
  v_company_id UUID;
  v_entry_num TEXT;
BEGIN
  -- Get company context
  v_company_id := get_user_current_company();
  IF v_company_id IS NULL THEN
    RETURN QUERY SELECT false, 'لا يوجد لديك شركة نشطة', NULL;
    RETURN;
  END IF;

  -- Validate that all lines have valid data
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    IF (v_line->>'debit')::NUMERIC < 0 OR (v_line->>'credit')::NUMERIC < 0 THEN
      RETURN QUERY SELECT false, 'لا يمكن إدخال مبالغ سالبة', NULL;
      RETURN;
    END IF;
    v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::NUMERIC, 0);
    v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::NUMERIC, 0);
  END LOOP;

  -- Balance validation
  IF ROUND(v_total_debit, 4) != ROUND(v_total_credit, 4) THEN
    RETURN QUERY SELECT false,
      'السجل غير متوازن! المدين: ' || v_total_debit || ' والدائن: ' || v_total_credit,
      NULL;
    RETURN;
  END IF;

  -- Generate entry number
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(COALESCE(MAX(SUBSTRING(entry_number FROM '-\d+$')), 0)::INT + 1, 6, '0')
  INTO v_entry_num
  FROM journal_entries WHERE entry_number LIKE 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-%';

  -- Create journal entry header
  INSERT INTO journal_entries (
    company_id, entry_number, entry_date, description, reference_number,
    source_type, source_id, project_id, status, posted_by, posted_at
  ) VALUES (
    v_company_id,
    v_entry_num,
    p_entry_date,
    p_description,
    p_reference_number,
    'manual',
    NULL,
    p_project_id,
    'posted',
    auth.uid(),
    NOW()
  ) RETURNING id INTO v_je_id;

  -- Insert journal entry lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_id, debit, credit,
      currency_code, exchange_rate, line_description, company_id
    ) VALUES (
      v_je_id,
      (v_line->>'account_id')::UUID,
      COALESCE((v_line->>'debit')::NUMERIC, 0),
      COALESCE((v_line->>'credit')::NUMERIC, 0),
      COALESCE(v_line->>'currency_code', 'LYD'),
      COALESCE((v_line->>'exchange_rate')::NUMERIC, 1),
      v_line->>'description',
      v_company_id
    );
  END LOOP;

  RETURN QUERY SELECT true, 'تم إنشاء القيد بنجاح', v_je_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Trial Balance Report
CREATE OR REPLACE FUNCTION get_trial_balance(
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE(
  account_id UUID,
  account_number TEXT,
  account_name TEXT,
  account_name_ar TEXT,
  currency_code TEXT,
  main_type TEXT,
  debit_amount NUMERIC,
  credit_amount NUMERIC
) AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := get_user_current_company();

  RETURN QUERY
  SELECT
    a.id,
    a.account_number,
    COALESCE(a.account_name_ar, a.account_name),
    a.account_name,
    a.currency_code,
    a.type as main_type,
    COALESCE(SUM(jel.debit), 0) as debit_amount,
    COALESCE(SUM(jel.credit), 0) as credit_amount
  FROM accounts a
  LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
    AND je.status = 'posted'
    AND (p_date_from IS NULL OR je.entry_date >= p_date_from)
    AND (p_date_to IS NULL OR je.entry_date <= p_date_to)
  WHERE a.company_id = v_company_id
    AND a.is_active = true
  GROUP BY a.id, a.account_number, a.account_name, a.account_name_ar, a.currency_code, a.type
  HAVING COALESCE(SUM(jel.debit), 0) != 0 OR COALESCE(SUM(jel.credit), 0) != 0
  ORDER BY a.account_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: General Journal Report
CREATE OR REPLACE FUNCTION get_general_journal(
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_account_id UUID DEFAULT NULL
)
RETURNS TABLE(
  entry_id UUID,
  entry_number TEXT,
  entry_date DATE,
  description TEXT,
  reference_number TEXT,
  account_id UUID,
  account_name TEXT,
  account_name_ar TEXT,
  debit NUMERIC,
  credit NUMERIC,
  currency_code TEXT,
  status TEXT,
  posted_at TIMESTAMPTZ
) AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := get_user_current_company();

  RETURN QUERY
  SELECT
    je.id,
    je.entry_number,
    je.entry_date,
    je.description,
    je.reference_number,
    a.id as account_id,
    a.account_name,
    a.account_name_ar,
    jel.debit,
    jel.credit,
    jel.currency_code,
    je.status,
    je.posted_at
  FROM journal_entries je
  JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
  JOIN accounts a ON a.id = jel.account_id
  WHERE je.company_id = v_company_id
    AND (p_date_from IS NULL OR je.entry_date >= p_date_from)
    AND (p_date_to IS NULL OR je.entry_date <= p_date_to)
    AND (p_account_id IS NULL OR a.id = p_account_id)
    AND je.status = 'posted'
  ORDER BY je.entry_date DESC, je.entry_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: Account Ledger (T-Account)
CREATE OR REPLACE FUNCTION get_account_ledger(
  p_account_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE(
  entry_id UUID,
  entry_number TEXT,
  entry_date DATE,
  description TEXT,
  debit NUMERIC,
  credit NUMERIC,
  running_balance NUMERIC,
  currency_code TEXT
) AS $$
DECLARE
  v_company_id UUID;
  v_opening_balance NUMERIC(20, 4) := 0;
BEGIN
  v_company_id := get_user_current_company();

  -- Get opening balance (before date_from)
  SELECT
    COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
  INTO v_opening_balance
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.journal_entry_id
  WHERE jel.account_id = p_account_id
    AND je.company_id = v_company_id
    AND je.status = 'posted'
    AND (p_date_from IS NULL OR je.entry_date < p_date_from);

  RETURN QUERY
  SELECT
    je.id,
    je.entry_number,
    je.entry_date,
    je.description,
    jel.debit,
    jel.credit,
    v_opening_balance + SUM(jel.debit - jel.credit) OVER (
      ORDER BY je.entry_date, je.entry_number
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as running_balance,
    jel.currency_code
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.journal_entry_id
  WHERE jel.account_id = p_account_id
    AND je.company_id = v_company_id
    AND je.status = 'posted'
    AND (p_date_from IS NULL OR je.entry_date >= p_date_from)
    AND (p_date_to IS NULL OR je.entry_date <= p_date_to)
  ORDER BY je.entry_date, je.entry_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: Balance Sheet
CREATE OR REPLACE FUNCTION get_balance_sheet(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  category TEXT,
  account_id UUID,
  account_name TEXT,
  account_name_ar TEXT,
  balance NUMERIC,
  currency_code TEXT
) AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := get_user_current_company();

  RETURN QUERY
  SELECT
    'الأصول'::TEXT as category,
    a.id,
    a.account_name,
    a.account_name_ar,
    SUM(jel.debit) - SUM(jel.credit) as balance,
    a.currency_code
  FROM accounts a
  LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date <= p_date
  WHERE a.company_id = v_company_id AND a.type IN ('cashbox', 'bank', 'employee', 'temporary')
  GROUP BY a.id, a.account_name, a.account_name_ar, a.currency_code

  UNION ALL

  SELECT
    'الخصوم'::TEXT,
    a.id,
    a.account_name,
    a.account_name_ar,
    SUM(jel.credit) - SUM(jel.debit),
    a.currency_code
  FROM accounts a
  LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date <= p_date
  WHERE a.company_id = v_company_id AND a.type = 'expense'
  GROUP BY a.id, a.account_name, a.account_name_ar, a.currency_code
  HAVING SUM(jel.credit) - SUM(jel.debit) != 0

  UNION ALL

  SELECT
    'حقوق الملكية'::TEXT,
    a.id,
    a.account_name,
    a.account_name_ar,
    SUM(jel.credit) - SUM(jel.debit),
    a.currency_code
  FROM accounts a
  LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date <= p_date
  WHERE a.company_id = v_company_id AND a.type = 'income'
  GROUP BY a.id, a.account_name, a.account_name_ar, a.currency_code
  HAVING SUM(jel.credit) - SUM(jel.debit) != 0

  ORDER BY category, account_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: Income Statement (P&L)
CREATE OR REPLACE FUNCTION get_income_statement(
  p_date_from DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  category TEXT,
  account_id UUID,
  account_name TEXT,
  account_name_ar TEXT,
  debit_amount NUMERIC,
  credit_amount NUMERIC,
  net_amount NUMERIC,
  currency_code TEXT
) AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := get_user_current_company();

  RETURN QUERY
  SELECT
    'الإيرادات'::TEXT as category,
    a.id,
    a.account_name,
    a.account_name_ar,
    COALESCE(SUM(jel.debit), 0) as debit_amount,
    COALESCE(SUM(jel.credit), 0) as credit_amount,
    COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0) as net_amount,
    a.currency_code
  FROM accounts a
  LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date >= p_date_from
    AND je.entry_date <= p_date_to
  WHERE a.company_id = v_company_id AND a.type = 'income'
  GROUP BY a.id, a.account_name, a.account_name_ar, a.currency_code

  UNION ALL

  SELECT
    'المصروفات'::TEXT,
    a.id,
    a.account_name,
    a.account_name_ar,
    COALESCE(SUM(jel.debit), 0) as debit_amount,
    COALESCE(SUM(jel.credit), 0) as credit_amount,
    COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as net_amount,
    a.currency_code
  FROM accounts a
  LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date >= p_date_from
    AND je.entry_date <= p_date_to
  WHERE a.company_id = v_company_id AND a.type = 'expense'
  GROUP BY a.id, a.account_name, a.account_name_ar, a.currency_code

  ORDER BY category DESC, account_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC: Account Search for Journal Entry form
CREATE OR REPLACE FUNCTION search_accounts_for_journal(
  p_query TEXT DEFAULT '',
  p_currency TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  account_number TEXT,
  account_name TEXT,
  account_name_ar TEXT,
  type TEXT,
  currency_code TEXT,
  current_balance NUMERIC
) AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := get_user_current_company();

  RETURN QUERY
  SELECT
    a.id,
    a.account_number,
    COALESCE(a.account_name_ar, a.account_name),
    a.account_name,
    a.type,
    a.currency_code,
    a.balance
  FROM accounts a
  WHERE a.company_id = v_company_id
    AND a.is_active = true
    AND (
      p_query = '' OR
      a.account_name ILIKE '%' || p_query || '%' OR
      a.account_name_ar ILIKE '%' || p_query || '%' OR
      a.account_number ILIKE '%' || p_query || '%'
    )
    AND (p_currency IS NULL OR a.currency_code = p_currency)
  ORDER BY a.account_number
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Audit trigger for journal entries
DROP TRIGGER IF EXISTS audit_journal_entries_changes ON journal_entries;
CREATE TRIGGER audit_journal_entries_changes
  AFTER INSERT OR UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_journal_entry_lines_changes ON journal_entry_lines;
CREATE TRIGGER audit_journal_entry_lines_changes
  AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- 13. Seed default accounting accounts
INSERT INTO accounts (company_id, code, name, type, balance, currency, status, created_by, is_treasury_account)
SELECT
  c.id,
  '1000',
  'النقدية والصناديق',
  'cashbox',
  0,
  c.default_currency,
  'active',
  (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1),
  true
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1000')
LIMIT 1;

INSERT INTO accounts (company_id, code, name, type, balance, currency, status, created_by, is_treasury_account)
SELECT
  c.id,
  '1100',
  'الحسابات البنكية',
  'bank',
  0,
  c.default_currency,
  'active',
  (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1),
  true
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '1100')
LIMIT 1;

INSERT INTO accounts (company_id, code, name, type, balance, currency, status, created_by)
SELECT
  c.id,
  '2000',
  'الذمم المدينة والدائنة',
  'expense',
  0,
  c.default_currency,
  'active',
  (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '2000')
LIMIT 1;

INSERT INTO accounts (company_id, code, name, type, balance, currency, status, created_by)
SELECT
  c.id,
  '4000',
  'الإيرادات',
  'income',
  0,
  c.default_currency,
  'active',
  (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '4000')
LIMIT 1;

INSERT INTO accounts (company_id, code, name, type, balance, currency, status, created_by)
SELECT
  c.id,
  '5000',
  'تكاليف التشغيل',
  'expense',
  0,
  c.default_currency,
  'active',
  (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '5000')
LIMIT 1;