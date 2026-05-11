-- Phase 5: Supplier Management System
-- Track suppliers, their invoices, and payments

-- 1. Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_code TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_name_ar TEXT,
  supplier_type TEXT DEFAULT 'vendor',
  country TEXT,
  currency_code TEXT DEFAULT 'USD',
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_number TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_iban TEXT,
  bank_swift TEXT,
  payment_terms INTEGER DEFAULT 30,  -- days
  credit_limit NUMERIC(20, 4) DEFAULT 0,
  current_balance NUMERIC(20, 4) DEFAULT 0,  -- positive = we owe them
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, supplier_code)
);

-- 2. Create supplier_invoices table
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  description TEXT,
  subtotal NUMERIC(20, 4) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(20, 4) DEFAULT 0,
  discount_amount NUMERIC(20, 4) DEFAULT 0,
  total_amount NUMERIC(20, 4) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(20, 4) DEFAULT 1,
  amount_paid NUMERIC(20, 4) DEFAULT 0,
  amount_due NUMERIC(20, 4) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  project_id UUID REFERENCES projects(id),
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, invoice_number)
);

-- 3. Create supplier_payments table
CREATE TABLE IF NOT EXISTS supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES supplier_invoices(id) ON DELETE SET NULL,
  payment_number TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(20, 4) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(20, 4) DEFAULT 1,
  amount_in_base NUMERIC(20, 4) GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  payment_method TEXT DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'credit_card', 'other')),
  treasury_transaction_id UUID REFERENCES treasury_transactions(id),
  journal_entry_id UUID REFERENCES journal_entries(id),
  reference_number TEXT,
  description TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, payment_number)
);

-- 4. Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS: suppliers
DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;
DROP POLICY IF EXISTS "suppliers_delete" ON suppliers;
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT TO authenticated
USING (company_id = get_user_current_company());
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'operations'))
);
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'operations'))
);
CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin'))
);

-- 6. RLS: supplier_invoices
DROP POLICY IF EXISTS "supplier_invoices_select" ON supplier_invoices;
DROP POLICY IF EXISTS "supplier_invoices_insert" ON supplier_invoices;
DROP POLICY IF EXISTS "supplier_invoices_update" ON supplier_invoices;
CREATE POLICY "supplier_invoices_select" ON supplier_invoices FOR SELECT TO authenticated
USING (company_id = get_user_current_company());
CREATE POLICY "supplier_invoices_insert" ON supplier_invoices FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'accountant', 'operations'))
);
CREATE POLICY "supplier_invoices_update" ON supplier_invoices FOR UPDATE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'accountant'))
);

-- 7. RLS: supplier_payments
DROP POLICY IF EXISTS "supplier_payments_select" ON supplier_payments;
DROP POLICY IF EXISTS "supplier_payments_insert" ON supplier_payments;
CREATE POLICY "supplier_payments_select" ON supplier_payments FOR SELECT TO authenticated
USING (company_id = get_user_current_company());
CREATE POLICY "supplier_payments_insert" ON supplier_payments FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'accountant', 'treasury'))
);

-- 8. Update timestamp triggers
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_suppliers_updated_at();

CREATE OR REPLACE FUNCTION update_supplier_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_supplier_invoices_updated_at ON supplier_invoices;
CREATE TRIGGER update_supplier_invoices_updated_at
  BEFORE UPDATE ON supplier_invoices FOR EACH ROW EXECUTE FUNCTION update_supplier_invoices_updated_at();

-- 9. Audit triggers
DROP TRIGGER IF EXISTS audit_suppliers_changes ON suppliers;
CREATE TRIGGER audit_suppliers_changes
  AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_supplier_invoices_changes ON supplier_invoices;
CREATE TRIGGER audit_supplier_invoices_changes
  AFTER INSERT OR UPDATE OR DELETE ON supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_supplier_payments_changes ON supplier_payments;
CREATE TRIGGER audit_supplier_payments_changes
  AFTER INSERT OR UPDATE OR DELETE ON supplier_payments
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- 10. Indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_country ON suppliers(country);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_due_date ON supplier_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_invoice ON supplier_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON supplier_payments(payment_date);

-- 11. RPC: Create supplier invoice
CREATE OR REPLACE FUNCTION create_supplier_invoice(
  p_supplier_id UUID,
  p_invoice_number TEXT,
  p_invoice_date DATE,
  p_due_date DATE,
  p_description TEXT DEFAULT NULL,
  p_subtotal NUMERIC,
  p_tax_amount NUMERIC DEFAULT 0,
  p_discount_amount NUMERIC DEFAULT 0,
  p_total_amount NUMERIC,
  p_currency_code TEXT DEFAULT 'USD',
  p_exchange_rate NUMERIC DEFAULT 1,
  p_project_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, invoice_id UUID, journal_entry_id UUID) AS $$
