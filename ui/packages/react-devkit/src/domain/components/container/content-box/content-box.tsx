import type { ReactElement, ReactNode } from 'react'
import './content-box.scss'

type ContentBoxProps = {
  /** Content to display inside the box */
  children?: ReactNode
  /** Optional title to display at the top */
  title?: string
  /** Additional CSS class name */
  className?: string
}

/**
 * Content Box Component
 *
 * A container component with optional title for displaying content sections.
 *
 * @example
 * ```tsx
 * <ContentBox title="Power Distribution">
 *   <p>Power data...</p>
 * </ContentBox>
 * ```
 */
export const ContentBox = ({ children, title, className }: ContentBoxProps): ReactElement => (
  <div className={`mdk-content-box ${className || ''}`.trim()}>
    {title && <h3 className="mdk-content-box__title">{title}</h3>}
    <div className="mdk-content-box__content">{children}</div>
  </div>
)
