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
  /**
   * Which axis distances are measured along. Must be the chart's **index** axis, so a
   * horizontal chart (`indexAxis: 'y'`) needs `'y'` — Chart.js falls back to `'x'` for
   * `mode: 'index'` and never derives this from `indexAxis`, which makes a horizontal
   * tooltip track bar length instead of the row under the cursor.
   * `buildBarChartOptions` sets this for you; leave it unset elsewhere.
   */
  axis?: 'x' | 'y'
}

const TOOLTIP_ATTR = 'data-msdk-chart-tooltip'
const TRACKING_ATTR = 'data-msdk-mouse'
const CURSOR_X_ATTR = 'data-msdk-tooltip-cursor-x'
const CURSOR_Y_ATTR = 'data-msdk-tooltip-cursor-y'
const GAP = 10
const OFFSET = 5

const storeCursor = (container: HTMLElement, cursorX: number, cursorY: number): void => {
  container.setAttribute(CURSOR_X_ATTR, String(cursorX))
  container.setAttribute(CURSOR_Y_ATTR, String(cursorY))
}

const readStoredCursor = (container: HTMLElement): { x: number; y: number } | null => {
  const xAttr = container.getAttribute(CURSOR_X_ATTR)
  const yAttr = container.getAttribute(CURSOR_Y_ATTR)
  if (xAttr == null || yAttr == null) return null
  const x = Number(xAttr)
  const y = Number(yAttr)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

const clearStoredCursor = (container: HTMLElement): void => {
  container.removeAttribute(CURSOR_X_ATTR)
  container.removeAttribute(CURSOR_Y_ATTR)
}

/**
 * Where to put the tooltip, in container coordinates.
 *
 * The real cursor is preferred, and the container's `mousemove` listener keeps it
 * current. That listener is bound the first time the handler runs, which is a frame
 * *after* the move that triggered it — so a chart's very first tooltip has no cursor
 * recorded yet and used to be drawn hidden, leaving the first hover of every chart
 * blank until the mouse moved again. Chart.js' caret covers that one frame: it points
 * at the active element, in canvas pixels, and the next move hands positioning back
 * to the cursor.
 *
 * `tooltip` is typed structurally on purpose — see {@link readIndexAxis}.
 */
const resolveAnchor = (
  container: HTMLElement,
  canvas: HTMLElement,
  tooltip: { caretX?: number; caretY?: number },
): { x: number; y: number } | null => {
  const stored = readStoredCursor(container)
  if (stored) return stored

  const { caretX, caretY } = tooltip
  if (!Number.isFinite(caretX) || !Number.isFinite(caretY)) return null
  // `container` is the canvas' offset parent: the handler gives it `position: relative`.
  return { x: canvas.offsetLeft + (caretX as number), y: canvas.offsetTop + (caretY as number) }
}

/**
 * Hides the tooltip and drops its content.
 *
 * Clearing the children matters as much as the opacity: an empty tooltip cannot be
 * re-shown carrying the previous point's numbers, whatever happens between now and the
 * handler's next run.
 */
const hideTooltip = (tooltipEl: HTMLDivElement): void => {
  tooltipEl.style.opacity = '0'
  tooltipEl.style.visibility = 'hidden'
  tooltipEl.replaceChildren()
}

const positionTooltip = (container: HTMLElement, cursorX: number, cursorY: number): void => {
  const tooltipEl = container.querySelector<HTMLDivElement>(`[${TOOLTIP_ATTR}]`)
  if (!tooltipEl || tooltipEl.style.opacity === '0') return

  tooltipEl.style.visibility = 'hidden'

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
  if (tooltipEl.style.opacity !== '0') tooltipEl.style.visibility = 'visible'
}

// Listeners are intentionally not cleaned up — they're bound to the container element,
// which React owns. When the container is removed from the DOM, the element and its
// listeners are garbage-collected together. The data-attribute guard prevents double-binding.
const ensureMouseTracking = (container: HTMLElement): void => {
  if (container.getAttribute(TRACKING_ATTR)) return
  container.setAttribute(TRACKING_ATTR, '1')

  container.addEventListener(
    'mousemove',
    (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top
      storeCursor(container, cursorX, cursorY)

      const tooltipEl = container.querySelector<HTMLDivElement>(`[${TOOLTIP_ATTR}]`)
      if (!tooltipEl || tooltipEl.childElementCount === 0) return

      // Moving the mouse may reposition a tooltip that is already up, but never raise
      // one the handler has taken down: only the handler knows whether Chart.js still
      // has an active point. Un-hiding here left the tooltip stranded wherever Chart.js
      // had dismissed it — over a padded container's border, say — showing the numbers
      // from the last point the cursor happened to cross.
      if (tooltipEl.style.opacity === '0') return
      positionTooltip(container, cursorX, cursorY)
    },
    { capture: true },
  )

  container.addEventListener('mouseleave', () => {
    clearStoredCursor(container)
    const tooltipEl = container.querySelector<HTMLDivElement>(`[${TOOLTIP_ATTR}]`)
    if (tooltipEl) hideTooltip(tooltipEl)
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
    tooltipEl.style.transition = 'none'
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
 * Reads `indexAxis` off a chart or dataset.
 *
 * This helper and {@link readParsedValue} deliberately read through `unknown` and never
 * name `Chart`, `TooltipItem` or their type arguments. Mentioning those here makes the
 * compiler resolve Chart.js' generic tooltip relationships eagerly, and under
 * `declaration: true` (`tsconfig.build.json`) that surfaces four pre-existing variance
 * errors at the `area-chart`, `bar-chart` and `doughnut-chart` call sites — a build
 * failure the plain `tsc --noEmit` config does not reproduce.
 */
const readIndexAxis = (source: unknown): string | undefined => {
  const axis = (source as { indexAxis?: unknown } | null | undefined)?.indexAxis
  return typeof axis === 'string' ? axis : undefined
}

/** `indexAxis` from the chart's own options, read through `unknown` for the reason above. */
const readChartIndexAxis = (chart: unknown): string | undefined =>
  readIndexAxis((chart as { options?: unknown } | null | undefined)?.options)

/**
 * Reads the datum out of a tooltip item's parsed point.
 *
 * The value sits on whichever axis is *not* the index axis: a horizontal chart
 * (`indexAxis: 'y'`) parses to `{ y: <category index>, x: <value> }`, so reading
 * `parsed.y` first would format the category index. A dataset may override the
 * chart's orientation, so its own `indexAxis` wins. Non-cartesian charts (pie,
 * doughnut) parse to a bare number and fall through unchanged.
 */
const readParsedValue = (
  item: { parsed?: unknown; dataset?: unknown },
  chart: unknown,
): number | string => {
  const parsed: unknown = item.parsed
  if (parsed == null || typeof parsed !== 'object') return (parsed as number | undefined) ?? 0

  const indexAxis = readIndexAxis(item.dataset) ?? readChartIndexAxis(chart)
  const [valueKey, fallbackKey] = indexAxis === 'y' ? (['x', 'y'] as const) : (['y', 'x'] as const)
  const point = parsed as Record<string, number | null | undefined>

  // `r` covers the radial charts (radar, polarArea), which parse to `{ r: <value> }`.
  return point[valueKey] ?? point[fallbackKey] ?? point.r ?? 0
}

/**
 * Creates a Chart.js external tooltip handler matching the MDK design.
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
    axis,
  } = config

  const externalHandler = (context: { chart: Chart; tooltip: TooltipModel<any> }): void => {
    const { chart, tooltip } = context
    const tooltipEl = getOrCreateTooltipEl(chart)

    if (tooltip.opacity === 0) {
      hideTooltip(tooltipEl)
      return
    }

    const wrapper = document.createElement('div')

    wrapper.style.display = 'flex'
    wrapper.style.flexDirection = 'column'
    wrapper.style.gap = '8px'

    if (showTitle && tooltip.title?.length) {
      const titleEl = document.createElement('div')

      titleEl.style.fontSize = `${fontSize - 2}px`
      titleEl.style.color = COLOR.WHITE_ALPHA_05
      titleEl.style.opacity = '0.7'
      titleEl.textContent = tooltip.title.join(' ')

      wrapper.appendChild(titleEl)
    }

    const bodyItems = tooltip.dataPoints ?? []
    for (const item of bodyItems) {
      const dsColor = resolveDatasetColor(item)
      const resolvedLabelColor = labelColor === 'dataset' ? dsColor : labelColor
      const resolvedValueColor = valueColor === 'dataset' ? dsColor : valueColor

      const label = item.dataset.label || item.label || ''
      const rawValue = readParsedValue(item, chart)
      const formattedValue = valueFormatter
        ? valueFormatter(Number(rawValue), item)
        : String(rawValue)

      const row = document.createElement('div')

      row.style.display = 'flex'
      row.style.justifyContent = 'space-between'
      row.style.alignItems = 'baseline'
      row.style.fontSize = `${fontSize}px`
      row.style.lineHeight = `${fontSize + 4}px`
      row.style.gap = '16px'

      const labelSpan = document.createElement('span')

      labelSpan.style.color = resolvedLabelColor
      labelSpan.style.whiteSpace = 'nowrap'
      labelSpan.textContent = String(label)

      const valueSpan = document.createElement('span')

      valueSpan.style.color = resolvedValueColor
      valueSpan.style.whiteSpace = 'nowrap'
      valueSpan.style.fontWeight = '600'
      valueSpan.textContent = formattedValue

      row.appendChild(labelSpan)
      row.appendChild(valueSpan)

      wrapper.appendChild(row)
    }

    tooltipEl.replaceChildren(wrapper)

    const container = chart.canvas.parentElement
    if (!container) return

    Object.assign(tooltipEl.style, {
      background: backgroundColor,
      color: COLOR.WHITE_ALPHA_05,
      clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 0 100%, 0 12px)',
      padding: '14px',
      fontFamily: 'var(--font-mono)',
      fontSize: `${fontSize}px`,
      minWidth: `${minWidth}px`,
      zIndex: '10',
    })

    const anchor = resolveAnchor(container, chart.canvas, tooltip)
    if (!anchor) {
      hideTooltip(tooltipEl)
      return
    }

    tooltipEl.style.opacity = '1'
    positionTooltip(container, anchor.x, anchor.y)
  }

  // `axis` is omitted rather than defaulted, so Chart.js keeps its own per-mode default
  // for every caller that does not know the chart's orientation.
  return {
    enabled: false,
    external: externalHandler,
    mode,
    intersect,
    ...(axis ? { axis } : {}),
  }
}