DECLARE
  v_supplier suppliers%ROWTYPE;
  v_company_id UUID;
  v_invoice_id UUID;
  v_je_id UUID;
  v_je_num TEXT;
BEGIN
  SELECT * INTO v_supplier FROM suppliers WHERE id = p_supplier_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'المورد غير موجود', NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  v_company_id := v_supplier.company_id;

  INSERT INTO supplier_invoices (
    company_id, supplier_id, invoice_number, invoice_date, due_date,
    description, subtotal, tax_amount, discount_amount, total_amount,
    currency_code, exchange_rate, project_id, reference_number, notes,
    status, created_by
  ) VALUES (
    v_company_id, p_supplier_id, p_invoice_number, p_invoice_date, p_due_date,
    p_description, p_subtotal, p_tax_amount, p_discount_amount, p_total_amount,
    p_currency_code, p_exchange_rate, p_project_id, p_reference_number, p_notes,
    CASE WHEN p_total_amount = 0 THEN 'paid' ELSE 'pending' END, auth.uid()
  ) RETURNING id INTO v_invoice_id;

  -- Update supplier balance (we owe them more)
  UPDATE suppliers SET
    current_balance = current_balance + p_total_amount,
    updated_at = NOW()
  WHERE id = p_supplier_id;

  -- Create journal entry for the purchase
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(COALESCE(MAX(SUBSTRING(entry_number FROM '-\d+$')::INT), 0) + 1, 6, '0')
  INTO v_je_num
  FROM journal_entries WHERE entry_number LIKE 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-%';

  INSERT INTO journal_entries (
    company_id, entry_number, entry_date, description, reference_number,
    source_type, source_id, project_id, status, posted_by, posted_at
  ) VALUES (
    v_company_id, v_je_num, p_invoice_date,
    'فاتورة مورد: ' || v_supplier.supplier_name || COALESCE(' - ' || p_description, ''),
    p_reference_number, 'auto_supplier_invoice', v_invoice_id, p_project_id,
    'posted', auth.uid(), NOW()
  ) RETURNING id INTO v_je_id;

  -- Debit: Purchases / Expenses (find expense account)
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
  SELECT v_je_id, a.id, p_subtotal, 0, p_currency_code, 'شراء من المورد: ' || v_supplier.supplier_name, v_company_id
  FROM accounts a WHERE a.company_id = v_company_id AND a.type = 'expense' LIMIT 1;

  -- Debit: Tax (if any)
  IF p_tax_amount > 0 THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
    SELECT v_je_id, a.id, p_tax_amount, 0, p_currency_code, 'ضريبة القيمة المضافة', v_company_id
    FROM accounts a WHERE a.company_id = v_company_id AND a.type = 'expense' LIMIT 1;
  END IF;

  -- Credit: Accounts Payable / Supplier
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
  SELECT v_je_id, a.id, 0, p_total_amount, p_currency_code,
         'واجب للمورد: ' || v_supplier.supplier_name, v_company_id
  FROM accounts a WHERE a.company_id = v_company_id AND a.type IN ('expense', 'temporary')
    AND a.name ILIKE '%مورد%' LIMIT 1;

  RETURN QUERY SELECT true, 'تم إنشاء فاتورة المورد بنجاح', v_invoice_id, v_je_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC: Pay supplier invoice
CREATE OR REPLACE FUNCTION pay_supplier_invoice(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_payment_method TEXT DEFAULT 'bank_transfer',
  p_treasury_transaction_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, payment_id UUID, journal_entry_id UUID) AS $$
