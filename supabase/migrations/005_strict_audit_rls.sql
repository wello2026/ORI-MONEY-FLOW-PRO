-- Phase 1: Strict Audit Trails & RLS

-- 1. Prevent anonymous records by making created_by mandatory
ALTER TABLE accounts ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN created_by SET NOT NULL;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 3. Create strict policies to ensure users can only create records under their own ID
-- Note: Requires users to be authenticated via Supabase Auth

-- Accounts Policies
DROP POLICY IF EXISTS "Users can view all accounts" ON accounts;
CREATE POLICY "Users can view all accounts" 
ON accounts FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Users can insert accounts" ON accounts;
CREATE POLICY "Users can insert accounts" 
ON accounts FOR INSERT 
TO authenticated 
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update accounts" ON accounts;
CREATE POLICY "Users can update accounts" 
ON accounts FOR UPDATE 
TO authenticated 
USING (true);

-- Transactions Policies
DROP POLICY IF EXISTS "Users can view all transactions" ON transactions;
CREATE POLICY "Users can view all transactions" 
ON transactions FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Users can insert transactions" ON transactions;
CREATE POLICY "Users can insert transactions" 
ON transactions FOR INSERT 
TO authenticated 
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update transactions" ON transactions;
CREATE POLICY "Users can update transactions" 
ON transactions FOR UPDATE 
TO authenticated 
USING (true);
