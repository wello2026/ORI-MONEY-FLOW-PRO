-- Phase 8: Expense Management
-- Company-wide expense tracking with categories, approval workflow, recurring expenses

-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Core fields
  expense_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(20, 4) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(20, 4) DEFAULT 1,
  amount_in_base NUMERIC(20, 4) GENERATED ALWAYS AS (amount * exchange_rate) STORED,

  -- Classification
  category TEXT NOT NULL
    CHECK (category IN (
      'rent', 'utilities', 'salaries', 'supplies', 'equipment',
      'maintenance', 'insurance', 'marketing', 'travel', 'training',
      'consulting', 'legal', 'licenses', 'software', 'fuel', 'communication', 'other'
    )),

  -- Relations (optional)
  project_id UUID REFERENCES projects(id),
  supplier_id UUID REFERENCES suppliers(id),
  partner_id UUID REFERENCES financial_partners(id),
  employee_id UUID REFERENCES profiles(id),

  -- Payment
  payment_method TEXT DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'bank', 'cheque', 'transfer', 'card')),
  treasury_account_id UUID REFERENCES accounts(id),

  -- Metadata
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  reference_number TEXT,
  vendor_name TEXT,
  notes TEXT,

  -- Workflow
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'paid', 'cancelled')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB,

  -- Audit
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;

CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated
USING (company_id = get_user_current_company());

CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'accountant', 'operations', 'employee'))
);

CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'accountant'))
);

CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin'))
);

-- 4. Audit trigger
DROP TRIGGER IF EXISTS audit_expenses_changes ON expenses;
CREATE TRIGGER audit_expenses_changes
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(is_recurring) WHERE is_recurring = true;

-- 6. Auto-generate expense_number
CREATE OR REPLACE FUNCTION generate_expense_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expense_number IS NULL OR NEW.expense_number = '' THEN
    NEW.expense_number := 'EXP-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
      LPAD(
        COALESCE(
          (SELECT COUNT(*)::INT + 1 FROM expenses
           WHERE expense_number LIKE 'EXP-' || TO_CHAR(NOW(), 'YYYY') || '-%'),
          1
        )::TEXT,
        4, '0'
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expense_number ON expenses;
CREATE TRIGGER trg_expense_number BEFORE INSERT ON expenses
FOR EACH ROW EXECUTE FUNCTION generate_expense_number();

-- 7. RPC: Create expense with optional approval
CREATE OR REPLACE FUNCTION create_expense(
  p_title TEXT,
  p_category TEXT,
  p_amount NUMERIC,
  p_expense_date DATE DEFAULT CURRENT_DATE,
  p_description TEXT DEFAULT NULL,
  p_currency_code TEXT DEFAULT 'USD',
  p_exchange_rate NUMERIC DEFAULT 1,
  p_project_id UUID DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_partner_id UUID DEFAULT NULL,
  p_employee_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cash',
  p_treasury_account_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_vendor_name TEXT DEFAULT NULL,
  p_receipt_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_requires_approval BOOLEAN DEFAULT true
)
RETURNS TABLE(success BOOLEAN, message TEXT, expense_id UUID, journal_entry_id UUID) AS $$
DECLARE
  v_company_id UUID;
  v_status TEXT;
  v_expense_id UUID;
  v_je_id UUID;
  v_je_num TEXT;
BEGIN
  v_company_id := get_user_current_company();
  IF v_company_id IS NULL THEN
    RETURN QUERY SELECT false, 'لا توجد شركة محددة', NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Determine status: approved directly if no approval needed, else pending
  v_status := CASE WHEN p_requires_approval THEN 'pending' ELSE 'approved' END;

  INSERT INTO expenses (
    company_id, title, description, amount, currency_code, exchange_rate,
    category, expense_date, project_id, supplier_id, partner_id, employee_id,
    payment_method, treasury_account_id, reference_number, vendor_name,
    receipt_url, notes, status, recorded_by
  ) VALUES (
    v_company_id, p_title, p_description, p_amount, p_currency_code, p_exchange_rate,
    p_category, p_expense_date, p_project_id, p_supplier_id, p_partner_id,
    p_employee_id, p_payment_method, p_treasury_account_id, p_reference_number,
    p_vendor_name, p_receipt_url, p_notes, v_status, auth.uid()
  ) RETURNING id INTO v_expense_id;

  -- Auto-approve and create journal entry if no approval needed
  IF v_status = 'approved' THEN
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
      'مصروف: ' || p_title || COALESCE(' - ' || p_description, ''),
      p_reference_number, 'auto_expense', v_expense_id, p_project_id,
      'posted', auth.uid(), NOW()
    ) RETURNING id INTO v_je_id;

    -- Debit: Expense account
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
    SELECT v_je_id, a.id, p_amount * p_exchange_rate, 0, p_currency_code,
           'مصروف: ' || p_category, v_company_id
    FROM accounts a
    WHERE a.company_id = v_company_id AND a.type = 'expense'
      AND a.name ILIKE '%' || p_category || '%' OR a.name ILIKE '%مصروف%'
    LIMIT 1;

    -- Credit: Cash/Bank/Treasury
    IF p_treasury_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
      SELECT v_je_id, p_treasury_account_id, 0, p_amount * p_exchange_rate, p_currency_code,
             'صرف مصروف: ' || p_title, v_company_id;
    ELSE
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
      SELECT v_je_id, a.id, 0, p_amount * p_exchange_rate, p_currency_code,
             'صرف مصروف: ' || p_title, v_company_id
      FROM accounts a
      WHERE a.company_id = v_company_id AND a.is_treasury_account = true
        AND a.currency_code = p_currency_code
      LIMIT 1;
    END IF;

    RETURN QUERY SELECT true, 'تم تسجيل المصروف بنجاح', v_expense_id, v_je_id;
  ELSE
    RETURN QUERY SELECT true, 'تم إنشاء المصروف بانتظار الاعتماد', v_expense_id, NULL::UUID;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: Approve expense