DECLARE
  v_invoice supplier_invoices%ROWTYPE;
  v_supplier suppliers%ROWTYPE;
  v_company_id UUID;
  v_payment_id UUID;
  v_payment_num TEXT;
  v_je_id UUID;
  v_je_num TEXT;
  v_new_amount_paid NUMERIC;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_invoice FROM supplier_invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'الفاتورة غير موجودة', NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  SELECT * INTO v_supplier FROM suppliers WHERE id = v_invoice.supplier_id;
  v_company_id := v_invoice.company_id;

  IF p_amount > v_invoice.amount_due THEN
    RETURN QUERY SELECT false, 'المبلغ المدفوع أكبر من المبلغ المستحق', NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  v_new_amount_paid := v_invoice.amount_paid + p_amount;
  v_new_status := CASE
    WHEN v_new_amount_paid >= v_invoice.total_amount THEN 'paid'
    WHEN v_new_amount_paid > 0 THEN 'partial'
    ELSE v_invoice.status
  END;

  -- Generate payment number
  SELECT 'PAY-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(COALESCE(MAX(SUBSTRING(payment_number FROM '-\d+$')::INT), 0) + 1, 6, '0')
  INTO v_payment_num
  FROM supplier_payments WHERE payment_number LIKE 'PAY-' || TO_CHAR(NOW(), 'YYYY') || '-%';

  INSERT INTO supplier_payments (
    company_id, supplier_id, invoice_id, payment_number, payment_date,
    amount, currency_code, exchange_rate, payment_method,
    treasury_transaction_id, reference_number, description, recorded_by
  ) VALUES (
    v_company_id, v_invoice.supplier_id, p_invoice_id, v_payment_num, p_payment_date,
    p_amount, v_invoice.currency_code, v_invoice.exchange_rate, p_payment_method,
    p_treasury_transaction_id, p_reference_number, p_description, auth.uid()
  ) RETURNING id INTO v_payment_id;

  -- Update invoice
  UPDATE supplier_invoices SET
    amount_paid = v_new_amount_paid,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_invoice_id;

  -- Update supplier balance (we owe less now)
  UPDATE suppliers SET
    current_balance = current_balance - p_amount,
    updated_at = NOW()
  WHERE id = v_invoice.supplier_id;

  -- Create journal entry
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(COALESCE(MAX(SUBSTRING(entry_number FROM '-\d+$')::INT), 0) + 1, 6, '0')
  INTO v_je_num
  FROM journal_entries WHERE entry_number LIKE 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-%';

  INSERT INTO journal_entries (
    company_id, entry_number, entry_date, description, reference_number,
    source_type, source_id, status, posted_by, posted_at
  ) VALUES (
    v_company_id, v_je_num, p_payment_date,
    'سداد فاتورة مورد: ' || v_supplier.supplier_name || ' #' || v_invoice.invoice_number,
    p_reference_number, 'auto_supplier_payment', v_payment_id,
    'posted', auth.uid(), NOW()
  ) RETURNING id INTO v_je_id;

  -- Debit: Accounts Payable
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
  SELECT v_je_id, a.id, p_amount, 0, v_invoice.currency_code,
         'سداد للمورد: ' || v_supplier.supplier_name, v_company_id
  FROM accounts a WHERE a.company_id = v_company_id AND a.type IN ('expense', 'temporary')
    AND a.name ILIKE '%مورد%' LIMIT 1;

  -- Credit: Bank/Cash (treasury)
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
  SELECT v_je_id, a.id, 0, p_amount, v_invoice.currency_code,
         'صرف للمورد: ' || v_supplier.supplier_name, v_company_id
  FROM accounts a WHERE a.company_id = v_company_id AND a.is_treasury_account = true
    AND a.currency_code = v_invoice.currency_code LIMIT 1;

  RETURN QUERY SELECT true, 'تم تسجيل السداد بنجاح', v_payment_id, v_je_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. RPC: Get suppliers summary
CREATE OR REPLACE FUNCTION get_suppliers_summary()
RETURNS TABLE(
  id UUID,
  supplier_code TEXT,
  supplier_name TEXT,
  supplier_name_ar TEXT,
  country TEXT,
  currency_code TEXT,
  current_balance NUMERIC,
  payment_terms INTEGER,
  is_active BOOLEAN,
  total_invoiced NUMERIC,
  total_paid NUMERIC,
  total_due NUMERIC,
  invoices_count BIGINT,
  overdue_amount NUMERIC
) AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := get_user_current_company();

  RETURN QUERY
  SELECT
    s.id,
    s.supplier_code,
    s.supplier_name,
    s.supplier_name_ar,
    s.country,
    s.currency_code,
    s.current_balance,
    s.payment_terms,
    s.is_active,
    COALESCE(SUM(si.total_amount), 0) as total_invoiced,
    COALESCE(SUM(si.amount_paid), 0) as total_paid,
    COALESCE(SUM(si.amount_due), 0) as total_due,
    COUNT(si.id) as invoices_count,
    COALESCE(SUM(CASE WHEN si.due_date < CURRENT_DATE AND si.status NOT IN ('paid', 'cancelled')
      THEN si.amount_due ELSE 0 END), 0) as overdue_amount
  FROM suppliers s
  LEFT JOIN supplier_invoices si ON si.supplier_id = s.id
  WHERE s.company_id = v_company_id AND s.is_active = true
  GROUP BY s.id, s.supplier_code, s.supplier_name, s.supplier_name_ar, s.country,
           s.currency_code, s.current_balance, s.payment_terms, s.is_active
  ORDER BY s.supplier_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. RPC: Get supplier statement (invoices + payments)
