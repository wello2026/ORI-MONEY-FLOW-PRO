# Accounting Engine Design

## Current State

- `journal_entries` + `journal_entry_lines` tables exist in DB
- `approve_transaction` RPC creates journal entries atomically
- **NO frontend to view or create journal entries**
- Reports use single-entry `account.balance` instead of double-entry

## Target: Full Double-Entry Accounting Engine

Every financial operation creates balanced journal entries:
```
Debit(s) = Credit(s)  ✓ Always balanced
```

## Chart of Accounts

### Account Types
```
Asset      (DEBIT increases)  — treasury accounts, receivables
Liability  (CREDIT increases)  — payables, loans
Equity     (CREDIT increases)  — capital, retained earnings
Revenue    (CREDIT increases) — income, gains
Expense    (DEBIT increases)   — costs, losses
```

### Standard Account Hierarchy
```
1. Assets (1000-1999)
   ├── 1100 Current Assets
   │   ├── 1110 Cash & Cash Equivalents
   │   │   ├── 1111 Main Cashbox (LYD)
   │   │   ├── 1112 USD Reserve (USD)
   │   │   ├── 1113 Turkey Treasury (TRY)
   │   │   └── 1114 China Treasury (CNY)
   │   ├── 1120 Bank Accounts
   │   │   ├── 1121 Tripoli Bank (LYD)
   │   │   └── 1122 Foreign Bank (USD)
   │   └── 1130 Accounts Receivable
   │       └── 1131 Partner Advances (control)
   │
   ├── 1200 Financial Partners (current)
   │   └── 1210 Partner Current Accounts
   │       └── Individual sub-accounts per partner
   │
   └── 1300 Other Assets
       └── 1310 Prepaid Expenses

2. Liabilities (2000-2999)
   ├── 2100 Current Liabilities
   │   ├── 2110 Accounts Payable
   │   │   ├── 2111 Supplier Control
   │   │   └── Individual per supplier
   │   ├── 2120 Partner Payables
   │   │   └── Partners who prepaid (negative balance)
   │   └── 2130 Taxes Payable

3. Equity (3000-3999)
   ├── 3100 Capital
   │   └── 3110 Owner Capital
   └── 3200 Retained Earnings

4. Revenue (4000-4999)
   ├── 4100 Operating Revenue
   │   └── 4110 Sales Revenue
   ├── 4200 Other Income
   │   ├── 4210 Exchange Gains
   │   └── 4220 Interest Income

5. Expenses (5000-5999)
   ├── 5100 Cost of Goods Sold
   │   ├── 5110 Material Costs
   │   ├── 5120 Labor Costs
   │   └── 5130 Partner Manufacturing Costs
   ├── 5200 Operating Expenses
   │   ├── 5210 Salaries & Wages
   │   ├── 5220 Rent & Utilities
   │   ├── 5230 Transportation
   │   ├── 5240 Packaging & Shipping
   │   └── 5250 Miscellaneous
   └── 5300 Financial Expenses
       ├── 5310 Bank Fees
       └── 5320 Exchange Losses
```

## Journal Entry Auto-Generation Rules

### Rule 1: Treasury Transfer (Currency Conversion)
```
Scenario: Transfer 1000 USD → 32500 TRY (rate 32.5)

Treasury Transaction:
- Source: USD Treasury (-1000 USD)
- Destination: TRY Treasury (+32500 TRY)
- Exchange rate: 32.5

Journal Entry Lines:
1. DR USD Treasury           1000 USD  (debit source asset)
2. CR TRY Treasury          32500 TRY (credit dest asset)

→ If exchange rate ≠ market rate, create difference entry:
3. DR/CN Exchange Difference   XX TRY  (gain/loss)
```

### Rule 2: Advance to Partner
```
Scenario: Send 5000 USD to Mohammed partner

Treasury: USD Treasury -5000 USD
Partner Ledger: Mohammed +5000 USD (advance_sent)

Journal Entry:
1. DR Partner Advances (Mohammed)  5000 USD  (asset/ receivable)
2. CR Cash/Bank (USD Treasury)    5000 USD  (asset decreases)
```

### Rule 3: Partner Material Purchase
```
Scenario: Partner buys 3000 USD materials (from advance)

Partner Ledger: Mohammed -3000 USD (material_purchase)

Journal Entry:
1. DR Manufacturing Costs          3000 USD  (expense)
2. CR Partner Advances (Mohammed)   3000 USD  (reduces receivable)
```

### Rule 4: Partner Labor Cost
```
Scenario: Partner charges 1000 USD labor

Partner Ledger: Mohammed -1000 USD (labor_cost)

Journal Entry:
1. DR Labor Costs                  1000 USD  (expense)
2. CR Partner Advances (Mohammed)   1000 USD
```

### Rule 5: Settlement
```
Scenario: Settle with partner, remaining balance

If partner owes company (positive balance):
  → Company receives money back

  Journal Entry:
  1. DR Cash/Bank                  XX USD
  2. CR Partner Advances (Name)    XX USD

If company owes partner (negative balance):
  → Company pays partner

  Journal Entry:
  1. DR Partner Payable (Name)     XX USD
  2. CR Cash/Bank                  XX USD
```

### Rule 6: Supplier Invoice
```
Scenario: Supplier invoice for 2000 USD materials

Supplier Ledger: Supplier X +2000 USD (payable)

Journal Entry:
1. DR Inventory/Materials          2000 USD  (asset increase)
2. CR Accounts Payable (Supplier X) 2000 USD  (liability increase)
```

### Rule 7: Supplier Payment
```
Scenario: Pay 1000 USD to supplier

Supplier Ledger: Supplier X -1000 USD (payment)

Journal Entry:
1. DR Accounts Payable (Supplier X) 1000 USD
2. CR Cash/Bank                     1000 USD
```

### Rule 8: Project Expense
```
Scenario: Project expense 500 LYD (various)

Project Ledger: Project X +500 LYD

Journal Entry:
1. DR Project Costs                 500 LYD  (expense)
2. CR Cash/Expenses Payable        500 LYD
```

## Accounting Reports

### General Journal
- All journal entries chronologically
- Filter by date range, account, source

### Ledger (T-Account)
- Per account: all debits and credits
- Running balance
- Filter by date range

### Trial Balance
- All accounts with debit/credit columns
- Total debits = Total credits
- Date as-of filter

### Balance Sheet
- Assets = Liabilities + Equity
- As-of date filter

### Income Statement (P&L)
- Revenue - Expenses = Net Income
- Period filter

### Cash Flow Statement
- Operating / Investing / Financing sections
- Indirect method

## Accounting Safety Rules

1. **Unbalanced entries rejected** — sum(debits) must equal sum(credits)
2. **Closed period protection** — no posting to past closed periods
3. **Reversal entries** — created with reverse date
4. **Recurring entries** — scheduled, auto-generated
5. **Draft vs Posted** — draft is editable, posted is locked
6. **Cancellation** — create reversal entry, don't delete

## Implementation Phases

### Phase A: Core Accounting UI
- [ ] Journal entry list view
- [ ] Journal entry detail view (read-only for auto-generated)
- [ ] Manual journal entry form (for corrections/adjustments)
- [ ] Account ledger view
- [ ] Trial balance report

### Phase B: Auto-Generation Integration
- [ ] Enhance treasury transfer to create proper JE
- [ ] Enhance partner transactions to create proper JE
- [ ] Enhance supplier operations to create proper JE
- [ ] Enhance project expenses to create proper JE

### Phase C: Advanced Reports
- [ ] Balance sheet
- [ ] Income statement
- [ ] Cash flow statement
- [ ] Account analysis reports
