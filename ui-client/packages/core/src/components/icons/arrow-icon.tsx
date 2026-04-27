import React from 'react'
import { createIcon } from './create-icon'
import type { IconProps } from './types'

const ArrowIconBase = createIcon({
  displayName: 'ArrowIconBase',
  viewBox: '0 0 24 24',
  defaultWidth: 24,
  defaultHeight: 24,
  path: ({ color }) => (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.7241 15.3478C17.5522 15.5132 17.3216 15.6036 17.0831 15.5991C16.8446 15.5946 16.6176 15.4956 16.4521 15.3238L12.0001 10.5982L7.5481 15.3238C7.4672 15.413 7.3691 15.4851 7.2599 15.5357C7.1506 15.5864 7.0322 15.6146 6.9119 15.6186C6.7915 15.6227 6.6715 15.6026 6.5591 15.5594C6.4466 15.5163 6.3439 15.451 6.2572 15.3674C6.1704 15.2839 6.1013 15.1838 6.054 15.073C6.0066 14.9623 5.9819 14.8431 5.9815 14.7227C5.981 14.6022 6.0047 14.4829 6.0512 14.3718C6.0977 14.2607 6.166 14.16 6.2521 14.0758L11.3521 8.6758C11.436 8.5887 11.5367 8.5194 11.648 8.4721C11.7594 8.4248 11.8791 8.4004 12.0001 8.4004C12.1211 8.4004 12.2408 8.4248 12.3521 8.4721C12.4635 8.5194 12.5641 8.5887 12.6481 8.6758L17.7481 14.0758C17.9135 14.2477 18.0039 14.4783 17.9994 14.7168C17.9949 14.9553 17.8958 15.1823 17.7241 15.3478Z"
      fill={color}
      fillOpacity="0.7"
    />
  ),
})

export type ArrowIconProps = {
  isOpen?: boolean
} & IconProps

export const ArrowIcon = React.forwardRef<SVGSVGElement, ArrowIconProps>(
  ({ isOpen = false, ...props }, ref) => {
    return (
      <ArrowIconBase
        ref={ref}
        style={{
          transition: 'transform 0.3s ease',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
        {...props}
      />
    )
  },
)

ArrowIcon.displayName = 'ArrowIcon'
