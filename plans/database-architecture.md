# Database Architecture

## Current State

11 tables exist but several are **half-implemented** or **dead**:
- `journal_entries` / `journal_entry_lines` — schema exists, no frontend
- `contacts` / `supplier_bills` — schema exists, no frontend

## Required Tables (Full Schema)

### Phase 1 — Auth Foundation
```sql
-- companies
id UUID PK
name TEXT
CRUD timestamps
is_active BOOLEAN

-- user_companies
id UUID PK
user_id UUID FK profiles
company_id UUID FK companies
role TEXT (owner/admin/accountant/treasury/operations/viewer)
is_current BOOLEAN
CRUD timestamps

-- profiles (EXISTS, needs user_companies integration)
id UUID PK (auth.users.id)
full_name TEXT
email TEXT
phone TEXT
avatar_url TEXT
default_company_id UUID FK companies
CRUD timestamps
```

### Phase 3 — Treasury
```sql
-- treasuries
id UUID PK
company_id UUID FK
name TEXT
currency_code TEXT (ISO 4217)
country TEXT
treasury_type TEXT (cashbox/bank/reserve)
balance DECIMAL(18,4) DEFAULT 0
is_active BOOLEAN
CRUD timestamps

-- treasury_transactions
id UUID PK
treasury_id UUID FK
type TEXT (deposit/withdrawal/transfer_in/transfer_out)
amount DECIMAL(18,4)
currency_code TEXT
exchange_rate DECIMAL(18,8) DEFAULT 1
destination_amount DECIMAL(18,4)
destination_treasury_id UUID FK
description TEXT
reference_number TEXT
project_id UUID FK (optional)
partner_id UUID FK (optional)
journal_entry_id UUID FK (optional)
status TEXT (pending/approved/rejected)
approved_by UUID FK profiles
approved_at TIMESTAMPTZ
CRUD timestamps
```

### Phase 4 — Accounting
```sql
-- accounts (EXISTS — needs review and enhancement)
id UUID PK
company_id UUID FK
account_number TEXT
account_name TEXT
account_name_ar TEXT
account_type TEXT
parent_id UUID FK accounts (self-ref)
currency_code TEXT
balance DECIMAL(18,4) DEFAULT 0
is_active BOOLEAN
CRUD timestamps

-- journal_entries (EXISTS but unused)
id UUID PK
company_id UUID FK
entry_number TEXT (auto-generated)
entry_date DATE
description TEXT
reference_number TEXT
source_type TEXT (manual/auto_treasury/auto_payment/auto_expense)
source_id UUID
project_id UUID FK (optional)
status TEXT (draft/posted/cancelled)
posted_by UUID FK profiles
posted_at TIMESTAMPTZ
CRUD timestamps

-- journal_entry_lines (EXISTS but unused)
id UUID PK
journal_entry_id UUID FK
account_id UUID FK
debit DECIMAL(18,4) DEFAULT 0
credit DECIMAL(18,4) DEFAULT 0
currency_code TEXT
exchange_rate DECIMAL(18,8) DEFAULT 1
description TEXT
partner_id UUID FK (optional)
CRUD timestamps
```

### Phase 5 — Partners
```sql
-- financial_partners (NEW — replaces contacts for partners)
id UUID PK
company_id UUID FK
partner_code TEXT
partner_name TEXT
partner_name_ar TEXT
country TEXT
currency_code TEXT
balance DECIMAL(18,4) DEFAULT 0  -- positive = partner owes us, negative = we owe partner
contact_person TEXT
phone TEXT
email TEXT
bank_details JSONB
notes TEXT
is_active BOOLEAN
CRUD timestamps

-- partner_ledger_entries (NEW)
id UUID PK
partner_id UUID FK
entry_type TEXT
  -- advance_sent | advance_received | material_purchase |
  -- labor_cost | reimbursement | adjustment | settlement | return
amount DECIMAL(18,4)
currency_code TEXT
balance_after DECIMAL(18,4)
description TEXT
reference_number TEXT
treasury_transaction_id UUID FK (optional)
journal_entry_id UUID FK (optional)
project_id UUID FK (optional)
recorded_by UUID FK profiles
CRUD timestamps
```

### Phase 6 — Suppliers
```sql
-- suppliers (NEW — replaces supplier_bills table)
id UUID PK
company_id UUID FK
supplier_code TEXT
supplier_name TEXT
supplier_name_ar TEXT
country TEXT
currency_code TEXT
balance DECIMAL(18,4) DEFAULT 0
contact_person TEXT
phone TEXT
email TEXT
address TEXT
tax_number TEXT
notes TEXT
is_active BOOLEAN
CRUD timestamps

-- supplier_invoices (NEW)
id UUID PK
company_id UUID FK
supplier_id UUID FK
invoice_number TEXT
invoice_date DATE
due_date DATE
amount DECIMAL(18,4)
currency_code TEXT
tax_amount DECIMAL(18,4) DEFAULT 0
total_amount DECIMAL(18,4)
status TEXT (pending/partial/paid/overdue/cancelled)
project_id UUID FK (optional)
journal_entry_id UUID FK
CRUD timestamps

-- supplier_payments (NEW)
id UUID PK
company_id UUID FK
supplier_invoice_id UUID FK
treasury_transaction_id UUID FK
amount DECIMAL(18,4)
currency_code TEXT
payment_date DATE
payment_method TEXT (bank_transfer/cash/cheque)
reference_number TEXT
journal_entry_id UUID FK
CRUD timestamps
```

