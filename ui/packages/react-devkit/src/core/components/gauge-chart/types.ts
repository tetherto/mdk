export type CartesianPoint = { x: number; y: number }

export type RgbColor = { r: number; g: number; b: number }

export type GaugeSvgProps = {
  id: string
  percent: number
  colors: string[]
  arcWidth: number
  hideText: boolean
  nrOfLevels: number
  textColor?: string
  needleColor?: string
}
