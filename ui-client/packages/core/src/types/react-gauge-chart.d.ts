declare module 'react-gauge-chart' {
  import type { FC } from 'react'

  export type GaugeChartProps = {
    id: string
    className?: string
    style?: React.CSSProperties
    marginInPercent?: number
    cornerRadius?: number
    nrOfLevels?: number
    percent?: number
    arcPadding?: number
    arcWidth?: number
    colors?: string[]
    textColor?: string
    needleColor?: string
    needleBaseColor?: string
    hideText?: boolean
    arcsLength?: number[]
    animate?: boolean
    animDelay?: number
    animateDuration?: number
    formatTextValue?: (value: string) => string
    textComponent?: React.ReactElement
    textComponentContainerClassName?: string
    needleScale?: number
    customNeedleComponent?: React.ReactElement
    customNeedleComponentClassName?: string
    customNeedleStyle?: React.CSSProperties
  }

  const GaugeChart: FC<GaugeChartProps>
  export default GaugeChart
}
