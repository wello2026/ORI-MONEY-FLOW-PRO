import { formatCurrency, formatDateForExport, formatDateTime } from './format'

export const exportToCSV = (data: Record<string, unknown>[], filename: string): void => {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header]
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return String(value ?? '')
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${formatDateForExport(new Date())}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const exportTransactionsToCSV = (transactions: Array<{
  reference: string
  type: string
  amount: number
  status: string
  created_at: string
  account_id?: string
}>): void => {
  const data = transactions.map((t) => ({
    Reference: t.reference,
    Type: t.type,
    Amount: t.amount,
    Status: t.status,
    Date: formatDateTime(t.created_at)
  }))
  exportToCSV(data, 'transactions')
}

export const exportAccountsToCSV = (accounts: Array<{
  code: string
  name: string
  type: string
  balance: number
  status: string
  created_at: string
}>): void => {
  const data = accounts.map((a) => ({
    Code: a.code,
    Name: a.name,
    Type: a.type,
    Balance: a.balance,
    Status: a.status,
    Created: formatDateTime(a.created_at)
  }))
  exportToCSV(data, 'accounts')
}

export const exportTransfersToCSV = (transfers: Array<{
  reference: string
  source_account_id: string
  destination_account_id: string
  amount: number
  status: string
  created_at: string
}>) => {
  const data = transfers.map((t) => ({
    Reference: t.reference,
    'Source Account': t.source_account_id,
    'Destination Account': t.destination_account_id,
    Amount: t.amount,
    Status: t.status,
    Date: formatDateTime(t.created_at)
  }))
  exportToCSV(data, 'transfers')
}

export const printReport = (title: string, content: string): void => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: 'Cairo', sans-serif; padding: 20px; }
        h1 { text-align: center; color: #1e3a5f; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
        th { background-color: #1e3a5f; color: white; }
        .print-date { text-align: left; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="print-date">تاريخ الطباعة: ${formatDateTime(new Date())}</p>
      ${content}
      <script>window.print();</script>
    </body>
    </html>
  `)
  printWindow.document.close()
}

export const generateDailyReport = (transactions: Array<{
  reference: string
  type: string
  amount: number
  account_id?: string
  created_at: string
}>) => {
  const totalIncome = transactions
    .filter((t) => ['deposit', 'income'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = transactions
    .filter((t) => ['withdrawal', 'expense', 'salary'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0)

  const tableRows = transactions.map((t) => `
    <tr>
      <td>${t.reference}</td>
      <td>${t.type}</td>
      <td>${formatCurrency(t.amount)}</td>
      <td>${formatDateTime(t.created_at)}</td>
    </tr>
  `).join('')

  return `
    <div class="summary">
      <h2>ملخص اليوم</h2>
      <p>إجمالي الدخل: ${formatCurrency(totalIncome)}</p>
      <p>إجمالي المصروفات: ${formatCurrency(totalExpense)}</p>
      <p>صافي الربح: ${formatCurrency(totalIncome - totalExpense)}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>المرجع</th>
          <th>النوع</th>
          <th>المبلغ</th>
          <th>التاريخ</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `
}