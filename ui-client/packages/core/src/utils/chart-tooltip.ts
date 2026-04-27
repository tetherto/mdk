import type { Chart, ChartType, TooltipItem, TooltipModel, TooltipOptions } from 'chart.js'
import { COLOR } from '../constants/colors'

export type ChartTooltipConfig = {
  /** Color for label text. Use 'dataset' to match dataset border color. Defaults to COLOR.WHITE_ALPHA_05 */
  labelColor?: string | 'dataset'
  /** Color for value text. Use 'dataset' to match dataset border color. Defaults to 'dataset' */
  valueColor?: string | 'dataset'
  /** Format function for the displayed value. Receives raw value and the tooltip item context. */
  valueFormatter?: (value: number, item: TooltipItem<any>) => string
  /** Background color of the tooltip (default: COLOR.DARK_BLACK / #10100F) */
  backgroundColor?: string
  /** Font size in pixels (default: 12) */
  fontSize?: number
  /** Minimum width in pixels (default: 200) */
  minWidth?: number
  /** Show the chart title row in the tooltip (default: false) */
  showTitle?: boolean
  /** Tooltip interaction mode (default: 'index'). Use 'nearest' for doughnut/pie charts. */
  mode?: 'index' | 'nearest' | 'point' | 'dataset'
  /** Whether tooltip requires direct intersection (default: false) */
  intersect?: boolean
}

const TOOLTIP_ATTR = 'data-msdk-chart-tooltip'
const TRACKING_ATTR = 'data-msdk-mouse'
const GAP = 10
const OFFSET = 5

const positionTooltip = (container: HTMLElement, cursorX: number, cursorY: number): void => {
  const tooltipEl = container.querySelector<HTMLDivElement>(`[${TOOLTIP_ATTR}]`)
  if (!tooltipEl || tooltipEl.style.opacity === '0') return

  const tooltipWidth = tooltipEl.offsetWidth
  const tooltipHeight = tooltipEl.offsetHeight
  const containerWidth = container.offsetWidth
  const containerHeight = container.offsetHeight

  const fitsRight = cursorX + GAP + tooltipWidth <= containerWidth - OFFSET
  let left = fitsRight ? cursorX + GAP : cursorX - tooltipWidth - GAP

  if (left < OFFSET) left = OFFSET
  if (left + tooltipWidth > containerWidth - OFFSET) left = containerWidth - tooltipWidth - OFFSET

  let top = cursorY
  if (top + tooltipHeight > containerHeight - OFFSET) top = containerHeight - tooltipHeight - OFFSET
  if (top < OFFSET) top = OFFSET

  tooltipEl.style.left = `${left}px`
  tooltipEl.style.top = `${top}px`
}

// Listeners are intentionally not cleaned up — they're bound to the container element,
// which React owns. When the container is removed from the DOM, the element and its
// listeners are garbage-collected together. The data-attribute guard prevents double-binding.
const ensureMouseTracking = (container: HTMLElement): void => {
  if (container.getAttribute(TRACKING_ATTR)) return
  container.setAttribute(TRACKING_ATTR, '1')

  container.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = container.getBoundingClientRect()
    positionTooltip(container, e.clientX - rect.left, e.clientY - rect.top)
  })

  container.addEventListener('mouseleave', () => {
    const tooltipEl = container.querySelector<HTMLDivElement>(`[${TOOLTIP_ATTR}]`)
    if (tooltipEl) tooltipEl.style.opacity = '0'
  })
}

const getOrCreateTooltipEl = (chart: Chart): HTMLDivElement => {
  const canvas = chart.canvas
  const container = canvas.parentElement
  if (!container) throw new Error('Chart canvas must have a parent element')

  let tooltipEl = container.querySelector<HTMLDivElement>(`[${TOOLTIP_ATTR}]`)

  if (!tooltipEl) {
    tooltipEl = document.createElement('div')
    tooltipEl.setAttribute(TOOLTIP_ATTR, '')
    tooltipEl.style.position = 'absolute'
    tooltipEl.style.pointerEvents = 'none'
    tooltipEl.style.transition = 'opacity 0.15s ease'
    container.style.position = 'relative'
    container.appendChild(tooltipEl)
  }

  ensureMouseTracking(container)
  return tooltipEl
}

