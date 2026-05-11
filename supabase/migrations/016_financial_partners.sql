-- Phase 4: Financial Partners System
-- Partners: external manufacturing partners with dynamic, fluctuating balances
-- Balance model: Positive = Partner owes us | Negative = We owe partner

-- 1. Create financial_partners table
CREATE TABLE IF NOT EXISTS financial_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  partner_code TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  partner_name_ar TEXT,
  country TEXT,
  currency_code TEXT DEFAULT 'USD',
  balance NUMERIC(20, 4) DEFAULT 0,  -- Computed from ledger, cached here
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_iban TEXT,
  bank_swift TEXT,
  tax_number TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, partner_code)
);

-- 2. Create partner_ledger_entries table
CREATE TABLE IF NOT EXISTS partner_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES financial_partners(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL
    CHECK (entry_type IN (
      'advance_sent', 'advance_received',
      'material_purchase', 'labor_cost',
      'reimbursement', 'adjustment',
      'settlement', 'return', 'other'
    )),
  amount NUMERIC(20, 4) NOT NULL,  -- Always positive
  currency_code TEXT NOT NULL DEFAULT 'USD',
  balance_after NUMERIC(20, 4) DEFAULT 0,  -- Running balance after this entry
  description TEXT,
  reference_number TEXT,
  treasury_transaction_id UUID REFERENCES treasury_transactions(id),
  journal_entry_id UUID REFERENCES journal_entries(id),
  project_id UUID REFERENCES projects(id),
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create balance_summary view for partners
CREATE OR REPLACE VIEW v_partner_balance_summary AS
SELECT
  fp.id,
  fp.company_id,
  fp.partner_code,
  fp.partner_name,
  fp.partner_name_ar,
  fp.country,
  fp.currency_code,
  fp.balance as cached_balance,
  COALESCE(SUM(
    CASE
      WHEN ple.entry_type IN ('advance_sent', 'advance_received', 'return') THEN ple.amount
      WHEN ple.entry_type IN ('material_purchase', 'labor_cost', 'reimbursement', 'settlement', 'other') THEN -ple.amount
      WHEN ple.entry_type = 'adjustment' THEN ple.amount  -- can be +/-
      ELSE 0
    END
  ), 0) as computed_balance,
  COUNT(ple.id) as total_entries,
  MAX(ple.created_at) as last_entry_date,
  SUM(CASE WHEN ple.entry_type = 'advance_sent' THEN ple.amount ELSE 0 END) as total_advances,
  SUM(CASE WHEN ple.entry_type IN ('material_purchase', 'labor_cost', 'reimbursement', 'other') THEN ple.amount ELSE 0 END) as total_expenses
FROM financial_partners fp
LEFT JOIN partner_ledger_entries ple ON ple.partner_id = fp.id
GROUP BY fp.id, fp.company_id, fp.partner_code, fp.partner_name, fp.partner_name_ar, fp.country, fp.currency_code, fp.balance;

-- 4. Enable RLS
ALTER TABLE financial_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_ledger_entries ENABLE ROW LEVEL SECURITY;

-- 5. RLS: financial_partners
DROP POLICY IF EXISTS "financial_partners_select" ON financial_partners;
DROP POLICY IF EXISTS "financial_partners_insert" ON financial_partners;
DROP POLICY IF EXISTS "financial_partners_update" ON financial_partners;
DROP POLICY IF EXISTS "financial_partners_delete" ON financial_partners;
CREATE POLICY "financial_partners_select" ON financial_partners FOR SELECT TO authenticated
USING (company_id = get_user_current_company());
CREATE POLICY "financial_partners_insert" ON financial_partners FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'operations'))
);
CREATE POLICY "financial_partners_update" ON financial_partners FOR UPDATE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'operations'))
);
CREATE POLICY "financial_partners_delete" ON financial_partners FOR DELETE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin'))
);

-- 6. RLS: partner_ledger_entries
DROP POLICY IF EXISTS "partner_ledger_entries_select" ON partner_ledger_entries;
DROP POLICY IF EXISTS "partner_ledger_entries_insert" ON partner_ledger_entries;
CREATE POLICY "partner_ledger_entries_select" ON partner_ledger_entries FOR SELECT TO authenticated
USING (company_id = get_user_current_company());
CREATE POLICY "partner_ledger_entries_insert" ON partner_ledger_entries FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'operations', 'accountant'))
);

