import type { ReactNode, SVGAttributes } from 'react'

export type IconProps = {
  /** Sets both width and height */
  size?: number | string
  /** Only affects single-color icons (default: 'currentColor') */
  color?: string
  children?: never
} & SVGAttributes<SVGElement>

export type CreateIconOptions = {
  displayName: string
  viewBox: string
  defaultWidth?: number
  defaultHeight?: number
  multiColor?: boolean
  path: ReactNode | ((props: { color: string }) => ReactNode)
}
