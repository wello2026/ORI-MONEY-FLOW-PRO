import Dexie, { type Table } from 'dexie'

export interface LocalProfile {
  id: string
  full_name: string
  email: string
  role: 'super_admin' | 'admin' | 'employee' | 'viewer'
  phone?: string
  avatar_url?: string
  is_active: boolean
  last_login?: string
  created_at: string
  synced: boolean
  deleted?: boolean
}

export interface LocalAccount {
  id: string
  code: string
  name: string
  type: 'cashbox' | 'bank' | 'expense' | 'income' | 'employee' | 'temporary'
  balance: number
  currency: string
  status: 'active' | 'inactive' | 'archived'
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
  synced: boolean
  deleted?: boolean
}

export interface LocalTransaction {
  id: string
  reference: string
  type: 'deposit' | 'withdrawal' | 'expense' | 'income' | 'salary' | 'custody' | 'adjustment' | 'settlement'
  amount: number
  description?: string
  account_id: string
  created_by: string
  approved_by?: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  attachments?: Record<string, unknown>
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  synced: boolean
  deleted?: boolean
}

export interface LocalTransfer {
  id: string
  reference: string
  source_account_id: string
  destination_account_id: string
  amount: number
  description?: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  created_by: string
  approved_by?: string
  created_at: string
  synced: boolean
  deleted?: boolean
}

export interface LocalApproval {
  id: string
  entity_type: 'transaction' | 'transfer' | 'account' | 'employee'
  entity_id: string
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
  requested_by: string
  approved_by?: string
  device_info?: Record<string, unknown>
  ip_address?: string
  created_at: string
  decided_at?: string
  synced: boolean
  deleted?: boolean
}

export interface LocalNotification {
  id: string
  user_id: string
  title: string
  body: string
  type: 'approval' | 'transaction' | 'alert' | 'info' | 'summary'
  is_read: boolean
  data?: Record<string, unknown>
  created_at: string
  synced: boolean
}

export interface SyncQueueItem {
  id?: number
  operation: 'create' | 'update' | 'delete' | 'rpc'
  table: string
  data: Record<string, unknown>
  timestamp: string
  retry_count: number
  last_error?: string
}

class ORIFinanceDB extends Dexie {
  profiles!: Table<LocalProfile>
  accounts!: Table<LocalAccount>
  transactions!: Table<LocalTransaction>
  transfers!: Table<LocalTransfer>
  approvals!: Table<LocalApproval>
  notifications!: Table<LocalNotification>
  sync_queue!: Table<SyncQueueItem>

  constructor() {
    super('ORIFinanceProDB')
    this.version(1).stores({
      profiles: 'id, email, role, synced, deleted',
      accounts: 'id, code, type, status, created_by, synced, deleted',
      transactions: 'id, reference, type, account_id, status, created_by, synced, deleted',
      transfers: 'id, reference, source_account_id, destination_account_id, status, created_by, synced, deleted',
      approvals: 'id, entity_type, entity_id, status, requested_by, synced, deleted',
      notifications: 'id, user_id, type, is_read, created_at, synced',
      sync_queue: '++id, operation, table, timestamp'
    })

    this.version(2).stores({
      profiles: 'id, email, role, created_at, synced, deleted',
      accounts: 'id, code, type, status, created_by, created_at, synced, deleted',
      transactions: 'id, reference, type, account_id, status, created_by, created_at, synced, deleted',
      transfers: 'id, reference, source_account_id, destination_account_id, status, created_by, created_at, synced, deleted',
      approvals: 'id, entity_type, entity_id, status, requested_by, created_at, synced, deleted',
      notifications: 'id, user_id, type, is_read, created_at, synced',
      sync_queue: '++id, operation, table, timestamp'
    })
  }
}

export const db = new ORIFinanceDB()

export const clearAllData = async (): Promise<void> => {
  await db.profiles.clear()
  await db.accounts.clear()
  await db.transactions.clear()
  await db.transfers.clear()
  await db.approvals.clear()
  await db.notifications.clear()
  await db.sync_queue.clear()
}

export const getSyncQueueCount = async (): Promise<number> => {
  return await db.sync_queue.count()
}

export const addToSyncQueue = async (
  operation: 'create' | 'update' | 'delete' | 'rpc',
  table: string,
  data: unknown
): Promise<void> => {
  await db.sync_queue.add({
    operation,
    table,
    data: data as Record<string, unknown>,
    timestamp: new Date().toISOString(),
    retry_count: 0
  })
}

export const removeSyncQueueItem = async (id: number): Promise<void> => {
  await db.sync_queue.delete(id)
}

export const getPendingSyncItems = async (): Promise<SyncQueueItem[]> => {
  return await db.sync_queue.orderBy('timestamp').toArray()
}