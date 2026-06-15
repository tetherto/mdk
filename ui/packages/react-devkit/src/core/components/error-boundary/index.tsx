import { Component, type ComponentType, type ErrorInfo, type FC, type ReactNode } from 'react'
import { cn } from '../../utils'

// --- ErrorBoundary (class component) ---

export type ErrorBoundaryProps = {
  /**
   * Fallback UI to render when an error is caught.
   * If not provided, a default error panel with expandable stack trace is shown.
   */
  fallback?: ReactNode
  /**
   * Name of the wrapped component (shown in the default fallback)
   */
  componentName?: string
  /**
   * Callback fired when an error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /**
   * Additional CSS class name for the default fallback container
   */
  className?: string
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error boundary component that catches React rendering errors
 * and displays a fallback UI.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 * @category misc
 * @domain generic
 * @tier agent-ready
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static displayName = 'ErrorBoundary'

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorInfo } = this.state
      const { componentName, className } = this.props

      return (
        <div className={cn('mdk-error-boundary', className)}>
          <div className="mdk-error-boundary__title">
            {componentName && (
              <>
                Error in <span className="mdk-error-boundary__component-name">{componentName}</span>
              </>
            )}
            {!componentName && 'Something went wrong'}
          </div>
          <div className="mdk-error-boundary__message">
            {error?.message ?? 'An unexpected error occurred'}
          </div>
          {errorInfo?.componentStack && (
            <details className="mdk-error-boundary__details">
              <summary className="mdk-error-boundary__summary">Stack trace</summary>
              <pre className="mdk-error-boundary__stack">
                <code>{errorInfo.componentStack}</code>
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

// --- withErrorBoundary HOC ---

/**
 * Higher-order component that wraps a component with an ErrorBoundary.
 *
 * @example
 * ```tsx
 * const SafeChart = withErrorBoundary(Chart, 'Chart', (error) => console.error(error))
 * ```
 */
const withErrorBoundary = <P extends object>(
  WrappedComponent: ComponentType<P>,
  componentName?: string,
  onError?: (error: Error, errorInfo: ErrorInfo) => void,
): FC<P> => {
  const WithErrorBoundary: FC<P> = (props) => (
    <ErrorBoundary componentName={componentName} onError={onError}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )
  WithErrorBoundary.displayName = `withErrorBoundary(${componentName ?? WrappedComponent.displayName ?? 'Component'})`
  return WithErrorBoundary
}

export { ErrorBoundary, withErrorBoundary }
