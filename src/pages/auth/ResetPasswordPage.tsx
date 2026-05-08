import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { ROUTES } from '@/lib/constants'

const resetSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح')
})

type ResetForm = z.infer<typeof resetSchema>

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema)
  })

  const onSubmit = async (data: ResetForm) => {
    if (!isSupabaseConfigured()) {
      setError('Supabase غير مُعدّة')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/update-password`
      })

      if (error) throw error
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل في إرسال رابط إعادة التعيين')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/5">
        <div className="w-full max-w-md glass-card p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-bold mb-2">تم إرسال الرابط</h2>
          <p className="text-muted-foreground mb-4">تحقق من بريدك الإلكتروني لإعادة تعيين كلمة المرور</p>
          <button onClick={() => navigate(ROUTES.LOGIN)} className="btn-primary">
            العودة لتسجيل الدخول
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/5">
      <div className="w-full max-w-md">
        <button onClick={() => navigate(ROUTES.LOGIN)} className="flex items-center gap-2 text-muted-foreground mb-6">
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span>العودة لتسجيل الدخول</span>
        </button>

        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-2">استعادة كلمة المرور</h2>
          <p className="text-muted-foreground mb-6">أدخل بريدك الإلكتروني لإرسال رابط الاستعادة</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  {...register('email')}
                  className="input-field pr-10"
                  placeholder="أدخل البريد الإلكتروني"
                  dir="ltr"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !isSupabaseConfigured()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
              إرسال رابط الاستعادة
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}