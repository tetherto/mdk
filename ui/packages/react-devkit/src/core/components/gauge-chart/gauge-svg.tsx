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
    },
    ref,
  ) => {
    const safePercent = clampToUnitRange(percent)
    const segmentCount = Math.max(1, Math.floor(nrOfLevels))
    const innerRadius = GAUGE_OUTER_RADIUS * (1 - clampToUnitRange(arcWidth))
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

    const segmentSpanRadians = Math.PI / segmentCount
    const halfSegmentPaddingRadians = GAUGE_SEGMENT_PADDING_RADIANS / 2
    const segments = Array.from({ length: segmentCount }, (_, index) => {
      const startAngleRadians = Math.PI - index * segmentSpanRadians
      const endAngleRadians = Math.PI - (index + 1) * segmentSpanRadians

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
            {percentLabel}
          </text>
        )}
      </svg>
    )
  },
)
GaugeSvg.displayName = 'GaugeSvg'