CREATE OR REPLACE FUNCTION approve_expense(
  p_expense_id UUID,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, journal_entry_id UUID) AS $$
DECLARE
  v_expense expenses%ROWTYPE;
  v_je_id UUID;
  v_je_num TEXT;
BEGIN
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'المصروف غير موجود', NULL::UUID;
    RETURN;
  END IF;

  IF v_expense.status != 'pending' THEN
    RETURN QUERY SELECT false, 'لا يمكن اعتماد هذا المصروف', NULL::UUID;
    RETURN;
  END IF;

  IF p_rejection_reason IS NOT NULL THEN
    -- Reject
    UPDATE expenses SET status = 'rejected', rejection_reason = p_rejection_reason,
      approved_by = auth.uid(), approved_at = NOW(), updated_at = NOW()
    WHERE id = p_expense_id;
    RETURN QUERY SELECT true, 'تم رفض المصروف', NULL::UUID;
    RETURN;
  END IF;

  -- Approve and create journal entry
  UPDATE expenses SET status = 'approved', approved_by = auth.uid(), approved_at = NOW(), updated_at = NOW()
  WHERE id = p_expense_id;

  -- Create journal entry
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(COALESCE(MAX(SUBSTRING(entry_number FROM '-\d+$')::INT), 0) + 1, 6, '0')
  INTO v_je_num
  FROM journal_entries WHERE entry_number LIKE 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-%';

  INSERT INTO journal_entries (
    company_id, entry_number, entry_date, description, reference_number,
    source_type, source_id, project_id, status, posted_by, posted_at
  ) VALUES (
    v_expense.company_id, v_je_num, v_expense.expense_date,
    'مصروف معتمد: ' || v_expense.title,
    v_expense.reference_number, 'auto_expense', v_expense.id, v_expense.project_id,
    'posted', auth.uid(), NOW()
  ) RETURNING id INTO v_je_id;

  -- Debit: Expense account
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
  SELECT v_je_id, a.id, v_expense.amount_in_base, 0, v_expense.currency_code,
         'مصروف: ' || v_expense.category, v_expense.company_id
  FROM accounts a
  WHERE a.company_id = v_expense.company_id AND a.type = 'expense'
  LIMIT 1;

  -- Credit: Cash/Bank
  IF v_expense.treasury_account_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
    SELECT v_je_id, v_expense.treasury_account_id, 0, v_expense.amount_in_base, v_expense.currency_code,
           'صرف مصروف', v_expense.company_id;
  ELSE
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, currency_code, description, company_id)
    SELECT v_je_id, a.id, 0, v_expense.amount_in_base, v_expense.currency_code,
           'صرف مصروف', v_expense.company_id
    FROM accounts a
    WHERE a.company_id = v_expense.company_id AND a.is_treasury_account = true
      AND a.currency_code = v_expense.currency_code
    LIMIT 1;
  END IF;

  RETURN QUERY SELECT true, 'تم اعتماد المصروف', v_je_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: Mark expense as paid