CREATE OR REPLACE FUNCTION get_supplier_statement(
  p_supplier_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE(
  entry_type TEXT,
  entry_date DATE,
  reference_number TEXT,
  description TEXT,
  invoice_number TEXT,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  total_amount NUMERIC,
  amount_paid NUMERIC,
  amount_due NUMERIC,
  payment_amount NUMERIC,
  payment_method TEXT,
  balance NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  -- Invoices
  SELECT
    'invoice'::TEXT as entry_type,
    si.invoice_date as entry_date,
    si.reference_number as reference_number,
    si.description as description,
    si.invoice_number as invoice_number,
    si.subtotal as subtotal,
    si.tax_amount as tax_amount,
    si.total_amount as total_amount,
    NULL::NUMERIC as amount_paid,
    si.amount_due as amount_due,
    NULL::NUMERIC as payment_amount,
    NULL::TEXT as payment_method,
    si.amount_due as balance,
    si.created_at
  FROM supplier_invoices si
  WHERE si.supplier_id = p_supplier_id
    AND (p_date_from IS NULL OR si.invoice_date >= p_date_from)
    AND (p_date_to IS NULL OR si.invoice_date <= p_date_to)

  UNION ALL

  -- Payments
  SELECT
    'payment'::TEXT as entry_type,
    sp.payment_date as entry_date,
    sp.reference_number as reference_number,
    sp.description as description,
    NULL::TEXT as invoice_number,
    NULL::NUMERIC as subtotal,
    NULL::NUMERIC as tax_amount,
    NULL::NUMERIC as total_amount,
    NULL::NUMERIC as amount_paid,
    NULL::NUMERIC as amount_due,
    sp.amount as payment_amount,
    sp.payment_method as payment_method,
    NULL::NUMERIC as balance,
    sp.created_at
  FROM supplier_payments sp
  WHERE sp.supplier_id = p_supplier_id
    AND (p_date_from IS NULL OR sp.payment_date >= p_date_from)
    AND (p_date_to IS NULL OR sp.payment_date <= p_date_to)

  ORDER BY entry_date DESC, created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. RPC: Get payables aging
CREATE OR REPLACE FUNCTION get_payables_aging()
RETURNS TABLE(
  supplier_id UUID,
  supplier_name TEXT,
  currency_code TEXT,
  current_due NUMERIC,
  days_1_30 NUMERIC,
  days_31_60 NUMERIC,
  days_61_90 NUMERIC,
  days_over_90 NUMERIC,
  overdue_amount NUMERIC
) AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := get_user_current_company();

  RETURN QUERY
  SELECT
    s.id as supplier_id,
    s.supplier_name,
    s.currency_code,
    COALESCE(SUM(si.amount_due), 0) as current_due,
    COALESCE(SUM(CASE
      WHEN si.due_date >= CURRENT_DATE - INTERVAL '30 days' AND si.due_date <= CURRENT_DATE
      AND si.status NOT IN ('paid', 'cancelled')
      THEN si.amount_due ELSE 0 END), 0) as days_1_30,
    COALESCE(SUM(CASE
      WHEN si.due_date >= CURRENT_DATE - INTERVAL '60 days' AND si.due_date < CURRENT_DATE - INTERVAL '30 days'
      AND si.status NOT IN ('paid', 'cancelled')
      THEN si.amount_due ELSE 0 END), 0) as days_31_60,
    COALESCE(SUM(CASE
      WHEN si.due_date >= CURRENT_DATE - INTERVAL '90 days' AND si.due_date < CURRENT_DATE - INTERVAL '60 days'
      AND si.status NOT IN ('paid', 'cancelled')
      THEN si.amount_due ELSE 0 END), 0) as days_61_90,
    COALESCE(SUM(CASE
      WHEN si.due_date < CURRENT_DATE - INTERVAL '90 days'
      AND si.status NOT IN ('paid', 'cancelled')
      THEN si.amount_due ELSE 0 END), 0) as days_over_90,
    COALESCE(SUM(CASE
      WHEN si.due_date < CURRENT_DATE AND si.status NOT IN ('paid', 'cancelled')
      THEN si.amount_due ELSE 0 END), 0) as overdue_amount
  FROM suppliers s
  LEFT JOIN supplier_invoices si ON si.supplier_id = s.id
  WHERE s.company_id = v_company_id AND s.is_active = true
  GROUP BY s.id, s.supplier_name, s.currency_code
  HAVING COALESCE(SUM(si.amount_due), 0) > 0
  ORDER BY overdue_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
