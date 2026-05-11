-- Phase 2.1: Treasury Core — treasuries + treasury_transactions
-- Professional multi-currency treasury management

-- 1. Create treasuries table
CREATE TABLE IF NOT EXISTS treasuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  treasury_code TEXT NOT NULL,
  treasury_name TEXT NOT NULL,
  treasury_name_ar TEXT,
  treasury_type TEXT NOT NULL DEFAULT 'cashbox'
    CHECK (treasury_type IN ('cashbox', 'bank', 'reserve', 'petty_cash', 'escrow')),
  currency_code TEXT NOT NULL DEFAULT 'LYD',
  country TEXT,
  opening_balance NUMERIC(20, 4) DEFAULT 0,
  current_balance NUMERIC(20, 4) DEFAULT 0,
  bank_name TEXT,
  account_number TEXT,
  iban TEXT,
  swift TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  allow_overdraft BOOLEAN DEFAULT false,
  min_balance NUMERIC(20, 4) DEFAULT 0,
  max_balance NUMERIC(20, 4),
  alert_threshold NUMERIC(20, 4),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, treasury_code)
);

-- 2. Create treasury_transactions table
CREATE TABLE IF NOT EXISTS treasuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  treasury_id UUID NOT NULL REFERENCES treasuries(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL
    CHECK (transaction_type IN (
      'deposit', 'withdrawal', 'transfer_in', 'transfer_out',
      'exchange_in', 'exchange_out', 'adjustment', 'reconciliation'
    )),
  amount NUMERIC(20, 4) NOT NULL,
  currency_code TEXT NOT NULL,
  exchange_rate NUMERIC(18, 8) DEFAULT 1,
  destination_amount NUMERIC(20, 4),
  destination_currency TEXT,
  destination_treasury_id UUID REFERENCES treasuries(id),
  description TEXT,
  reference_number TEXT,
  project_id UUID REFERENCES projects(id),
  partner_id UUID,  -- will reference financial_partners when created
  journal_entry_id UUID REFERENCES journal_entries(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop and recreate with correct name
DROP TABLE IF EXISTS treasury_transactions CASCADE;
CREATE TABLE treasury_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  treasury_id UUID NOT NULL REFERENCES treasuries(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL
    CHECK (transaction_type IN (
      'deposit', 'withdrawal', 'transfer_in', 'transfer_out',
      'exchange_in', 'exchange_out', 'adjustment', 'reconciliation'
    )),
  amount NUMERIC(20, 4) NOT NULL,
  currency_code TEXT NOT NULL,
  exchange_rate NUMERIC(18, 8) DEFAULT 1,
  destination_amount NUMERIC(20, 4),
  destination_currency TEXT,
  destination_treasury_id UUID REFERENCES treasuries(id),
  description TEXT,
  reference_number TEXT,
  project_id UUID REFERENCES projects(id),
  partner_id UUID,
  journal_entry_id UUID REFERENCES journal_entries(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create currency_rates table for exchange rate tracking
CREATE TABLE IF NOT EXISTS currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC(18, 8) NOT NULL,
  effective_date DATE NOT NULL,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, base_currency, target_currency, effective_date)
);

-- 4. Enable RLS
ALTER TABLE treasuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;

-- 5. RLS: treasuries
DROP POLICY IF EXISTS "treasuries_select" ON treasuries;
DROP POLICY IF EXISTS "treasuries_write" ON treasuries;
CREATE POLICY "treasuries_select" ON treasuries FOR SELECT TO authenticated
USING (company_id = get_user_current_company());

CREATE POLICY "treasuries_insert" ON treasuries FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'treasury'))
);

CREATE POLICY "treasuries_update" ON treasuries FOR UPDATE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'treasury'))
);

CREATE POLICY "treasuries_delete" ON treasuries FOR DELETE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin'))
);

-- 6. RLS: treasury_transactions
DROP POLICY IF EXISTS "treasury_transactions_select" ON treasury_transactions;
DROP POLICY IF EXISTS "treasury_transactions_insert" ON treasury_transactions;
DROP POLICY IF EXISTS "treasury_transactions_update" ON treasury_transactions;
CREATE POLICY "treasury_transactions_select" ON treasury_transactions FOR SELECT TO authenticated
USING (company_id = get_user_current_company());

CREATE POLICY "treasury_transactions_insert" ON treasury_transactions FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'treasury', 'accountant'))
);

CREATE POLICY "treasury_transactions_update" ON treasury_transactions FOR UPDATE TO authenticated
USING (
  company_id = get_user_current_company()
  AND status = 'pending'
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'treasury'))
);

