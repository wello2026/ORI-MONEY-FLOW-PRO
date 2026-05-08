-- Phase 4: Enterprise Expansion Migration

-- 1. Contacts Table (Suppliers & Customers)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('supplier', 'customer', 'employee', 'other')),
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_number TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  metadata JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Update Transfers for Multi-Currency
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(20, 6) DEFAULT 1.0;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS destination_amount NUMERIC(20, 3);
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS destination_currency TEXT;

-- 3. Link Accounts to Contacts (e.g., Current Account for Supplier X)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

-- 4. Supplier Bills (Purchase Operations)
CREATE TABLE IF NOT EXISTS supplier_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  amount NUMERIC(20, 3) NOT NULL,
  tax_amount NUMERIC(20, 3) DEFAULT 0,
  total_amount NUMERIC(20, 3) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'paid', 'partially_paid', 'cancelled')),
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS Policies for Contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contacts are viewable by authenticated users" ON contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Contacts manageable by admins" ON contacts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 6. RLS Policies for Bills
ALTER TABLE supplier_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bills are viewable by authenticated users" ON supplier_bills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bills manageable by admins" ON supplier_bills FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 7. Audit Log Triggers for new tables
CREATE TRIGGER audit_contacts_changes AFTER INSERT OR UPDATE OR DELETE ON contacts FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
CREATE TRIGGER audit_bills_changes AFTER INSERT OR UPDATE OR DELETE ON supplier_bills FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
