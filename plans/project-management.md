# Project Management System — Financial Containers

## Current State (Problems)

- `projects` table has basic fields (name, code, status, budget, currency)
- **Budget progress bar hardcoded to 0%**
- **Current expenses hardcoded to 0.00**
- No project detail page
- No project transactions view
- No budget tracking
- manager_id doesn't update any UI

## Vision: Projects as Financial Containers

Projects are NOT just construction sites.
Projects are **financial containers** that aggregate:

- Treasury transfers to/from project
- Partner operations assigned to project
- Supplier purchases for project
- Direct expenses
- Revenue entries
- Product cost allocations

```
Project "Summer Collection 2026"
├── Material Purchases     $15,000
│   └── 3 supplier invoices
├── Partner Operations     $25,000
│   └── Mohammed: $15,000
│   └── Ali Sons: $10,000
├── Direct Expenses         $2,000
│   └── Packaging: $1,000
│   └── Shipping: $1,000
├── Total Cost            $42,000
├── Expected Revenue      $60,000
├── Estimated Profit      $18,000 (30%)
└── Status: In Progress
```

## Project Data Model

```typescript
interface Project {
  id: string;
  company_id: string;
  project_code: string;          // e.g., "PRJ-2026-001"
  project_name: string;
  project_name_ar: string;
  description: string;
  status: 'draft' | 'planning' | 'in_progress' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  budget: number;
  currency_code: string;
  manager_id: string;             // profiles.id
  partner_id?: string;            // primary partner
  expected_revenue: number;
  actual_revenue: number;
  cost_limit?: number;            // optional spending cap
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectExpense {
  id: string;
  project_id: string;
  expense_category: string;
  amount: number;
  currency_code: string;
  description: string;
  reference_number: string;
  expense_date: string;
  journal_entry_id: string;
  partner_id?: string;
  supplier_id?: string;
  recorded_by: string;
  created_at: string;
}

interface ProjectRevenue {
  id: string;
  project_id: string;
  amount: number;
  currency_code: string;
  description: string;
  revenue_date: string;
  journal_entry_id: string;
  recorded_by: string;
  created_at: string;
}
```

## Project Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Summer Collection 2026 (PRJ-2026-001)                       │
│ Status: 🔵 In Progress  |  Manager: Walid                   │
├─────────────────────────────────────────────────────────────┤
│ Budget: $50,000 USD   │   Spent: $42,000   │   Left: $8,000 │
│ ████████████████████░░░░░░░░░░░░░░░░░░░░░ 84%             │
├─────────────────────────────────────────────────────────────┤
│ Expected Revenue  │  Actual Revenue   │  Est. Profit        │
│ $60,000           │  $0               │  $18,000 (30%)      │
├─────────────────────────────────────────────────────────────┤
│ Cost Breakdown              │  Financial Timeline             │
│ ┌──────────────────────┐   │  ┌──────────────────────┐     │
│ │ Materials   $15,000  │   │  │ Jan: $10,000          │     │
│ │ Partner     $25,000  │   │  │ Feb: $20,000          │     │
│ │ Expenses     $2,000   │   │  │ Mar: $12,000          │     │
│ │ Total       $42,000  │   │  │ Total: $42,000        │     │
│ └──────────────────────┘   │  └──────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Project Financial Reports

### Project Cost Summary
- Total costs by category
- Breakdown by partner
- Breakdown by supplier
- Timeline (monthly/quarterly)

### Project Profitability
- Budget vs Actual
- Expected vs Actual
- Profit margin analysis
- Cost per unit (if quantities known)

### Project Statement
- All financial movements
- Running balance
- Filter by date, type

## Project-Operations Flow

### Create Project
1. User fills project form (name, code, dates, budget, manager)
2. System creates project record
3. User optionally assigns primary partner

### Link Treasury Transfer to Project
1. User creates treasury transfer
2. User optionally selects project
3. System tracks transfer in project_expenses (or treasury_transaction.project_id)

### Link Partner Operation to Project
1. User records partner expense
2. User selects project
3. System links ledger entry to project

### Project Cost Calculation

```sql
-- Total project cost from all sources
SELECT
  p.id,
  p.project_name,
  COALESCE(SUM(te.amount), 0) as treasury_transfers,
  COALESCE(SUM(pe.amount), 0) as project_expenses,
  COALESCE(SUM(pr.amount), 0) as revenues,
  COALESCE(SUM(te.amount), 0) + COALESCE(SUM(pe.amount), 0) as total_cost
FROM projects p
LEFT JOIN treasury_transactions te ON te.project_id = p.id
LEFT JOIN project_expenses pe ON pe.project_id = p.id
LEFT JOIN project_revenues pr ON pr.project_id = p.id
WHERE p.id = $1
GROUP BY p.id;
```

## Implementation Checklist

- [ ] Add new columns to projects table (expense tracking fields)
- [ ] Create project_expenses table
- [ ] Create project_revenues table
- [ ] Add RLS policies
- [ ] Create projectStore with financial aggregations
- [ ] Create ProjectDetailPage with financial dashboard
- [ ] Create ProjectCostBreakdown component
- [ ] Create ProjectProfitability component
- [ ] Create ProjectStatement component
- [ ] Link treasury transfers to projects
- [ ] Link partner operations to projects
- [ ] Link supplier invoices to projects
- [ ] Add budget tracking (real, not hardcoded)
- [ ] Add budget alert thresholds
- [ ] Project list with financial summary
- [ ] Project export (PDF/CSV)