-- 7. RLS: currency_rates
DROP POLICY IF EXISTS "currency_rates_read" ON currency_rates;
DROP POLICY IF EXISTS "currency_rates_write" ON currency_rates;
CREATE POLICY "currency_rates_read" ON currency_rates FOR SELECT TO authenticated
USING (company_id = get_user_current_company());

CREATE POLICY "currency_rates_write" ON currency_rates FOR ALL TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'treasury', 'accountant'))
);

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_treasuries_company ON treasuries(company_id);
CREATE INDEX IF NOT EXISTS idx_treasuries_currency ON treasuries(currency_code);
CREATE INDEX IF NOT EXISTS idx_treasuries_type ON treasuries(treasury_type);
CREATE INDEX IF NOT EXISTS idx_treasuries_status ON treasuries(is_active);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_treasury ON treasury_transactions(treasury_id);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_date ON treasury_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_project ON treasury_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_status ON treasury_transactions(status);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_type ON treasury_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_currency_rates_company ON currency_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_currency_rates_pair ON currency_rates(base_currency, target_currency);

-- 9. Update timestamp triggers
CREATE OR REPLACE FUNCTION update_treasuries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_treasuries_updated_at ON treasuries;
CREATE TRIGGER update_treasuries_updated_at
  BEFORE UPDATE ON treasuries FOR EACH ROW EXECUTE FUNCTION update_treasuries_updated_at();

CREATE OR REPLACE FUNCTION update_treasury_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_treasury_transactions_updated_at ON treasury_transactions;
CREATE TRIGGER update_treasury_transactions_updated_at
  BEFORE UPDATE ON treasury_transactions FOR EACH ROW EXECUTE FUNCTION update_treasury_transactions_updated_at();

-- 10. Audit triggers
DROP TRIGGER IF EXISTS audit_treasuries_changes ON treasuries;
CREATE TRIGGER audit_treasuries_changes
  AFTER INSERT OR UPDATE OR DELETE ON treasuries
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_treasury_transactions_changes ON treasury_transactions;
CREATE TRIGGER audit_treasury_transactions_changes
  AFTER INSERT OR UPDATE OR DELETE ON treasury_transactions
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- 11. RPC: Approve treasury transaction with balance update + journal entry
CREATE OR REPLACE FUNCTION approve_treasury_transaction(
  p_transaction_id UUID,
  p_approver_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT, treasury_balance NUMERIC, journal_entry_id UUID) AS $$
DECLARE
  v_tx treasury_transactions%ROWTYPE;
  v_treasury treasuries%ROWTYPE;
  v_dest_treasury treasuries%ROWTYPE;
  v_balance_change NUMERIC(20, 4);
  v_je_id UUID;
  v_entry_num TEXT;
  v_company_id UUID;