CREATE OR REPLACE FUNCTION mark_expense_paid(
  p_expense_id UUID,
  p_treasury_account_id UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
BEGIN
  UPDATE expenses SET status = 'paid', updated_at = NOW()
  WHERE id = p_expense_id AND status = 'approved';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'لا يمكن تسجيل الدفع', NULL::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'تم تسجيل الدفع';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: Get expenses summary
CREATE OR REPLACE FUNCTION get_expenses_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_amount NUMERIC,
  approved_amount NUMERIC,
  pending_amount NUMERIC,
  rejected_amount NUMERIC,
  total_count BIGINT,
  category_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY WITH cats AS (
    SELECT
      e.category,
      SUM(e.amount_in_base) as cat_total,
      COUNT(*) as cat_count
    FROM expenses e
    WHERE e.company_id = get_user_current_company()
      AND (p_start_date IS NULL OR e.expense_date >= p_start_date)
      AND (p_end_date IS NULL OR e.expense_date <= p_end_date)
      AND (p_category IS NULL OR e.category = p_category)
      AND (p_status IS NULL OR e.status = p_status)
    GROUP BY e.category
  )
  SELECT
    COALESCE(SUM(e.amount_in_base), 0),
    COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount_in_base ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.status = 'pending' THEN e.amount_in_base ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.status = 'rejected' THEN e.amount_in_base ELSE 0 END), 0),
    COUNT(*)::BIGINT,
    jsonb_agg(jsonb_build_object('category', cats.category, 'total', cats.cat_total, 'count', cats.cat_count))
  FROM expenses e LEFT JOIN cats ON true
  WHERE e.company_id = get_user_current_company()
    AND (p_start_date IS NULL OR e.expense_date >= p_start_date)
    AND (p_end_date IS NULL OR e.expense_date <= p_end_date)
    AND (p_category IS NULL OR e.category = p_category)
    AND (p_status IS NULL OR e.status = p_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC: Get paginated expenses
CREATE OR REPLACE FUNCTION get_expenses_list(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_category TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  expense_number TEXT,
  title TEXT,
  description TEXT,
  amount NUMERIC,
  currency_code TEXT,
  amount_in_base NUMERIC,
  category TEXT,
  expense_date DATE,
  status TEXT,
  project_name TEXT,
  vendor_name TEXT,
  reference_number TEXT,
  is_recurring BOOLEAN,
  recorded_by_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id, e.expense_number, e.title,
    COALESCE(e.description, '')::TEXT,
    e.amount, e.currency_code, e.amount_in_base,
    e.category, e.expense_date, e.status,
    COALESCE(p.name, '')::TEXT as project_name,
    COALESCE(e.vendor_name, '')::TEXT as vendor_name,
    COALESCE(e.reference_number, '')::TEXT,
    e.is_recurring,
    COALESCE(rec.name || ' ' || COALESCE(rec.surname, ''), '—')::TEXT as recorded_by_name,
    e.created_at
  FROM expenses e
  LEFT JOIN projects p ON p.id = e.project_id
  LEFT JOIN profiles rec ON rec.id = e.recorded_by
  WHERE e.company_id = get_user_current_company()
    AND (p_category IS NULL OR e.category = p_category)
    AND (p_status IS NULL OR e.status = p_status)
    AND (p_start_date IS NULL OR e.expense_date >= p_start_date)
    AND (p_end_date IS NULL OR e.expense_date <= p_end_date)
    AND (
      p_search IS NULL OR
      e.title ILIKE '%' || p_search || '%' OR
      e.expense_number ILIKE '%' || p_search || '%' OR
      e.reference_number ILIKE '%' || p_search || '%' OR
      e.vendor_name ILIKE '%' || p_search || '%'
    )
  ORDER BY e.expense_date DESC, e.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Recurring expense function
CREATE OR REPLACE FUNCTION generate_recurring_expenses()
RETURNS void AS $$
DECLARE
  v_recurring RECORD;
BEGIN
  FOR v_recurring IN
    SELECT * FROM expenses
    WHERE is_recurring = true
      AND status IN ('approved', 'paid')
      AND recurring_pattern IS NOT NULL
  LOOP
    -- Check if next occurrence is due
    IF jsonb_extract_path_text(v_recurring.recurring_pattern, 'next_date')::DATE <= CURRENT_DATE THEN
      PERFORM create_expense(
        v_recurring.title || ' (متكرر)',
        v_recurring.category,
        v_recurring.amount,
        jsonb_extract_path_text(v_recurring.recurring_pattern, 'next_date')::DATE,
        v_recurring.description,
        v_recurring.currency_code,
        v_recurring.exchange_rate,
        v_recurring.project_id,
        v_recurring.supplier_id,
        NULL,
        NULL,
        v_recurring.payment_method,
        v_recurring.treasury_account_id,
        v_recurring.reference_number,
        v_recurring.vendor_name,
        NULL,
        v_recurring.notes,
        false
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;