import { forwardRef, useEffect, useState } from 'react'
import { UNITS } from '../../constants'
import {
  DEFAULT_GAUGE_NEEDLE_COLOR,
  DEFAULT_GAUGE_TEXT_COLOR,
  GAUGE_CENTER_X,
  GAUGE_CENTER_Y,
  GAUGE_NEEDLE_HUB_RADIUS,
  GAUGE_NEEDLE_SWEEP_DURATION_MS,
  GAUGE_NEEDLE_TIP_INSET,
  GAUGE_OUTER_RADIUS,
  GAUGE_PERCENT_LABEL_FONT_SIZE,
  GAUGE_PERCENT_LABEL_VERTICAL_OFFSET,
  GAUGE_SEGMENT_CORNER_RADIUS,
  GAUGE_SEGMENT_FALLBACK_COLOR,
  GAUGE_SEGMENT_PADDING_RADIANS,
  GAUGE_VIEWBOX_HEIGHT,
  GAUGE_VIEWBOX_WIDTH,
} from './constants'
import type { GaugeSvgProps } from './types'
import {
  buildArcSegmentPath,
  clampToUnitRange,
  easeOutCubic,
  polarToCartesian,
  resolveSegmentColors,
} from './utils'

export type { GaugeSvgProps } from './types'

export const GaugeSvg = forwardRef<SVGSVGElement, GaugeSvgProps>(
  (
    {
      id,
      colors,
      percent,
      hideText,
      arcWidth,
      nrOfLevels,
      textColor = DEFAULT_GAUGE_TEXT_COLOR,
      needleColor = DEFAULT_GAUGE_NEEDLE_COLOR,
      arcsLength,
      hideNeedle = false,
      formatTextValue,
    },
    ref,
  ) => {
    const safePercent = clampToUnitRange(percent)
    const innerRadius = GAUGE_OUTER_RADIUS * (1 - clampToUnitRange(arcWidth))

    // Segment proportions: custom `arcsLength` (normalised) when provided,
    // otherwise `nrOfLevels` even segments.
    const positiveArcs = arcsLength?.filter((length) => length > 0) ?? []
    const arcsTotal = positiveArcs.reduce((sum, length) => sum + length, 0)
    const proportions =
      positiveArcs.length > 0 && arcsTotal > 0
        ? positiveArcs.map((length) => length / arcsTotal)
        : Array.from({ length: Math.max(1, Math.floor(nrOfLevels)) }, () => 0)
    const segmentCount = proportions.length
    const evenShare = 1 / segmentCount
    const normalisedProportions =
      arcsTotal > 0 && positiveArcs.length > 0 ? proportions : proportions.map(() => evenShare)
    const segmentColors = resolveSegmentColors(colors, segmentCount)

    const [needlePercent, setNeedlePercent] = useState(0)

    useEffect(() => {
      let frame = 0
      const start = performance.now()

      const tick = (now: number): void => {
        const timeIndex = Math.min(1, (now - start) / GAUGE_NEEDLE_SWEEP_DURATION_MS)
        setNeedlePercent(safePercent * easeOutCubic(timeIndex))
        if (timeIndex < 1) frame = requestAnimationFrame(tick)
      }

      frame = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(frame)
    }, [safePercent])

    const halfSegmentPaddingRadians = GAUGE_SEGMENT_PADDING_RADIANS / 2
    let cumulativeFraction = 0
    const segments = normalisedProportions.map((proportion, index) => {
      const startFraction = cumulativeFraction
      cumulativeFraction += proportion
      const startAngleRadians = Math.PI * (1 - startFraction)
      const endAngleRadians = Math.PI * (1 - cumulativeFraction)

      return {
        d: buildArcSegmentPath(
          innerRadius,
          GAUGE_OUTER_RADIUS,
          startAngleRadians - halfSegmentPaddingRadians,
          endAngleRadians + halfSegmentPaddingRadians,
          GAUGE_SEGMENT_CORNER_RADIUS,
        ),
        color: segmentColors[index] ?? GAUGE_SEGMENT_FALLBACK_COLOR,
        key: `${id}-seg-${index}`,
      }
    })

    const needleAngleRadians = Math.PI * (1 - needlePercent)
    const needleLength = innerRadius - GAUGE_NEEDLE_TIP_INSET
    const needleTip = polarToCartesian(needleLength, needleAngleRadians)
    const needleBaseLeft = polarToCartesian(
      GAUGE_NEEDLE_HUB_RADIUS,
      needleAngleRadians - Math.PI / 2,
    )
    const needleBaseRight = polarToCartesian(
      GAUGE_NEEDLE_HUB_RADIUS,
      needleAngleRadians + Math.PI / 2,
    )

    const titleId = `${id}-title`
    const percentLabel = `${Math.round(safePercent * 100)}${UNITS.PERCENT}`

    return (
      <svg
        ref={ref}
        role="img"
        aria-labelledby={titleId}
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${GAUGE_VIEWBOX_WIDTH} ${GAUGE_VIEWBOX_HEIGHT}`}
      >
        <title id={titleId}>{`Gauge: ${percentLabel}`}</title>
        <g>
          {segments.map((segment) => (
            <path key={segment.key} d={segment.d} fill={segment.color} />
          ))}
        </g>
        {!hideNeedle && (
          <g aria-hidden="true">
            <polygon
              points={[
                `${needleTip.x.toFixed(3)},${needleTip.y.toFixed(3)}`,
                `${needleBaseLeft.x.toFixed(3)},${needleBaseLeft.y.toFixed(3)}`,
                `${needleBaseRight.x.toFixed(3)},${needleBaseRight.y.toFixed(3)}`,
              ].join(' ')}
              fill={needleColor}
            />
            <circle
              cx={GAUGE_CENTER_X}
              cy={GAUGE_CENTER_Y}
              r={GAUGE_NEEDLE_HUB_RADIUS}
              fill={needleColor}
            />
          </g>
        )}
        {!hideText && (
          <text
            x={GAUGE_CENTER_X}
            y={GAUGE_CENTER_Y + GAUGE_PERCENT_LABEL_VERTICAL_OFFSET}
            fill={textColor}
            fontSize={GAUGE_PERCENT_LABEL_FONT_SIZE}
            fontFamily="inherit"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {formatTextValue ? formatTextValue(safePercent) : percentLabel}
          </text>
        )}
      </svg>
    )
  },
)
GaugeSvg.displayName = 'GaugeSvg'
