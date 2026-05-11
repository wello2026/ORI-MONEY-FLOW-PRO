import { useState, useCallback } from 'react'
import { useNotificationStore } from '@/stores/notificationStore'

export type ApiErrorCode =
  | 'network' | 'unauthorized' | 'forbidden' | 'not_found'
  | 'validation' | 'conflict' | 'server_error' | 'offline'
  | 'unknown'

export interface ApiError {
  code: ApiErrorCode
  message: string
  details?: Record<string, unknown>
}

function classifyError(err: unknown): ApiError {
  if (!navigator.onLine) {
    return { code: 'offline', message: 'لا يوجد اتصال بالإنترنت. سيتم المحاولة عند استعادة الاتصال.' }
  }

  const anyErr = err as Record<string, unknown>
  const status = anyErr.status as number | undefined
  const code = String(anyErr.code || status || 'unknown')

  if (status === 401 || code === '401' || code === 'unauthorized') {
    return { code: 'unauthorized', message: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.' }
  }
  if (status === 403 || code === '403' || code === 'forbidden') {
    return { code: 'forbidden', message: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.' }
  }
  if (status === 404 || code === '404' || code === 'not_found') {
    return { code: 'not_found', message: 'المورد المطلوب غير موجود.' }
  }
  if (status === 409 || code === '409' || code === '23505' || code === 'conflict') {
    return { code: 'conflict', message: 'يوجد تعارض في البيانات. قد يكون السجل موجوداً بالفعل.' }
  }
  if (status === 422 || code === 'P0001' || code === 'validation') {
    const hint = (anyErr.hint as string) || (anyErr.message as string) || ''
    return { code: 'validation', message: hint || 'بيانات غير صالحة. يرجى مراجعة المدخلات.' }
  }
  if (status === 400 || code === '400') {
    return { code: 'validation', message: (anyErr.message as string) || 'طلب غير صالح.' }
  }
  if (status === 500 || code === '500' || code === 'server_error') {
    return { code: 'server_error', message: 'خطأ في الخادم. يرجى المحاولة لاحقاً.' }
  }
  if (status === 0 || code === '0' || code === 'fetch_failed') {
    return { code: 'network', message: 'فشل الاتصال بالخادم. تحقق من اتصالك بالإنترنت.' }
  }

  return {
    code: 'unknown',
    message: (anyErr.message as string) || (anyErr.msg as string) || 'حدث خطأ غير متوقع.',
    details: anyErr
  }
}

interface UseApiErrorOptions {
  onError?: (error: ApiError) => void
  onSuccess?: () => void
}

export function useApiError(options: UseApiErrorOptions = {}) {
  const createNotification = useNotificationStore((s) => s.createNotification)
  const [isLoading, setIsLoading] = useState(false)

  const handleError = useCallback((err: unknown): ApiError => {
    const apiError = classifyError(err)
    if (options.onError) {
      options.onError(apiError)
    } else {
      createNotification({
        title: 'خطأ',
        body: apiError.message,
        type: 'error'
      })
    }
    return apiError
  }, [createNotification, options.onError])

  const withErrorHandling = useCallback(async <T>(
    fn: () => Promise<T>
  ): Promise<T | null> => {
    setIsLoading(true)
    try {
      const result = await fn()
      options.onSuccess?.()
      return result
    } catch (err) {
      handleError(err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [handleError, options.onSuccess])

  return { handleError, withErrorHandling, isLoading, setIsLoading }
}