BEGIN
  -- Get transaction
  SELECT * INTO v_tx FROM treasury_transactions WHERE id = p_transaction_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'التحويل غير موجود أو تم قبوله مسبقاً', NULL, NULL;
    RETURN;
  END IF;

  v_company_id := v_tx.company_id;

  -- Get treasury
  SELECT * INTO v_treasury FROM treasuries WHERE id = v_tx.treasury_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'الخزينة غير موجودة', NULL, NULL;
    RETURN;
  END IF;

  -- Check balance for withdrawal/transfer_out
  IF v_tx.transaction_type IN ('withdrawal', 'transfer_out', 'exchange_out') THEN
    IF v_treasury.current_balance < v_tx.amount THEN
      RETURN QUERY SELECT false, 'رصيد غير كافٍ في الخزينة', v_treasury.current_balance, NULL;
      RETURN;
    END IF;
  END IF;

  -- Calculate balance change
  IF v_tx.transaction_type IN ('deposit', 'transfer_in', 'exchange_in') THEN
    v_balance_change := v_tx.amount;
  ELSIF v_tx.transaction_type IN ('withdrawal', 'transfer_out', 'exchange_out') THEN
    v_balance_change := -v_tx.amount;
  ELSE
    v_balance_change := 0;
  END IF;

  -- Update source treasury balance
  UPDATE treasuries
  SET current_balance = current_balance + v_balance_change,
      updated_at = NOW()
  WHERE id = v_tx.treasury_id;

  -- Handle destination for transfers
  IF v_tx.destination_treasury_id IS NOT NULL AND v_tx.destination_amount IS NOT NULL THEN
    SELECT * INTO v_dest_treasury FROM treasuries WHERE id = v_tx.destination_treasury_id;

    IF v_dest_treasury.currency_code = v_treasury.currency_code THEN
      UPDATE treasuries
      SET current_balance = current_balance + v_tx.destination_amount,
          updated_at = NOW()
      WHERE id = v_tx.destination_treasury_id;
    ELSE
      -- Multi-currency: add destination amount to destination treasury
      UPDATE treasuries
      SET current_balance = current_balance + v_tx.destination_amount,
          updated_at = NOW()
      WHERE id = v_tx.destination_treasury_id;
    END IF;
  END IF;

  -- Create journal entry for the transaction
  v_entry_num := 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('je_sequence')::TEXT, 6, '0');

  INSERT INTO journal_entries (entry_number, entry_date, description, reference_number,
    source_type, source_id, project_id, status, posted_by, posted_at, company_id)
  VALUES (
    v_entry_num,
    CURRENT_DATE,
    CASE v_tx.transaction_type
      WHEN 'deposit' THEN 'إيداع إلى ' || v_treasury.treasury_name
      WHEN 'withdrawal' THEN 'سحب من ' || v_treasury.treasury_name
      WHEN 'transfer_in' THEN 'تحويل داخل إلى ' || v_treasury.treasury_name
      WHEN 'transfer_out' THEN 'تحويل خارج من ' || v_treasury.treasury_name
      WHEN 'exchange_in' THEN 'صرف إلى ' || v_treasury.treasury_name
      WHEN 'exchange_out' THEN 'صرف من ' || v_treasury.treasury_name
      ELSE 'عملية خزينة'
    END,
    v_tx.reference_number,
    'auto_treasury',
    v_tx.id,
    v_tx.project_id,
    'posted',
    p_approver_id,
    NOW(),
    v_company_id
  ) RETURNING id INTO v_je_id;

  v_tx.journal_entry_id := v_je_id;

  -- Journal entry lines
  -- Debit side
  IF v_tx.transaction_type IN ('deposit', 'transfer_in', 'exchange_in') THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, exchange_rate, description, company_id)
    SELECT v_je_id, a.id, v_tx.amount, 0, v_treasury.currency_code, 1,
           'إيداع / تحويل داخل - ' || v_treasury.treasury_name, v_company_id
    FROM accounts a
    WHERE a.treasury_id = v_tx.treasury_id AND a.account_type = 'asset'
    LIMIT 1;

    IF v_tx.destination_treasury_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, exchange_rate, description, company_id)
      SELECT v_je_id, a.id, 0, v_tx.destination_amount, v_dest_treasury.currency_code, v_tx.exchange_rate,
             'تحويل - ' || v_dest_treasury.treasury_name, v_company_id
      FROM accounts a
      WHERE a.treasury_id = v_tx.destination_treasury_id AND a.account_type = 'asset'
      LIMIT 1;
    END IF;
  ELSIF v_tx.transaction_type IN ('withdrawal', 'transfer_out', 'exchange_out') THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, exchange_rate, description, company_id)
    SELECT v_je_id, a.id, 0, v_tx.amount, v_treasury.currency_code, 1,
           'سحب / تحويل خارج - ' || v_treasury.treasury_name, v_company_id
    FROM accounts a
    WHERE a.treasury_id = v_tx.treasury_id AND a.account_type = 'asset'
    LIMIT 1;

    IF v_tx.destination_treasury_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, exchange_rate, description, company_id)
      SELECT v_je_id, a.id, v_tx.destination_amount, 0, v_dest_treasury.currency_code, v_tx.exchange_rate,
             'تحويل - ' || v_dest_treasury.treasury_name, v_company_id
      FROM accounts a
      WHERE a.treasury_id = v_tx.destination_treasury_id AND a.account_type = 'asset'
      LIMIT 1;
    END IF;
  END IF;

  -- Update transaction status
  UPDATE treasury_transactions
  SET status = 'approved',
      approved_by = p_approver_id,
      approved_at = NOW(),
      journal_entry_id = v_je_id
  WHERE id = p_transaction_id;

  RETURN QUERY SELECT true, 'تمت الموافقة بنجاح', v_treasury.current_balance + v_balance_change, v_je_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Sequence for journal entry numbers
DROP SEQUENCE IF EXISTS je_sequence;
CREATE SEQUENCE je_sequence START 1;

-- 13. RPC: Get treasury balance summary
CREATE OR REPLACE FUNCTION get_treasury_summary(p_company_id UUID DEFAULT NULL)
RETURNS TABLE(
  treasury_id UUID,
  treasury_name TEXT,
  currency_code TEXT,
  treasury_type TEXT,
  current_balance NUMERIC,
  transaction_count BIGINT,
  last_transaction TIMESTAMPTZ
) AS $$
BEGIN
  IF p_company_id IS NULL THEN
    p_company_id := get_user_current_company();
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    COALESCE(t.treasury_name_ar, t.treasury_name),
    t.currency_code,
    t.treasury_type,
    t.current_balance,
    COUNT(tt.id)::BIGINT as transaction_count,
    MAX(tt.created_at) as last_transaction
  FROM treasuries t
  LEFT JOIN treasury_transactions tt ON tt.treasury_id = t.id AND tt.status = 'approved'
  WHERE t.company_id = p_company_id AND t.is_active = true
  GROUP BY t.id, t.treasury_name, t.treasury_name_ar, t.currency_code, t.treasury_type, t.current_balance
  ORDER BY t.treasury_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. RPC: Get treasury transaction history