-- 7. Update timestamp trigger
CREATE OR REPLACE FUNCTION update_financial_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_financial_partners_updated_at ON financial_partners;
CREATE TRIGGER update_financial_partners_updated_at
  BEFORE UPDATE ON financial_partners FOR EACH ROW EXECUTE FUNCTION update_financial_partners_updated_at();

-- 8. Audit triggers
DROP TRIGGER IF EXISTS audit_financial_partners_changes ON financial_partners;
CREATE TRIGGER audit_financial_partners_changes
  AFTER INSERT OR UPDATE OR DELETE ON financial_partners
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_partner_ledger_entries_changes ON partner_ledger_entries;
CREATE TRIGGER audit_partner_ledger_entries_changes
  AFTER INSERT OR UPDATE OR DELETE ON partner_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_financial_partners_company ON financial_partners(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_partners_code ON financial_partners(partner_code);
CREATE INDEX IF NOT EXISTS idx_financial_partners_country ON financial_partners(country);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_partner ON partner_ledger_entries(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_date ON partner_ledger_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_type ON partner_ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_project ON partner_ledger_entries(project_id);

-- 10. RPC: Record partner advance (money sent to partner)
CREATE OR REPLACE FUNCTION record_partner_advance(
  p_partner_id UUID,
  p_amount NUMERIC,
  p_currency_code TEXT DEFAULT 'USD',
  p_description TEXT DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_treasury_transaction_id UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, ledger_entry_id UUID, journal_entry_id UUID) AS $$
DECLARE
  v_partner financial_partners%ROWTYPE;
  v_company_id UUID;
  v_balance_after NUMERIC(20, 4);
  v_ledger_id UUID;
  v_je_id UUID;
  v_je_num TEXT;
BEGIN
  -- Get partner
  SELECT * INTO v_partner FROM financial_partners WHERE id = p_partner_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'الشريك غير موجود', NULL, NULL;
    RETURN;
  END IF;

  v_company_id := v_partner.company_id;

  -- Calculate new balance (positive = we are owed)
  v_balance_after := v_partner.balance + p_amount;

  -- Insert ledger entry
  INSERT INTO partner_ledger_entries (
    company_id, partner_id, entry_type, amount, currency_code,
    balance_after, description, reference_number,
    treasury_transaction_id, project_id, recorded_by
  ) VALUES (
    v_company_id, p_partner_id, 'advance_sent', p_amount, p_currency_code,
    v_balance_after, p_description, p_reference_number,
    p_treasury_transaction_id, p_project_id, auth.uid()
  ) RETURNING id INTO v_ledger_id;

  -- Update partner cached balance
  UPDATE financial_partners SET balance = v_balance_after, updated_at = NOW() WHERE id = p_partner_id;

  -- Create journal entry
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(COALESCE(MAX(SUBSTRING(entry_number FROM '-\d+$')::INT), 0) + 1, 6, '0')
  INTO v_je_num
  FROM journal_entries WHERE entry_number LIKE 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-%';

  INSERT INTO journal_entries (
    company_id, entry_number, entry_date, description, reference_number,
    source_type, source_id, project_id, status, posted_by, posted_at
  ) VALUES (
    v_company_id, v_je_num, CURRENT_DATE,
    'سلفة للشريك: ' || v_partner.partner_name_ar || ' — ' || COALESCE(p_description, 'سلفة'),
    p_reference_number, 'auto_partner', p_partner_id, p_project_id,
    'posted', auth.uid(), NOW()
  ) RETURNING id INTO v_je_id;

  -- Debit: Partner Advances (Asset/Receivable)
  -- Find or create partner control account
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
  SELECT v_je_id, a.id, p_amount, 0, p_currency_code,
         'سلفة للشريك: ' || v_partner.partner_name_ar, v_company_id
  FROM accounts a
  WHERE a.company_id = v_company_id
    AND a.name ILIKE '%شريك%' AND a.type IN ('expense', 'temporary')
  LIMIT 1;

  -- Credit: Cash/Bank (treasury account)
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
  SELECT v_je_id, a.id, 0, p_amount, p_currency_code,
         'صرف سلفة للشريك: ' || v_partner.partner_name_ar, v_company_id
  FROM accounts a
  WHERE a.company_id = v_company_id
    AND a.is_treasury_account = true
    AND a.currency_code = p_currency_code
  LIMIT 1;

  RETURN QUERY SELECT true, 'تم تسجيل السلفة بنجاح', v_ledger_id, v_je_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC: Record partner expense (material purchase, labor cost)
CREATE OR REPLACE FUNCTION record_partner_expense(
  p_partner_id UUID,
  p_entry_type TEXT,  -- 'material_purchase' or 'labor_cost'
  p_amount NUMERIC,
  p_currency_code TEXT DEFAULT 'USD',
  p_description TEXT DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, ledger_entry_id UUID, journal_entry_id UUID) AS $$
DECLARE
  v_partner financial_partners%ROWTYPE;
  v_company_id UUID;
  v_balance_after NUMERIC(20, 4);
  v_ledger_id UUID;
  v_je_id UUID;
  v_je_num TEXT;
BEGIN
  -- Validate entry type
  IF p_entry_type NOT IN ('material_purchase', 'labor_cost', 'reimbursement', 'other') THEN
    RETURN QUERY SELECT false, 'نوع العملية غير صحيح', NULL, NULL;
    RETURN;
  END IF;

  SELECT * INTO v_partner FROM financial_partners WHERE id = p_partner_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'الشريك غير موجود', NULL, NULL;
    RETURN;
  END IF;

  v_company_id := v_partner.company_id;

  -- Deduct from balance (negative = reduces what partner owes us)
  v_balance_after := v_partner.balance - p_amount;

  -- Insert ledger entry
  INSERT INTO partner_ledger_entries (
    company_id, partner_id, entry_type, amount, currency_code,
    balance_after, description, reference_number,
    project_id, recorded_by
  ) VALUES (
    v_company_id, p_partner_id, p_entry_type, p_amount, p_currency_code,
    v_balance_after, p_description, p_reference_number,
    p_project_id, auth.uid()
  ) RETURNING id INTO v_ledger_id;

  -- Update partner cached balance
  UPDATE financial_partners SET balance = v_balance_after, updated_at = NOW() WHERE id = p_partner_id;

  -- Create journal entry
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(COALESCE(MAX(SUBSTRING(entry_number FROM '-\d+$')::INT), 0) + 1, 6, '0')
  INTO v_je_num
  FROM journal_entries WHERE entry_number LIKE 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-%';

  INSERT INTO journal_entries (
    company_id, entry_number, entry_date, description, reference_number,
    source_type, source_id, project_id, status, posted_by, posted_at
  ) VALUES (
    v_company_id, v_je_num, CURRENT_DATE,
    CASE p_entry_type
      WHEN 'material_purchase' THEN 'شراء مواد - ' || v_partner.partner_name_ar
      WHEN 'labor_cost' THEN 'تكاليف عمالة - ' || v_partner.partner_name_ar
      WHEN 'reimbursement' THEN 'سداد للشريك - ' || v_partner.partner_name_ar
      ELSE p_description
    END,
    p_reference_number, 'auto_partner', p_partner_id, p_project_id,
    'posted', auth.uid(), NOW()
  ) RETURNING id INTO v_je_id;

  -- Debit: Manufacturing Cost or Labor Cost
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
  SELECT v_je_id, a.id, p_amount, 0, p_currency_code,
         CASE p_entry_type WHEN 'material_purchase' THEN 'تكاليف التصنيع' WHEN 'labor_cost' THEN 'تكاليف العمالة' ELSE 'مصروف' END,
         v_company_id
  FROM accounts a
  WHERE a.company_id = v_company_id AND a.type = 'expense'
  LIMIT 1;

  -- Credit: Partner Advances (reduces receivable)
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
  SELECT v_je_id, a.id, 0, p_amount, p_currency_code,
         'خصم من سلفة الشريك: ' || v_partner.partner_name_ar, v_company_id
  FROM accounts a
  WHERE a.company_id = v_company_id AND a.type IN ('expense', 'temporary')
    AND a.name ILIKE '%شريك%'
  LIMIT 1;

  RETURN QUERY SELECT true, 'تم تسجيل العملية بنجاح', v_ledger_id, v_je_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC: Settle partner (final settlement)
CREATE OR REPLACE FUNCTION settle_partner(
  p_partner_id UUID,
  p_settlement_amount NUMERIC,
  p_direction TEXT,  -- 'we_pay' or 'partner_pays'
  p_currency_code TEXT DEFAULT 'USD',
  p_description TEXT DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, ledger_entry_id UUID) AS $$
DECLARE
  v_partner financial_partners%ROWTYPE;
  v_company_id UUID;
  v_balance_after NUMERIC(20, 4);
  v_ledger_id UUID;
  v_entry_type TEXT;
BEGIN
  SELECT * INTO v_partner FROM financial_partners WHERE id = p_partner_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'الشريك غير موجود', NULL, NULL;
    RETURN;
  END IF;

  v_company_id := v_partner.company_id;

  IF p_direction = 'we_pay' THEN
    v_entry_type := 'reimbursement';
    -- We pay partner: reduces balance further
    v_balance_after := v_partner.balance - p_settlement_amount;
  ELSE
    v_entry_type := 'advance_received';
    -- Partner pays us: increases balance (partner owes more)
    v_balance_after := v_partner.balance + p_settlement_amount;
  END IF;

  INSERT INTO partner_ledger_entries (
    company_id, partner_id, entry_type, amount, currency_code,
    balance_after, description, reference_number, recorded_by
  ) VALUES (
    v_company_id, p_partner_id, v_entry_type, p_settlement_amount, p_currency_code,
    v_balance_after, COALESCE(p_description, 'تسوية مع الشريك'), p_reference_number, auth.uid()
  ) RETURNING id INTO v_ledger_id;

  UPDATE financial_partners SET balance = v_balance_after, updated_at = NOW() WHERE id = p_partner_id;

  RETURN QUERY SELECT true, 'تمت التسوية بنجاح', v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. RPC: Get partner statement
CREATE OR REPLACE FUNCTION get_partner_statement(
  p_partner_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  entry_type TEXT,
  amount NUMERIC,
  currency_code TEXT,
  balance_after NUMERIC,
  description TEXT,
  reference_number TEXT,
  project_name TEXT,
  recorded_by_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ple.id,
    ple.entry_type,
    ple.amount,
    ple.currency_code,
    ple.balance_after,
    ple.description,
    ple.reference_number,
    COALESCE(p.name, '—') as project_name,
    COALESCE(pr.full_name, '—') as recorded_by_name,
    ple.created_at
  FROM partner_ledger_entries ple
  LEFT JOIN projects p ON p.id = ple.project_id
  LEFT JOIN profiles pr ON pr.id = ple.recorded_by
  WHERE ple.partner_id = p_partner_id
    AND (p_date_from IS NULL OR ple.created_at::DATE >= p_date_from)
    AND (p_date_to IS NULL OR ple.created_at::DATE <= p_date_to)
  ORDER BY ple.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. RPC: Get partners with summary
CREATE OR REPLACE FUNCTION get_partners_summary()
RETURNS TABLE(
  id UUID,
  partner_code TEXT,
  partner_name TEXT,
  partner_name_ar TEXT,
  country TEXT,
  currency_code TEXT,
  balance NUMERIC,
  total_advances NUMERIC,
  total_expenses NUMERIC,
  total_entries BIGINT,
  last_entry_date TIMESTAMPTZ,
  is_active BOOLEAN
) AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := get_user_current_company();

  RETURN QUERY
  SELECT
    fp.id,
    fp.partner_code,
    fp.partner_name,
    fp.partner_name_ar,
    fp.country,
    fp.currency_code,
    COALESCE(vpbs.computed_balance, fp.balance) as balance,
    COALESCE(vpbs.total_advances, 0) as total_advances,
    COALESCE(vpbs.total_expenses, 0) as total_expenses,
    COALESCE(vpbs.total_entries, 0) as total_entries,
    vpbs.last_entry_date,
    fp.is_active
  FROM financial_partners fp
  LEFT JOIN v_partner_balance_summary vpbs ON vpbs.id = fp.id
  WHERE fp.company_id = v_company_id
  ORDER BY balance DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. RPC: Get partner balance
CREATE OR REPLACE FUNCTION get_partner_balance(p_partner_id UUID)
RETURNS TABLE(
  partner_id UUID,
  partner_name TEXT,
  currency_code TEXT,
  balance NUMERIC,
  total_advances NUMERIC,
  total_expenses NUMERIC,
  net_balance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fp.id as partner_id,
    fp.partner_name,
    fp.currency_code,
    COALESCE(vpbs.balance, fp.balance) as balance,
    COALESCE(vpbs.total_advances, 0) as total_advances,
    COALESCE(vpbs.total_expenses, 0) as total_expenses,
    COALESCE(vpbs.computed_balance, fp.balance) as net_balance
  FROM financial_partners fp
  LEFT JOIN v_partner_balance_summary vpbs ON vpbs.id = fp.id
  WHERE fp.id = p_partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;