import {
  Children,
  cloneElement,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
} from 'react'

type MosaicItemComponentProps = HTMLAttributes<HTMLDivElement> & {
  area?: string
  children?: ReactNode
}

type MosaicProps = {
  template: string[] | string[][]
  gap?: string
  rowHeight?: string
  columns?: string | string[]
  children: ReactNode
  className?: string
}

/**
 * Normalize template into 2D array of area names
 * @param template - String array or 2D string array
 * @returns 2D array of area names
 */
const normalizeTemplate = (template: string[] | string[][]): string[][] => {
  // If already 2D array, return as is
  if (Array.isArray(template[0])) {
    return template as string[][]
  }

  // Convert 1D array of strings into 2D array
  // Split each string by whitespace
  return (template as string[]).map((row) => row.trim().split(/\s+/))
}

/**
 * Convert columns array to string
 * @param columns - String or array of strings
 * @returns Space-separated string or null
 */
const normalizeColumns = (columns?: string | string[]): string | null => {
  if (!columns) return null
  if (Array.isArray(columns)) {
    return columns.join(' ')
  }

  return columns
}

/**
 * Ensure valid CSS grid-area name
 * CSS grid-area names cannot start with a number
 * @param name - Area name to fix
 * @returns Valid CSS grid-area name
 */
const fixAreaName = (name: unknown): string => {
  if (name === '.') return '.'

  const str = String(name)

  // If starts with number, prefix with 'a'
  if (/^\d/.test(str)) {
    return `a${str}`
  }

  return str
}

/**
 * Convert 2D area array to CSS grid-template-areas string
 * @param areas - 2D array of area names
 * @returns CSS grid-template-areas value
 */
const formatGridAreas = (areas?: string[][]): string => {
  if (!areas || areas.length === 0) return 'none'

  // Convert each row to quoted string: ["a", "b"] -> "a b"
  // Join rows with newlines: ["a b", "c d"] -> '"a b"\n"c d"'
  return areas.map((row) => `"${row.join(' ')}"`).join('\n')
}

/**
 * Mosaic - Grid layout component with named areas
 *
 * Features:
 * - Named grid areas for layout
 * - Responsive: stacks on mobile, grid on desktop
 * - Auto-generates column tracks
 * - Validates column count vs template
 *
 * @example
 * ```tsx
 * <Mosaic
 *   template={[
 *     ['header', 'header'],
 *     ['sidebar', 'content'],
 *     ['footer', 'footer']
 *   ]}
 *   gap="16px"
 *   rowHeight="auto"
 * >
 *   <Mosaic.Item area="header">Header</Mosaic.Item>
 *   <Mosaic.Item area="sidebar">Sidebar</Mosaic.Item>
 *   <Mosaic.Item area="content">Content</Mosaic.Item>
 *   <Mosaic.Item area="footer">Footer</Mosaic.Item>
 * </Mosaic>
 * ```
 *
 * @example
 * // String template (space-separated)
 * ```tsx
 * <Mosaic
 *   template={[
 *     'header header header',
 *     'nav    main   aside',
 *     'footer footer footer'
 *   ]}
 * >
 *   <Mosaic.Item area="header">Header</Mosaic.Item>
 *   <Mosaic.Item area="nav">Nav</Mosaic.Item>
 *   <Mosaic.Item area="main">Main</Mosaic.Item>
 *   <Mosaic.Item area="aside">Aside</Mosaic.Item>
 *   <Mosaic.Item area="footer">Footer</Mosaic.Item>
 * </Mosaic>
 * ```
 * @category layout
 * @domain generic
 * @tier agent-ready
 */
export const Mosaic = ({
  template,
  gap = '12px',
  rowHeight = 'auto',
  columns,
  children,
  className,
}: MosaicProps): ReactElement => {
  // Normalize template into 2D array
  const rows = useMemo(() => normalizeTemplate(template), [template])

  const colsCount = rows[0]?.length || 1

  // Normalize columns → string
  const columnsStr = useMemo(() => normalizeColumns(columns), [columns])

  // Normalize template with safe CSS grid-area names
  const normalized = useMemo(() => rows.map((row) => row.map((cell) => fixAreaName(cell))), [rows])

  useEffect(() => {
    if (columnsStr) {
      const columnCount = columnsStr.trim().split(/\s+/).length
      if (columnCount !== colsCount) {
        console.warn(
          `Mosaic: columns prop has ${columnCount} tracks but template has ${colsCount} columns`,
        )
      }
    }
  }, [columnsStr, colsCount])

  // Format grid-template-areas CSS value
  const gridAreas = useMemo(() => formatGridAreas(normalized), [normalized])

  // Patch children with grid-area inline style
  const patchedChildren = useMemo(
    () =>
      Children.map(children, (child) => {
        if (!isValidElement(child)) return child

        const area = (child.props as { area?: string }).area
        const fixedArea = area ? fixAreaName(area) : undefined

        return cloneElement(
          child as ReactElement,
          { 'data-area': fixedArea } as Record<string, unknown>,
        )
      }),
    [children],
  )

  // Inline styles for dynamic values
  const gridStyle = useMemo(
    () =>
      ({
        '--mosaic-columns': columnsStr || `repeat(${colsCount}, minmax(0, 1fr))`,
        '--mosaic-row-height': rowHeight,
        '--mosaic-gap': gap,
        '--mosaic-areas': gridAreas,
      }) as CSSProperties,
    [columnsStr, colsCount, rowHeight, gap, gridAreas],
  )

  return (
    <div className={`mosaic-grid ${className || ''}`} style={gridStyle}>
      {patchedChildren}
    </div>
  )
}

const MosaicItemComponent = forwardRef<HTMLDivElement, MosaicItemComponentProps>(
  ({ area, children, className, style, ...props }, ref) => {
    const fixedArea = area ? fixAreaName(area) : undefined

    // Inline style for grid-area
    const itemStyle = useMemo(
      () => ({
        ...style,
        gridArea: fixedArea || 'auto',
      }),
      [style, fixedArea],
    )

    return (
      <div ref={ref} className={`mosaic-item ${className || ''}`} style={itemStyle} {...props}>
        {children}
      </div>
    )
  },
)

MosaicItemComponent.displayName = 'Mosaic.Item'

Mosaic.Item = MosaicItemComponent
