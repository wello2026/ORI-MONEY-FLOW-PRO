import { useState, useEffect } from 'react'
import { Fingerprint, X, ShieldCheck } from 'lucide-react'

interface BiometricAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  amount?: number
}

export function BiometricAuthModal({ isOpen, onClose, onSuccess, amount }: BiometricAuthModalProps) {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleScan = () => {
    setStatus('scanning')
    // Simulate biometric scan
    setTimeout(() => {
      setStatus('success')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)
    }, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-background w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
          <h3 className="font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            توثيق أمني مطلوب
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8 flex flex-col items-center text-center">
          <p className="text-muted-foreground mb-6">
            هذه المعاملة الحساسة تتطلب توثيقاً متقدماً. يرجى تأكيد هويتك باستخدام البصمة الحيوية (Biometric).
          </p>
          
          <button 
            onClick={handleScan}
            disabled={status !== 'idle'}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${
              status === 'idle' ? 'bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)]' :
              status === 'scanning' ? 'bg-primary/20 text-primary scale-110 shadow-[0_0_30px_rgba(59,130,246,0.6)]' :
              status === 'success' ? 'bg-success/20 text-success scale-100 shadow-[0_0_20px_rgba(16,185,129,0.5)]' :
              'bg-error/20 text-error'
            }`}
          >
            {status === 'scanning' && (
              <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
            )}
            
            <Fingerprint className={`w-12 h-12 ${status === 'scanning' ? 'animate-pulse' : ''}`} />
            
            {status === 'scanning' && (
              <div className="absolute top-0 left-0 w-full h-1/2 bg-primary/20 rounded-t-full animate-scan-vertical" />
            )}
          </button>

          <div className="h-6">
            {status === 'idle' && <span className="text-sm font-medium">اضغط لإجراء المسح الحيوي</span>}
            {status === 'scanning' && <span className="text-sm font-medium text-primary">جاري التحقق من الهوية...</span>}
            {status === 'success' && <span className="text-sm font-bold text-success">تم التحقق بنجاح!</span>}
            {status === 'error' && <span className="text-sm font-bold text-error">فشل التحقق، حاول مرة أخرى</span>}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes scan-vertical {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        .animate-scan-vertical {
          animation: scan-vertical 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
