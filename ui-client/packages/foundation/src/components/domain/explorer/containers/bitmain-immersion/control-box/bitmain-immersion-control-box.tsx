import type { ReactElement, ReactNode } from 'react'
import './bitmain-immersion-control-box.scss'

type BitMainImmersionControlBoxProps = {
  /** Box title */
  title?: string
  /** Content for left column */
  leftContent?: ReactNode
  /** Content for right column */
  rightContent?: ReactNode
  /** Content for bottom row */
  bottomContent?: ReactNode
  /** Secondary variant (no border) */
  secondary?: boolean
  /** Custom className */
  className?: string
}

/**
 * BitMain Immersion Control Box Component
 *
 * A flexible container component with configurable columns and optional bottom content.
 * Used for displaying control information in a structured layout.
 *
 * @example
 * ```tsx
 * <BitMainImmersionControlBox
 *   title="Power Status"
 *   leftContent={<div>Left side content</div>}
 *   rightContent={<div>Right side content</div>}
 * />
 *
 * <BitMainImmersionControlBox
 *   title="Temperature"
 *   leftContent={<div>Current: 35°C</div>}
 *   rightContent={<div>Target: 30°C</div>}
 *   bottomContent={<div>Additional info</div>}
 * />
 *
 * <BitMainImmersionControlBox
 *   secondary
 *   leftContent={<div>No border variant</div>}
 * />
 * ```
 */
export const BitMainImmersionControlBox = ({
  title,
  leftContent,
  rightContent,
  bottomContent,
  secondary = false,
  className,
}: BitMainImmersionControlBoxProps): ReactElement => {
  return (
    <div
      className={`mdk-bitmain-immersion-control-box ${
        secondary ? 'mdk-bitmain-immersion-control-box--secondary' : ''
      } ${className || ''}`}
    >
      <div className="mdk-bitmain-immersion-control-box__top">
        <div
          className={`mdk-bitmain-immersion-control-box__left ${
            secondary ? 'mdk-bitmain-immersion-control-box__left--secondary' : ''
          }`}
        >
          {title && <h3 className="mdk-bitmain-immersion-control-box__title">{title}</h3>}
          {leftContent}
        </div>
        <div
          className={`mdk-bitmain-immersion-control-box__right ${
            secondary ? 'mdk-bitmain-immersion-control-box__right--secondary' : ''
          }`}
        >
          {rightContent}
        </div>
      </div>
      {bottomContent && (
        <div className="mdk-bitmain-immersion-control-box__bottom">{bottomContent}</div>
      )}
    </div>
  )
}
