# Financial Partner Ledger System

## Concept

Financial Partners are NOT suppliers, NOT customers, NOT warehouses.

They are **external manufacturing partners** who:
- Receive money from the company
- Buy raw materials independently
- Pay labor and manufacturing costs
- Send finished/semi-finished products
- Have dynamic, fluctuating balances

Balance model:
```
Partner balance = Money sent - (Materials + Labor + Expenses + Reimbursements)

Positive balance  → Partner owes company money
Negative balance  → Company owes partner money
```

## Partner Data Model

```typescript
interface FinancialPartner {
  id: string;
  company_id: string;
  partner_code: string;       // e.g., "PART-001"
  partner_name: string;
  partner_name_ar: string;
  country: string;
  currency_code: string;      // Primary currency of operations
  balance: number;            // Current ledger balance (computed)
  contact_person: string;
  phone: string;
  email: string;
  bank_details: {
    bank_name: string;
    account_number: string;
    iban: string;
    swift: string;
  };
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PartnerLedgerEntry {
  id: string;
  partner_id: string;
  entry_type: 'advance_sent' | 'material_purchase' |
              'labor_cost' | 'reimbursement' |
              'adjustment' | 'settlement' | 'return';
  amount: number;             // Always positive
  currency_code: string;
  balance_after: number;      // Running balance after this entry
  description: string;
  reference_number: string;
  treasury_transaction_id?: string;
  journal_entry_id?: string;
  project_id?: string;
  recorded_by: string;
  created_at: string;
}
```

## Balance Calculation

```sql
-- Partner balance = SUM of all ledger entries
-- advance_sent, return → adds to balance (partner owes us)
-- material_purchase, labor_cost, reimbursement → subtracts from balance
-- adjustment, settlement → depends on direction

SELECT
  p.id,
  p.partner_name,
  SUM(
    CASE
      WHEN ple.entry_type IN ('advance_sent', 'return') THEN ple.amount
      WHEN ple.entry_type IN ('material_purchase', 'labor_cost', 'reimbursement', 'settlement') THEN -ple.amount
      WHEN ple.entry_type = 'adjustment' THEN ple.amount -- positive or negative based on amount sign
      ELSE 0
    END
  ) as balance
FROM financial_partners p
LEFT JOIN partner_ledger_entries ple ON ple.partner_id = p.id
WHERE p.company_id = $1
GROUP BY p.id
ORDER BY balance DESC;
```

## Partner Ledger Operations

### 1. Send Advance
```
User action: Send money to partner
Form fields:
  - Partner (dropdown)
  - Amount
  - Currency (from treasury)
  - Exchange rate (if multi-currency)
  - Project link (optional)
  - Description

System creates:
  1. Treasury transaction: withdrawal from source treasury
  2. Partner ledger entry: advance_sent (+amount)
  3. Journal entry:
     DR Partner Advances (Account)    amount
     CR Cash/Bank (Treasury Account) amount
  4. Update partner balance cache
```

### 2. Record Material Purchase
```
User action: Partner reports material purchase
Form fields:
  - Partner (dropdown, locked)
  - Project (optional)
  - Amount
  - Currency
  - Material description
  - Supplier reference
  - Receipt/invoice reference

System creates:
  1. Partner ledger entry: material_purchase (-amount)
  2. Journal entry:
     DR Manufacturing Costs    amount
     CR Partner Advances        amount
```

### 3. Record Labor Cost
```
User action: Partner reports labor payment
Form fields:
  - Partner
  - Project (optional)
  - Amount
  - Currency
  - Worker count / description
  - Period (date range)

System creates:
  1. Partner ledger entry: labor_cost (-amount)
  2. Journal entry:
     DR Labor Costs            amount
     CR Partner Advances       amount
```

### 4. Reimbursement
```
User action: Partner spent from own money, company reimburses
Form fields:
  - Partner
  - Amount
  - Currency
  - Description (what was paid for)
  - Receipts (file upload)

System creates:
  1. Treasury transaction: payment to partner
  2. Partner ledger entry: reimbursement (-amount)
  3. Journal entry:
     DR Partner Payable        amount
     CR Cash/Bank              amount
```

### 5. Settlement
```
User action: Final settlement with partner
Form fields:
  - Partner
  - Settlement amount (pre-filled with current balance)
  - Direction: "We pay partner" or "Partner pays us"
  - Description

System creates:
  1. Treasury transaction (if cash changes hands)
  2. Partner ledger entry: settlement (clears balance)
  3. Journal entry (debit/credit based on direction)
```

### 6. Adjustment
```
User action: Manual balance correction
Form fields:
  - Partner
  - Amount (can be positive or negative)
  - Reason

System creates:
  1. Partner ledger entry: adjustment
  2. Journal entry for the difference
```

## Partner Statement (Statement of Account)

```
Partner: Mohammed Ali
Period: January 1 - March 31, 2026
Currency: USD

DATE        | DESCRIPTION            | DEBIT  | CREDIT | BALANCE
------------|------------------------|--------|--------|--------
2026-01-05  | Opening Balance       |   --   |   --   |  0.00
2026-01-10  | Advance Sent          |   --   | 5000.00| 5000.00
2026-01-15  | Material Purchase     | 3000.00|   --   | 2000.00
2026-01-20  | Labor Cost            | 1000.00|   --   | 1000.00
2026-02-01  | Advance Sent          |   --   | 2000.00| 3000.00
2026-02-15  | Reimbursement         |  500.00|   --   | 2500.00
------------|------------------------|--------|--------|--------
            | Closing Balance        | 4500.00| 7000.00| 2500.00

Balance Summary:
- Total Advances Sent:     7,000 USD
- Total Expenses Covered:  4,500 USD
- Current Balance:         2,500 USD (Partner owes company)
```

## Partner List View

```
┌─────────────────────────────────────────────────────────────┐
│ Financial Partners                              [+ Add]     │
├─────────────────────────────────────────────────────────────┤
│ [Search: Name / Code] [Filter: Country / Status / Balance]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 👤 Mohammed Ali (PART-001)                              │ │
│ │ Turkey | USD | Balance: +2,500 USD (Owed to us)        │ │
│ │ 📊 Statement  💰 Send Advance  📝 Record Expense        │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 👤 Ali Sons (PART-002)                                  │ │
│ │ China | CNY | Balance: -1,200 CNY (We owe)             │ │
│ │ 📊 Statement  💰 Send Advance  📝 Record Expense        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Partner Detail Page

```
/app/partners/:id

Sections:
1. Header: Name, Code, Country, Currency, Status, Actions
2. Balance Card: Current balance, trend mini-chart
3. Quick Actions: Send Advance, Record Expense, Settle
4. Statement Table: Full ledger history with running balance
5. Linked Projects: Projects this partner is assigned to
6. Documents: Invoices, receipts, agreements
7. Notes: Internal notes
```

## Implementation Checklist

- [ ] Create `financial_partners` table + migration
- [ ] Create `partner_ledger_entries` table + migration
- [ ] Add RLS policies
- [ ] Create partnerStore (Zustand)
- [ ] Create PartnersListPage
- [ ] Create PartnerDetailPage
- [ ] Create PartnerStatement component
- [ ] Implement Send Advance flow
- [ ] Implement Record Material Purchase flow
- [ ] Implement Record Labor Cost flow
- [ ] Implement Reimbursement flow
- [ ] Implement Settlement flow
- [ ] Implement Adjustment flow
- [ ] Add partner balance cache update triggers
- [ ] Add partner_id to treasury_transactions
- [ ] Link partner ledger entries to journal entries
- [ ] Partner reports: balance summary, aging, statement export