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
  /** Custom arc-segment proportions (auto-normalised); overrides `nrOfLevels`. */
  arcsLength?: number[]
  /** Hide the needle + hub (e.g. for a progress-style gauge). */
  hideNeedle?: boolean
  /** Format the centre label from the clamped fraction (0–1). */
  formatTextValue?: (percent: number) => string
}