const resolveDatasetColor = (item: TooltipItem<any>): string => {
  const ds = item.dataset
  const bg = ds.backgroundColor
  const border = ds.borderColor

  if (Array.isArray(bg)) return String(bg[item.dataIndex] ?? bg[0] ?? '#888')
  if (Array.isArray(border)) return String(border[item.dataIndex] ?? border[0] ?? '#888')

  const raw = border ?? bg ?? '#888'
  if (typeof raw === 'string') return raw
  return '#888'
}

/**
 * Creates a Chart.js external tooltip handler matching the miningOS design.
 *
 * The tooltip follows the real mouse cursor (not data points) via a mousemove
 * listener on the chart container. Content is updated by Chart.js's external
 * tooltip callback; positioning is driven entirely by the mouse.
 *
 * @example
 * ```tsx
 * <LineChart
 *   data={data}
 *   tooltip={{ valueFormatter: (v) => `${v.toFixed(2)} PH/s` }}
 * />
 * ```
 */
export const buildChartTooltip = (
  config: ChartTooltipConfig = {},
): Partial<TooltipOptions<ChartType>> => {
  const {
    labelColor = COLOR.WHITE_ALPHA_05,
    valueColor = 'dataset',
    valueFormatter,
    backgroundColor = COLOR.DARK_BLACK,
    fontSize = 12,
    minWidth = 200,
    showTitle = false,
    mode = 'index',
    intersect = false,
  } = config

  const externalHandler = (context: { chart: Chart; tooltip: TooltipModel<any> }): void => {
    const { chart, tooltip } = context
    const tooltipEl = getOrCreateTooltipEl(chart)

    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = '0'
      return
    }

    let innerHtml = '<div style="display: flex; flex-direction: column; gap: 8px;">'

    if (showTitle && tooltip.title?.length) {
      const titleText = tooltip.title.join(' ')
      innerHtml += `<div style="
        font-size: ${fontSize - 2}px;
        color: ${COLOR.WHITE_ALPHA_05};
        opacity: 0.7;
      ">${titleText}</div>`
    }

    const bodyItems = tooltip.dataPoints ?? []
    for (const item of bodyItems) {
      const dsColor = resolveDatasetColor(item)
      const resolvedLabelColor = labelColor === 'dataset' ? dsColor : labelColor
      const resolvedValueColor = valueColor === 'dataset' ? dsColor : valueColor

      const label = item.dataset.label || item.label || ''
      const rawValue =
        typeof item.parsed === 'object'
          ? (item.parsed.y ?? item.parsed.x ?? item.parsed ?? 0)
          : (item.parsed ?? 0)
      const formattedValue = valueFormatter
        ? valueFormatter(Number(rawValue), item)
        : String(rawValue)

      innerHtml += `<div style="
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-size: ${fontSize}px;
        line-height: ${fontSize + 4}px;
        gap: 16px;
      ">
        <span style="color: ${resolvedLabelColor}; white-space: nowrap;">${label}</span>
        <span style="color: ${resolvedValueColor}; white-space: nowrap; font-weight: 600;">${formattedValue}</span>
      </div>`
    }

    innerHtml += '</div>'
    tooltipEl.innerHTML = innerHtml

    Object.assign(tooltipEl.style, {
      opacity: '1',
      background: backgroundColor,
      color: COLOR.WHITE_ALPHA_05,
      clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 0 100%, 0 12px)',
      padding: '14px',
      fontFamily: `'JetBrains Mono', monospace`,
      fontSize: `${fontSize}px`,
      minWidth: `${minWidth}px`,
      zIndex: '10',
    })
  }

  return {
    enabled: false,
    external: externalHandler,
    mode,
    intersect,
  }
}
