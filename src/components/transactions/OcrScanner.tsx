import { useState, useRef } from 'react'
import { Scan, UploadCloud, X, CheckCircle, Loader2 } from 'lucide-react'

interface OcrScannerProps {
  onScanComplete: (data: { amount: number; description: string; type: string }) => void
}

export function OcrScanner({ onScanComplete }: OcrScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [scanSuccess, setScanSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show image preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setIsScanning(true)
    setScanSuccess(false)

    // Simulate OCR scanning process
    setTimeout(() => {
      setIsScanning(false)
      setScanSuccess(true)
      
      // Simulated extracted data
      // In a real app, we would use Tesseract.js or Google Vision API here
      const mockExtractedData = {
        amount: Math.floor(Math.random() * 500) + 50.5,
        description: 'فاتورة مشتريات (تم استخراجها تلقائياً عبر OCR)',
        type: 'expense'
      }

      onScanComplete(mockExtractedData)
    }, 3000)
  }

  const reset = () => {
    setPreviewUrl(null)
    setIsScanning(false)
    setScanSuccess(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="mb-6 card-elevated overflow-hidden border-2 border-dashed border-primary/30 bg-primary/5 transition-all hover:bg-primary/10">
      {!previewUrl ? (
        <div 
          className="p-8 text-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
            <Scan className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-primary mb-2">القراءة الآلية للفواتير (OCR)</h3>
          <p className="text-sm text-muted-foreground mb-4">
            قم برفع صورة الفاتورة وسيقوم الذكاء الاصطناعي باستخراج المبلغ والبيانات تلقائياً.
          </p>
          <button type="button" className="btn-primary inline-flex items-center gap-2">
            <UploadCloud className="w-4 h-4" /> اختر صورة
          </button>
        </div>
      ) : (
        <div className="relative p-4 flex flex-col items-center">
          <button 
            type="button"
            onClick={reset}
            className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-destructive/10 hover:text-destructive z-10"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="relative w-full max-w-sm rounded-lg overflow-hidden shadow-lg border border-border">
            <img src={previewUrl} alt="Invoice preview" className="w-full h-auto object-cover max-h-[300px] opacity-80" />
            
            {/* Scanning Laser Animation */}
            {isScanning && (
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_15px_3px_rgba(59,130,246,0.8)] animate-scan-laser" />
                <div className="absolute inset-0 bg-primary/10 animate-pulse" />
              </div>
            )}
            
            {scanSuccess && (
              <div className="absolute inset-0 bg-success/20 flex flex-col items-center justify-center backdrop-blur-sm">
                <CheckCircle className="w-16 h-16 text-success bg-background rounded-full" />
                <p className="mt-2 font-bold text-white drop-shadow-md text-lg">تم الاستخراج بنجاح!</p>
              </div>
            )}
          </div>

          {isScanning && (
            <div className="mt-4 flex items-center gap-3 text-primary font-medium">
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري تحليل الفاتورة واستخراج الأرقام...
            </div>
          )}
        </div>
      )}
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        className="hidden" 
      />

      <style>{`
        @keyframes scan-laser {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan-laser {
          animation: scan-laser 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
