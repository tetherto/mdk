import { HomeIcon } from '@radix-ui/react-icons'

import { Button } from '../button'
import { cn } from '../../utils'
import { forwardRef } from 'react'

export type NotFoundPageProps = {
  /**
   * Callback fired when the "Go Home" button is clicked
   */
  onGoHome?: VoidFunction
  /**
   * Page title
   * @default "404"
   */
  title?: string
  /**
   * Message displayed below the title
   * @default "The page you are looking for does not exist."
   */
  message?: string
  /**
   * Additional CSS class name
   */
  className?: string
}

/**
 * Full-page 404 view with a heading, supporting copy, and a primary call-to-action back to safety.
 *
 * @example
 * ```tsx
 * <NotFoundPage onGoHome={() => navigate('/')} />
 * <NotFoundPage title="Page Not Found" message="Check the URL and try again." />
 * ```
 * @category pages
 * @domain generic
 * @tier agent-ready
 */
const NotFoundPage = forwardRef<HTMLDivElement, NotFoundPageProps>(
  (
    {
      onGoHome,
      title = '404',
      message = 'The page you are looking for does not exist.',
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div ref={ref} className={cn('mdk-not-found-page', className)} {...props}>
        <div className="mdk-not-found-page__title">{title}</div>
        <div className="mdk-not-found-page__message">{message}</div>
        {onGoHome && (
          <Button
            variant="primary"
            icon={<HomeIcon />}
            onClick={onGoHome}
            className="mdk-not-found-page__button"
          >
            Go Home
          </Button>
        )}
      </div>
    )
  },
)
NotFoundPage.displayName = 'NotFoundPage'

export { NotFoundPage }
