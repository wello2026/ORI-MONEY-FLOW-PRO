import { useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAccountStore } from '@/stores/accountStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useSyncStore } from '@/stores/syncStore'

export function useRealtime() {
  const isOnline = useSyncStore((state) => state.isOnline)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions)
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications)

  const subscribeToAccounts = useCallback(() => {
    if (!isSupabaseConfigured()) return null

    return supabase
      .channel('accounts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, (payload) => {
        console.log('Account change:', payload)
        fetchAccounts()
      })
      .subscribe()
  }, [fetchAccounts])

  const subscribeToTransactions = useCallback(() => {
    if (!isSupabaseConfigured()) return null

    return supabase
      .channel('transactions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        console.log('Transaction change:', payload)
        fetchTransactions()
      })
      .subscribe()
  }, [fetchTransactions])

  const subscribeToNotifications = useCallback(() => {
    if (!isSupabaseConfigured()) return null

    return supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        console.log('New notification:', payload)
        fetchNotifications()
      })
      .subscribe()
  }, [fetchNotifications])

  useEffect(() => {
    if (!isOnline || !isSupabaseConfigured()) return

    const accountsChannel = subscribeToAccounts()
    const transactionsChannel = subscribeToTransactions()
    const notificationsChannel = subscribeToNotifications()

    return () => {
      if (accountsChannel) supabase.removeChannel(accountsChannel)
      if (transactionsChannel) supabase.removeChannel(transactionsChannel)
      if (notificationsChannel) supabase.removeChannel(notificationsChannel)
    }
  }, [isOnline, subscribeToAccounts, subscribeToTransactions, subscribeToNotifications])

  return {
    subscribeToAccounts,
    subscribeToTransactions,
    subscribeToNotifications
  }
}

export function usePresence() {
  const [presenceState, setPresenceState] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const channel = supabase.channel('presence', {
      config: {
        presence: {
          key: 'user-presence'
        }
      }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setPresenceState(state)
      })
      .subscribe()

    channel.track({
      online_at: new Date().toISOString()
    })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [])

  return presenceState
}

import { useState } from 'react'

export function useConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'connected' : 'disconnected'
  )

  useEffect(() => {
    const handleOnline = () => setStatus('connected')
    const handleOffline = () => setStatus('disconnected')

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return status
}