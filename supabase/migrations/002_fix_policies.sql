-- إصلاح سياسات الأمان في Supabase
-- انسخ هذا الكود في SQL Editor في Supabase ثم اضغط Run

-- =============================================
-- تعطيل RLS مؤقتاً للاختبار (إذا كان يريد)
-- =============================================

-- للسماح بالقراءة والكتابة للجميع (للاختبار فقط)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- سياسات Profiles
-- =============================================
DROP POLICY IF EXISTS "Allow all reads profiles" ON public.profiles;
CREATE POLICY "Allow all reads profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all inserts profiles" ON public.profiles;
CREATE POLICY "Allow all inserts profiles" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all updates profiles" ON public.profiles;
CREATE POLICY "Allow all updates profiles" ON public.profiles FOR UPDATE USING (true);

-- =============================================
-- سياسات Accounts
-- =============================================
DROP POLICY IF EXISTS "Allow all reads accounts" ON public.accounts;
CREATE POLICY "Allow all reads accounts" ON public.accounts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all inserts accounts" ON public.accounts;
CREATE POLICY "Allow all inserts accounts" ON public.accounts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all updates accounts" ON public.accounts;
CREATE POLICY "Allow all updates accounts" ON public.accounts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow all deletes accounts" ON public.accounts;
CREATE POLICY "Allow all deletes accounts" ON public.accounts FOR DELETE USING (true);

-- =============================================
-- سياسات Transactions
-- =============================================
DROP POLICY IF EXISTS "Allow all reads transactions" ON public.transactions;
CREATE POLICY "Allow all reads transactions" ON public.transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all inserts transactions" ON public.transactions;
CREATE POLICY "Allow all inserts transactions" ON public.transactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all updates transactions" ON public.transactions;
CREATE POLICY "Allow all updates transactions" ON public.transactions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow all deletes transactions" ON public.transactions;
CREATE POLICY "Allow all deletes transactions" ON public.transactions FOR DELETE USING (true);

-- =============================================
-- سياسات Transfers
-- =============================================
DROP POLICY IF EXISTS "Allow all reads transfers" ON public.transfers;
CREATE POLICY "Allow all reads transfers" ON public.transfers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all inserts transfers" ON public.transfers;
CREATE POLICY "Allow all inserts transfers" ON public.transfers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all updates transfers" ON public.transfers;
CREATE POLICY "Allow all updates transfers" ON public.transfers FOR UPDATE USING (true);

-- =============================================
-- سياسات Approvals
-- =============================================
DROP POLICY IF EXISTS "Allow all reads approvals" ON public.approvals;
CREATE POLICY "Allow all reads approvals" ON public.approvals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all inserts approvals" ON public.approvals;
CREATE POLICY "Allow all inserts approvals" ON public.approvals FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all updates approvals" ON public.approvals;
CREATE POLICY "Allow all updates approvals" ON public.approvals FOR UPDATE USING (true);

-- =============================================
-- سياسات Notifications
-- =============================================
DROP POLICY IF EXISTS "Allow all reads notifications" ON public.notifications;
CREATE POLICY "Allow all reads notifications" ON public.notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all inserts notifications" ON public.notifications;
CREATE POLICY "Allow all inserts notifications" ON public.notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all updates notifications" ON public.notifications;
CREATE POLICY "Allow all updates notifications" ON public.notifications FOR UPDATE USING (true);

-- =============================================
-- رسالة نجاح
-- =============================================
SELECT 'تم إصلاح سياسات الأمان بنجاح! 🎉' as status;