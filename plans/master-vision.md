# ORI Financial Operations ERP — Master Vision

## System Identity

**Name:** ORI Financial Operations ERP
**Version:** 1.0
**Type:** Financial Operations Management Platform (NOT manufacturing ERP)
**Phase:** Active Development

## Business Context

The company operates across **multiple countries and currencies**:
- Sends money to financial manufacturing partners abroad
- Partners buy raw materials and accessories
- Partners handle manufacturing externally
- Balances constantly fluctuate between both sides

Sometimes the partner **owes money** to the company.
Sometimes the company **owes money** to the partner.

## What This System IS NOT

- Pure accounting software
- Inventory ERP
- Manufacturing ERP (WIP, routing, industrial inventory)
- Demo or showcase app

## What This System IS

A professional **Financial Operations Management Platform** focused on:
- Treasury management with multi-currency
- Financial partner ledger management
- Project costing and profitability
- Double-entry accounting
- Supplier payables
- Real-time financial reporting
- PWA mobile-first experience

## Core Modules

1. Authentication & Multi-Company Access
2. Treasury & Cash Management (multi-currency)
3. Financial Partners Ledger
4. Suppliers & Payables
5. Project Management (as financial containers)
6. Product Cost Cards
7. Double-Entry Accounting Engine
8. Expense Management
9. Financial Reporting Engine
10. Notifications & Alerts
11. Settings & Permissions
12. PWA Experience

## Design Philosophy

- Professional SaaS aesthetic — NOT flashy, NOT demo-like
- Arabic RTL-first, mobile-first
- Glassmorphism only subtly
- Clean data tables, strong typography
- Financial-grade precision
- Production-ready stability

## Technical Philosophy

- Real transactions, real accounting entries
- No fake data, no placeholder calculations
- Every operation generates accounting entries
- Company isolation via RLS
- Transactional integrity throughout
- Offline-first with sync

## Success Criteria

- [ ] Real Supabase Auth (no demo bypass)
- [ ] Double-entry accounting fully visible
- [ ] Partner ledger with real balance tracking
- [ ] Treasury with multi-currency conversions
- [ ] Project profitability calculations
- [ ] Professional financial reports
- [ ] Production-ready security