### Phase 7 — Projects
```sql
-- projects (EXISTS — needs major enhancement)
id UUID PK
company_id UUID FK
project_code TEXT
project_name TEXT
project_name_ar TEXT
description TEXT
status TEXT
start_date DATE
end_date DATE
budget DECIMAL(18,4)
currency_code TEXT
manager_id UUID FK profiles
partner_id UUID FK (optional)
expected_revenue DECIMAL(18,4)
notes TEXT
is_active BOOLEAN
CRUD timestamps

-- project_expenses (NEW)
id UUID PK
project_id UUID FK
expense_category TEXT
amount DECIMAL(18,4)
currency_code TEXT
description TEXT
reference_number TEXT
expense_date DATE
journal_entry_id UUID FK
partner_id UUID FK (optional)
supplier_id UUID FK (optional)
recorded_by UUID FK profiles
CRUD timestamps

-- project_revenues (NEW)
id UUID PK
project_id UUID FK
amount DECIMAL(18,4)
currency_code TEXT
description TEXT
revenue_date DATE
journal_entry_id UUID FK
recorded_by UUID FK profiles
CRUD timestamps
```

### Phase 8 — Products
```sql
-- product_cost_cards (NEW)
id UUID PK
company_id UUID FK
sku TEXT
product_name TEXT
product_name_ar TEXT
category TEXT
unit TEXT (piece/meter/kg/etc)
material_cost DECIMAL(18,4)
accessories_cost DECIMAL(18,4)
labor_cost DECIMAL(18,4)
packaging_cost DECIMAL(18,4)
shipping_cost DECIMAL(18,4)
miscellaneous_cost DECIMAL(18,4)
currency_code TEXT
conversion_factor DECIMAL(18,8) DEFAULT 1
final_local_cost DECIMAL(18,4)
final_foreign_cost DECIMAL(18,4)
estimated_selling_price DECIMAL(18,4)
estimated_margin DECIMAL(18,4)
notes TEXT
CRUD timestamps

-- product_cost_components (NEW)
id UUID PK
product_cost_card_id UUID FK
component_type TEXT (material/labor/accessory/packaging/shipping/misc)
component_name TEXT
quantity DECIMAL(18,4)
unit_cost DECIMAL(18,4)
unit TEXT
total_cost DECIMAL(18,4)
currency_code TEXT
notes TEXT
CRUD timestamps
```

### Phase 9 — Expenses
```sql
-- expenses (NEW)
id UUID PK
company_id UUID FK
expense_category TEXT
amount DECIMAL(18,4)
currency_code TEXT
description TEXT
expense_date DATE
project_id UUID FK (optional)
partner_id UUID FK (optional)
journal_entry_id UUID FK
status TEXT
receipt_url TEXT
recorded_by UUID FK profiles
CRUD timestamps
```

### Phase 10 — Notifications
```sql
-- notifications (EXISTS — needs enhancement)
-- Add: priority, action_url, related_entity_type, related_entity_id

-- push_subscriptions (EXISTS)
```

### Phase 2 — Audit & Governance
```sql
-- audit_logs (EXISTS — add company_id)
-- login_history (EXISTS — needs enhancement)
```

### Indexes Required

```sql
CREATE INDEX idx_treasury_transactions_treasury ON treasury_transactions(treasury_id);
CREATE INDEX idx_treasury_transactions_date ON treasury_transactions(entry_date);
CREATE INDEX idx_treasury_transactions_project ON treasury_transactions(project_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);
CREATE INDEX idx_journal_entry_lines_account ON journal_entry_lines(account_id);
CREATE INDEX idx_partner_ledger_partner ON partner_ledger_entries(partner_id);
CREATE INDEX idx_partner_ledger_date ON partner_ledger_entries(created_at);
CREATE INDEX idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX idx_supplier_invoices_status ON supplier_invoices(status);
CREATE INDEX idx_project_expenses_project ON project_expenses(project_id);
CREATE INDEX idx_expenses_category ON expenses(expense_category);
```

## RLS Strategy

Every table has:
```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Company isolation (most critical)
CREATE POLICY company_isolation ON table_name
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM user_companies
    WHERE user_id = auth.uid()
  ));

-- Role-based access (supplemental)
CREATE POLICY admin_full_access ON table_name
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_id = auth.uid()
      AND company_id = table_name.company_id
      AND role IN ('owner', 'admin')
    )
  );
```

## Migration Priority

1. **P0 - Auth Foundation** — companies, user_companies, fix auth
2. **P1 - Treasury Core** — treasuries, treasury_transactions
3. **P2 - Accounting** — enhance accounts, journal_entries, journal_entry_lines
4. **P3 - Partners** — financial_partners, partner_ledger_entries
5. **P4 - Suppliers** — suppliers, supplier_invoices, supplier_payments
6. **P5 - Projects** — enhance projects, project_expenses, project_revenues
7. **P6 - Products** — product_cost_cards, product_cost_components
8. **P7 - Expenses** — expenses
9. **P8 - Audit** — enhance audit_logs, login_history
