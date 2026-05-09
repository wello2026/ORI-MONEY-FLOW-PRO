-- Phase 5: Golden ERP Final Polish - DB Schema & RLS
-- Run this in Supabase SQL Editor

-- 1. Create Audit Function if not exists
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Projects Table if not exists
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'archived')),
  budget NUMERIC(20, 3) DEFAULT 0,
  currency TEXT DEFAULT 'LYD',
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enhance Accounts Table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES accounts(id);

-- 3. Enhance Transactions & Transfers
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- 4. Enable RLS on Projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies for Accounts
-- Drop loose policies first
DROP POLICY IF EXISTS "Allow all accounts" ON accounts;
DROP POLICY IF EXISTS "Accounts are viewable by assigned owners" ON accounts;

CREATE POLICY "Admins have full access to accounts" 
ON accounts FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE POLICY "Employees can view assigned accounts" 
ON accounts FOR SELECT TO authenticated 
USING (
  owner_id = auth.uid() OR created_by = auth.uid()
);

-- 6. Strict RLS Policies for Transactions
DROP POLICY IF EXISTS "Allow all transactions" ON transactions;

CREATE POLICY "Admins have full access to transactions" 
ON transactions FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE POLICY "Employees can manage own transactions" 
ON transactions FOR ALL TO authenticated 
USING (
  created_by = auth.uid()
)
WITH CHECK (
  created_by = auth.uid()
);

-- 7. Strict RLS Policies for Projects
DROP POLICY IF EXISTS "Projects viewable by all" ON projects;
CREATE POLICY "Projects viewable by all authenticated" ON projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Projects manageable by admins" ON projects FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

-- 8. Strict RLS Policies for Transfers
DROP POLICY IF EXISTS "Allow all transfers" ON transfers;

CREATE POLICY "Admins have full access to transfers" 
ON transfers FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE POLICY "Employees can view own transfers" 
ON transfers FOR SELECT TO authenticated 
USING (
  created_by = auth.uid()
);

-- 9. Refresh Audit Triggers
CREATE TRIGGER audit_projects_changes AFTER INSERT OR UPDATE OR DELETE ON projects FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
