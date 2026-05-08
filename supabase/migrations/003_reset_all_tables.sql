-- =============================================
-- سكريبت إعادة إنشاء جميع الجداول (النسخة الكاملة)
-- انسخ هذا الكود في SQL Editor في Supabase
-- =============================================

-- حذف الجداول القديمة
DROP TABLE IF EXISTS login_history CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- =============================================
-- 1. جدول المستخدمين (profiles)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('super_admin', 'admin', 'employee', 'viewer')),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  device_info JSONB,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. جدول الحسابات (accounts)
-- =============================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cashbox', 'bank', 'expense', 'income', 'employee', 'temporary')),
  balance NUMERIC(20, 2) DEFAULT 0,
  currency TEXT DEFAULT 'LYD',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. جدول المعاملات (transactions)
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'expense', 'income', 'salary', 'custody', 'adjustment', 'settlement')),
  amount NUMERIC(20, 2) NOT NULL,
  description TEXT,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  attachments JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. جدول التحويلات (transfers)
-- =============================================
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  source_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  destination_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  amount NUMERIC(20, 2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. جدول الموافقات (approvals)
-- =============================================
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('transaction', 'transfer', 'account', 'employee')),
  entity_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  device_info JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

-- =============================================
-- 6. جدول الإشعارات (notifications)
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('approval', 'transaction', 'alert', 'info', 'summary')),
  is_read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. جدول سجل التدقيق (audit_logs)
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 8. جدول سجل تسجيل الدخول (login_history)
-- =============================================
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  device_info JSONB,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- إنشاء الفهارس (Indexes)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_created_by ON accounts(created_by);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_source ON transfers(source_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_dest ON transfers(destination_account_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_entity ON approvals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- =============================================
-- تفعيل Row Level Security (RLS)
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- سياسات الوصول (Policies)
-- =============================================
DROP POLICY IF EXISTS "Allow all profiles" ON profiles;
CREATE POLICY "Allow all profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all accounts" ON accounts;
CREATE POLICY "Allow all accounts" ON accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all transactions" ON transactions;
CREATE POLICY "Allow all transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all transfers" ON transfers;
CREATE POLICY "Allow all transfers" ON transfers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all approvals" ON approvals;
CREATE POLICY "Allow all approvals" ON approvals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all notifications" ON notifications;
CREATE POLICY "Allow all notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all audit_logs" ON audit_logs;
CREATE POLICY "Allow all audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all login_history" ON login_history;
CREATE POLICY "Allow all login_history" ON login_history FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- إدخال بيانات تجريبية
-- =============================================
INSERT INTO profiles (full_name, email, role, is_active)
VALUES 
  ('مدير النظام', 'admin@ori.ly', 'super_admin', true),
  ('مدير', 'manager@ori.ly', 'admin', true),
  ('موظف', 'employee@ori.ly', 'employee', true)
ON CONFLICT (email) DO NOTHING;

-- إضافة حسابات افتراضية
INSERT INTO accounts (code, name, type, balance, currency, status, created_by)
SELECT 'CASH-001', 'الصندوق الرئيسي', 'cashbox', 50000, 'LYD', 'active', id
FROM profiles WHERE email = 'admin@ori.ly'
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, balance, currency, status, created_by)
SELECT 'BANK-001', 'البنك الأهلي', 'bank', 100000, 'LYD', 'active', id
FROM profiles WHERE email = 'admin@ori.ly'
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, balance, currency, status, created_by)
SELECT 'EXP-001', 'مصروفات التشغيل', 'expense', 0, 'LYD', 'active', id
FROM profiles WHERE email = 'admin@ori.ly'
ON CONFLICT (code) DO NOTHING;

INSERT INTO accounts (code, name, type, balance, currency, status, created_by)
SELECT 'INC-001', 'الإيرادات', 'income', 0, 'LYD', 'active', id
FROM profiles WHERE email = 'admin@ori.ly'
ON CONFLICT (code) DO NOTHING;

-- رسالة نجاح
SELECT 'تم إنشاء 8 جداول بنجاح! ✓' as status;