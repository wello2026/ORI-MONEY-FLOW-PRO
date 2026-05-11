import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Button } from './Button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="glass-card p-8 max-w-md w-full text-center" dir="rtl">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-error/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-error" />
            </div>
            <h2 className="text-lg font-black text-foreground mb-2">حدث خطأ غير متوقع</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              عذراً، حدث خطأ أثناء تحميل هذا القسم. يمكنك إعادة المحاولة أو العودة للصفحة الرئيسية.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReset} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
              >
                الرئيسية
              </Button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-right">
                <summary className="text-xs text-muted-foreground cursor-pointer mb-2">
                  تفاصيل الخطأ (وضع التطوير فقط)
                </summary>
                <pre className="text-xs bg-destructive/10 text-destructive p-3 rounded-lg overflow-auto max-h-48">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}