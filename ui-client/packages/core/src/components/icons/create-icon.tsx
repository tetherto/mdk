import type { ForwardRefExoticComponent, RefAttributes } from 'react'
import { forwardRef } from 'react'

import type { CreateIconOptions, IconProps } from './types'

export function createIcon(
  options: CreateIconOptions,
): ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>> {
  const { displayName, viewBox, defaultWidth = 24, defaultHeight = 24, path } = options

  const Icon = forwardRef<SVGSVGElement, IconProps>(
    ({ size, width, height, color = 'currentColor', style, ...rest }, ref) => {
      const resolvedWidth = width ?? size ?? defaultWidth
      const resolvedHeight = height ?? size ?? defaultHeight
      const children = typeof path === 'function' ? path({ color }) : path

      return (
        <svg
          ref={ref}
          xmlns="http://www.w3.org/2000/svg"
          width={resolvedWidth}
          height={resolvedHeight}
          viewBox={viewBox}
          fill="none"
          aria-hidden="true"
          style={style}
          {...rest}
        >
          {children}
        </svg>
      )
    },
  )

  Icon.displayName = displayName

  return Icon
}
