import type { ReactElement } from 'react'
import { BitMainImmersionControlBox } from '../control-box/bitmain-immersion-control-box'
import './bitmain-immersion-compact-unit-control-box.scss'

type BitMainImmersionCompactUnitControlBoxProps = {
  /** Box title */
  title?: string
  /** Whether the unit is opening */
  opening?: boolean
  /** Whether the unit is closing */
  closing?: boolean
  /** Whether the unit is open */
  isOpen?: boolean
  /** Custom className */
  className?: string
}

/**
 * BitMain Immersion Compact Unit Control Box Component
 *
 * A compact control box showing unit open/close status with transition states.
 *
 * @example
 * ```tsx
 * <BitMainImmersionCompactUnitControlBox
 *   title="Valve Control"
 *   isOpen={true}
 * />
 * ```
 */
export const BitMainImmersionCompactUnitControlBox = ({
  title,
  opening = false,
  closing = false,
  isOpen = false,
  className,
}: BitMainImmersionCompactUnitControlBoxProps): ReactElement => {
  return (
    <BitMainImmersionControlBox
      secondary
      title={title}
      className={className}
      rightContent={
        <div className="mdk-bitmain-immersion-compact-unit-control-box">
          <div
            className={`mdk-bitmain-immersion-compact-unit-control-box__primary ${
              isOpen
                ? 'mdk-bitmain-immersion-compact-unit-control-box__primary--open'
                : 'mdk-bitmain-immersion-compact-unit-control-box__primary--closed'
            }`}
          >
            {isOpen ? 'Open' : 'Closed'}
          </div>

          {opening && (
            <div className="mdk-bitmain-immersion-compact-unit-control-box__transition">
              Opening
            </div>
          )}

          {closing && (
            <div className="mdk-bitmain-immersion-compact-unit-control-box__transition">
              Closing
            </div>
          )}
        </div>
      }
    />
  )
}
