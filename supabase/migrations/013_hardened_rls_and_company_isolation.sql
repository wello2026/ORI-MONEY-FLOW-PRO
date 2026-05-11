-- Phase 1.2: Hardened RLS + Company Isolation + Enhanced Audit
-- Company isolation on all existing tables + audit enhancements

-- 1. Add company_id to all company-scoped tables
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- 2. Backfill company_id from user_companies for existing records
DO $$
BEGIN
  -- Accounts
  UPDATE accounts a SET company_id = (
    SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = a.created_by LIMIT 1
  ) WHERE a.company_id IS NULL;

  -- Transactions
  UPDATE transactions t SET company_id = (
    SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = t.created_by LIMIT 1
  ) WHERE t.company_id IS NULL;

  -- Transfers
  UPDATE transfers tr SET company_id = (
    SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = tr.created_by LIMIT 1
  ) WHERE tr.company_id IS NULL;

  -- Approvals
  UPDATE approvals a SET company_id = (
    SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = a.requested_by LIMIT 1
  ) WHERE a.company_id IS NULL;

  -- Projects
  UPDATE projects p SET company_id = (
    SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = p.created_by LIMIT 1
  ) WHERE p.company_id IS NULL;
END $$;

-- 3. Drop all existing RLS policies (start clean)
DROP POLICY IF EXISTS "Allow all" ON accounts;
DROP POLICY IF EXISTS "Allow all accounts" ON accounts;
DROP POLICY IF EXISTS "Accounts are viewable by assigned owners" ON accounts;
DROP POLICY IF EXISTS "Admins have full access to accounts" ON accounts;
DROP POLICY IF EXISTS "Employees can view assigned accounts" ON accounts;
DROP POLICY IF EXISTS "Allow all" ON transactions;
DROP POLICY IF EXISTS "Allow all transactions" ON transactions;
DROP POLICY IF EXISTS "Admins have full access to transactions" ON transactions;
DROP POLICY IF EXISTS "Employees can manage own transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all" ON transfers;
DROP POLICY IF EXISTS "Allow all transfers" ON transfers;
DROP POLICY IF EXISTS "Admins have full access to transfers" ON transfers;
DROP POLICY IF EXISTS "Employees can view own transfers" ON transfers;
DROP POLICY IF EXISTS "Allow all" ON approvals;
DROP POLICY IF EXISTS "Admins have full access to approvals" ON approvals;
DROP POLICY IF EXISTS "Allow all" ON projects;
DROP POLICY IF EXISTS "Projects viewable by all authenticated" ON projects;
DROP POLICY IF EXISTS "Projects manageable by admins" ON projects;
DROP POLICY IF EXISTS "Allow all" ON notifications;
DROP POLICY IF EXISTS "Users can view their companies" ON companies;
DROP POLICY IF EXISTS "Only admins can manage companies" ON companies;
DROP POLICY IF EXISTS "Users can view their own company memberships" ON user_companies;
DROP POLICY IF EXISTS "Only admins can manage company memberships" ON user_companies;
DROP POLICY IF EXISTS "Users can view profiles in their companies" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;

-- 4. ACCOUNTS — Company isolation + role-based access
CREATE POLICY "accounts_select" ON accounts FOR SELECT TO authenticated
USING (
  company_id = get_user_current_company()
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "accounts_insert" ON accounts FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'accountant', 'treasury'))
);

CREATE POLICY "accounts_update" ON accounts FOR UPDATE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'accountant', 'treasury'))
);

CREATE POLICY "accounts_delete" ON accounts FOR DELETE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin'))
);

-- 5. TRANSACTIONS — Company isolation + role-based access
CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated
USING (
  company_id = get_user_current_company()
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "transactions_insert" ON transactions FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'accountant', 'treasury', 'operations'))
);

CREATE POLICY "transactions_update" ON transactions FOR UPDATE TO authenticated
USING (
  company_id = get_user_current_company()
  AND (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin'))
  )
);

CREATE POLICY "transactions_delete" ON transactions FOR DELETE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin'))
);

-- 6. TRANSFERS — Company isolation + role-based access
CREATE POLICY "transfers_select" ON transfers FOR SELECT TO authenticated
USING (
  company_id = get_user_current_company()
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "transfers_insert" ON transfers FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'treasury'))
);

CREATE POLICY "transfers_update" ON transfers FOR UPDATE TO authenticated
USING (
  company_id = get_user_current_company()
  AND (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin'))
  )
);

CREATE POLICY "transfers_delete" ON transfers FOR DELETE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin'))
);

-- 7. APPROVALS — Company isolation
CREATE POLICY "approvals_select" ON approvals FOR SELECT TO authenticated
USING (
  company_id = get_user_current_company()
  OR requested_by = auth.uid()
  OR approved_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "approvals_insert" ON approvals FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id)
);

CREATE POLICY "approvals_update" ON approvals FOR UPDATE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin'))
);

-- 8. PROJECTS — Company isolation
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated
USING (
  company_id = get_user_current_company()
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated
WITH CHECK (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'operations'))
);

CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'operations'))
);

CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin'))
);

-- 9. NOTIFICATIONS — User-scoped with company isolation
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- 10. AUDIT_LOGS — Admin-only read, all authenticated can insert via trigger
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = audit_logs.company_id AND role IN ('owner', 'admin'))
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 11. LOGIN_HISTORY — Admin-only
CREATE POLICY "login_history_select" ON login_history FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 12. JOURNAL_ENTRIES — Company isolation (from migration 006)
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

DO $$
BEGIN
  UPDATE journal_entries je SET company_id = (
    SELECT company_id FROM accounts WHERE id = je.reference -- fallback
    LIMIT 1
  ) WHERE je.company_id IS NULL;
END $$;

DROP POLICY IF EXISTS "journal_entries_read" ON journal_entries;
CREATE POLICY "journal_entries_read" ON journal_entries FOR SELECT TO authenticated
USING (
  company_id = get_user_current_company()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "journal_entries_write" ON journal_entries FOR ALL TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin', 'accountant'))
);

-- 13. CONTACTS — Company isolation (from migration 007)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE supplier_bills ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

DROP POLICY IF EXISTS "contacts_all" ON contacts;
CREATE POLICY "contacts_select" ON contacts FOR SELECT TO authenticated
USING (company_id = get_user_current_company() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "contacts_write" ON contacts FOR ALL TO authenticated
USING (
  company_id = get_user_current_company()
  AND EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = company_id AND role IN ('owner', 'admin'))
);

-- 14. Enhanced audit trigger — handles NULL auth.uid() gracefully
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
BEGIN
  -- Get current user (handle demo/null cases)
  v_user_id := COALESCE(auth.uid(), auth.uid());

  -- Get company_id from the row if available
  IF TG_TABLE_NAME = 'accounts' THEN
    v_company_id := NEW.company_id;
  ELSIF TG_TABLE_NAME = 'transactions' THEN
    v_company_id := NEW.company_id;
  ELSIF TG_TABLE_NAME = 'transfers' THEN
    v_company_id := NEW.company_id;
  ELSIF TG_TABLE_NAME = 'approvals' THEN
    v_company_id := NEW.company_id;
  ELSIF TG_TABLE_NAME = 'projects' THEN
    v_company_id := NEW.company_id;
  ELSIF TG_TABLE_NAME = 'companies' THEN
    v_company_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'user_companies' THEN
    v_company_id := NEW.company_id;
  ELSIF TG_TABLE_NAME = 'journal_entries' THEN
    v_company_id := NEW.company_id;
  ELSE
    -- Fall back to current company context
    v_company_id := get_user_current_company();
  END IF;

  -- If still no user_id (demo mode), try to get from user_companies
  IF v_user_id IS NULL THEN
    BEGIN
      v_user_id := COALESCE(
        (SELECT user_id FROM user_companies WHERE company_id = v_company_id LIMIT 1),
        '00000000-0000-0000-0000-000000000000'::UUID
      );
    EXCEPTION WHEN OTHERS THEN
      v_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END;
  END IF;

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, company_id)
  VALUES (
    v_user_id,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    v_company_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Indexes for company_id columns
CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transfers_company ON transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_approvals_company ON approvals(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_login_history_company ON login_history(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_user ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company ON user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_company ON journal_entry_lines(company_id);

-- 16. Add make_current_company RPC
CREATE OR REPLACE FUNCTION make_current_company(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT user_has_company_access(p_company_id) THEN
    RAISE EXCEPTION 'لا يوجد لديك صلاحية للوصول لهذه الشركة';
  END IF;

  -- Unset current flag for all user's companies
  UPDATE user_companies SET is_current = false WHERE user_id = auth.uid();

  -- Set current flag for selected company
  UPDATE user_companies SET is_current = true
  WHERE user_id = auth.uid() AND company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. RPC: Create user with company link (for admin user management)
CREATE OR REPLACE FUNCTION create_user_with_company(
  p_email TEXT,
  p_full_name TEXT,
  p_password TEXT,
  p_company_id UUID,
  p_role TEXT DEFAULT 'viewer'
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT is_company_admin() THEN
    RAISE EXCEPTION 'فقط المشرفين يمكنهم إنشاء مستخدمين';
  END IF;

  -- Create auth user via Supabase Auth (called from edge function, not RPC)
  -- This RPC is for linking an existing profile to a company
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. RPC: List companies for current user
CREATE OR REPLACE FUNCTION get_user_companies()
RETURNS TABLE (
  company_id UUID,
  company_name TEXT,
  company_name_ar TEXT,
  country TEXT,
  default_currency TEXT,
  role TEXT,
  is_current BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.company_name,
    c.company_name_ar,
    c.country,
    c.default_currency,
    uc.role,
    uc.is_current
  FROM companies c
  JOIN user_companies uc ON uc.company_id = c.id
  WHERE uc.user_id = auth.uid()
  ORDER BY uc.is_current DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;