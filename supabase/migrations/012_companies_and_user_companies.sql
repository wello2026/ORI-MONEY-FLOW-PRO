-- Phase 1.1: Companies + Multi-Company Foundation
-- Adds companies and user_companies join table for multi-company support

-- 1. Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_name_ar TEXT,
  commercial_registration TEXT,
  tax_number TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  country TEXT DEFAULT 'LY',
  default_currency TEXT DEFAULT 'LYD',
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User-Company join table (defines which companies a user belongs to and their role in each)
CREATE TABLE IF NOT EXISTS user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('owner', 'admin', 'accountant', 'treasury', 'operations', 'viewer')),
  is_current BOOLEAN DEFAULT false,  -- which company is currently active for this user
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- 3. Profiles: add company reference + enhance
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_company_id UUID REFERENCES companies(id);

-- 4. Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. RLS: companies — only users who belong to the company
DROP POLICY IF EXISTS "Users can view their companies" ON companies;
CREATE POLICY "Users can view their companies" ON companies FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = companies.id
    AND uc.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Only admins can manage companies" ON companies;
CREATE POLICY "Only admins can manage companies" ON companies FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = companies.id
    AND uc.user_id = auth.uid()
    AND uc.role IN ('owner', 'admin')
  )
);

-- 6. RLS: user_companies — users can only see their own associations
DROP POLICY IF EXISTS "Users can view their own company memberships" ON user_companies;
CREATE POLICY "Users can view their own company memberships" ON user_companies FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Only admins can manage company memberships" ON user_companies FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc_requester
    JOIN user_companies uc_target ON uc_target.company_id = uc_requester.company_id
    WHERE uc_requester.user_id = auth.uid()
    AND uc_target.user_id = user_companies.user_id
    AND uc_requester.role IN ('owner', 'admin')
    AND uc_requester.company_id = user_companies.company_id
  )
);

-- 7. RLS: profiles — users can read profiles in their companies, admins can edit
DROP POLICY IF EXISTS "Users can view profiles in their companies" ON profiles;
CREATE POLICY "Users can view profiles in their companies" ON profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc
    JOIN user_companies uc_viewer ON uc_viewer.company_id = uc.company_id
    WHERE uc.user_id = profiles.id
    AND uc_viewer.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.role IN ('owner', 'admin')
  )
);

-- 8. Update timestamp trigger for companies
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_companies_updated_at();

-- 9. Audit triggers for new tables
DROP TRIGGER IF EXISTS audit_companies_changes ON companies;
CREATE TRIGGER audit_companies_changes
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_user_companies_changes ON user_companies;
CREATE TRIGGER audit_user_companies_changes
  AFTER INSERT OR UPDATE OR DELETE ON user_companies
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- 10. Create helper function to get user's current company
CREATE OR REPLACE FUNCTION get_user_current_company()
RETURNS UUID AS $$
  SELECT company_id
  FROM user_companies
  WHERE user_id = auth.uid()
  AND is_current = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 11. Create helper function to check if user has access to a company
CREATE OR REPLACE FUNCTION user_has_company_access(p_company_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = auth.uid()
    AND company_id = p_company_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 12. Create helper function to get user's role in a company
CREATE OR REPLACE FUNCTION get_user_company_role(p_company_id UUID)
RETURNS TEXT AS $$
  SELECT role
  FROM user_companies
  WHERE user_id = auth.uid()
  AND company_id = p_company_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 13. Create helper function to check if user is admin/owner in current company
CREATE OR REPLACE FUNCTION is_company_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = auth.uid()
    AND is_current = true
    AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 14. Insert seed company (demo — remove in production)
INSERT INTO companies (company_name, company_name_ar, country, default_currency, is_active)
VALUES ('ORI Financial Group', 'مجموعة ORI المالية', 'LY', 'LYD', true)
ON CONFLICT DO NOTHING;

-- 15. Update existing profiles to link to default company (run after inserting seed company)
DO $$
DECLARE
  v_company_id UUID;
  v_user_count INTEGER;
BEGIN
  SELECT id INTO v_company_id FROM companies LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    -- Link existing profiles to the default company as owner/admin
    INSERT INTO user_companies (user_id, company_id, role, is_current)
    SELECT p.id, v_company_id,
      CASE WHEN p.role = 'super_admin' THEN 'owner' ELSE p.role END,
      true
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM user_companies WHERE user_id = p.id
    );

    -- Count users linked
    SELECT COUNT(*) INTO v_user_count FROM user_companies WHERE company_id = v_company_id;

    -- Update default_company_id on profiles
    UPDATE profiles
    SET default_company_id = v_company_id
    WHERE default_company_id IS NULL;
  END IF;
END $$;