CREATE OR REPLACE FUNCTION get_treasury_history(
  p_treasury_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  transaction_type TEXT,
  amount NUMERIC,
  currency_code TEXT,
  exchange_rate NUMERIC,
  destination_amount NUMERIC,
  destination_currency TEXT,
  description TEXT,
  reference_number TEXT,
  status TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  balance_before NUMERIC,
  balance_after NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tt.id,
    tt.transaction_type,
    tt.amount,
    tt.currency_code,
    tt.exchange_rate,
    tt.destination_amount,
    tt.destination_currency,
    tt.description,
    tt.reference_number,
    tt.status,
    COALESCE(p.full_name, 'نظام') as created_by_name,
    tt.created_at,
    t.current_balance as balance_after
  FROM treasury_transactions tt
  JOIN treasuries t ON t.id = tt.treasury_id
  LEFT JOIN profiles p ON p.id = tt.created_by
  WHERE tt.treasury_id = p_treasury_id
    AND (p_date_from IS NULL OR tt.created_at::DATE >= p_date_from)
    AND (p_date_to IS NULL OR tt.created_at::DATE <= p_date_to)
  ORDER BY tt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. RPC: Create currency exchange transfer between treasuries
CREATE OR REPLACE FUNCTION create_currency_transfer(
  p_source_treasury_id UUID,
  p_destination_treasury_id UUID,
  p_source_amount NUMERIC,
  p_exchange_rate NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, transaction_id UUID) AS $$
DECLARE
  v_source_treasury treasuries%ROWTYPE;
  v_dest_treasury treasuries%ROWTYPE;
  v_company_id UUID;
  v_tx_id UUID;
  v_dest_amount NUMERIC;
BEGIN
  -- Get source treasury
  SELECT * INTO v_source_treasury FROM treasuries WHERE id = p_source_treasury_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'الخزينة المصدر غير موجودة', NULL;
    RETURN;
  END IF;

  -- Get destination treasury
  SELECT * INTO v_dest_treasury FROM treasuries WHERE id = p_destination_treasury_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'الخزينة الوجهة غير موجودة', NULL;
    RETURN;
  END IF;

  -- Same treasury check
  IF p_source_treasury_id = p_destination_treasury_id THEN
    RETURN QUERY SELECT false, 'لا يمكن التحويل للخزينة نفسها', NULL;
    RETURN;
  END IF;

  -- Balance check
  IF v_source_treasury.current_balance < p_source_amount THEN
    RETURN QUERY SELECT false, 'رصيد غير كافٍ', NULL;
    RETURN;
  END IF;

  -- Same currency check
  IF v_source_treasury.currency_code = v_dest_treasury.currency_code AND p_exchange_rate != 1 THEN
    RETURN QUERY SELECT false, 'سعر الصرف يجب أن يكون 1 للعملات المتشابهة', NULL;
    RETURN;
  END IF;

  v_company_id := v_source_treasury.company_id;
  v_dest_amount := ROUND(p_source_amount * p_exchange_rate, 4);

  -- Create treasury transaction (source - withdrawal/transfer_out)
  INSERT INTO treasury_transactions (
    company_id, treasury_id, transaction_type, amount, currency_code,
    exchange_rate, destination_amount, destination_currency,
    destination_treasury_id, description, reference_number,
    project_id, status, created_by
  ) VALUES (
    v_company_id, p_source_treasury_id, 'transfer_out', p_source_amount, v_source_treasury.currency_code,
    p_exchange_rate, v_dest_amount, v_dest_treasury.currency_code,
    p_destination_treasury_id, p_description, p_reference,
    p_project_id, 'pending', auth.uid()
  ) RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT true, 'تم إنشاء التحويل', v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Seed default treasuries for seed company
INSERT INTO treasuries (company_id, treasury_code, treasury_name, treasury_name_ar, treasury_type, currency_code, country, opening_balance, current_balance, created_by)
SELECT
  c.id,
  'CASH-' || c.company_name_ar,
  c.company_name || ' Main Cashbox',
  'الصندوق الرئيسي',
  'cashbox',
  c.default_currency,
  c.country,
  0,
  0,
  (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM treasuries WHERE company_id = c.id)
LIMIT 1;