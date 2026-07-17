import type { ReactElement } from 'react'
import type { DataRowItem } from '../data-row/data-row'
import { DataRow } from '../data-row/data-row'
import './generic-data-box.scss'

type DataItem = {
  /** Alternative unit field */
  unit?: string
} & DataRowItem

type GenericDataBoxProps = {
  /** Array of data items to display */
  data?: DataItem[]
  /** Fallback value when value is undefined */
  fallbackValue?: unknown
}

/**
 * Reusable labelled stat box used by container summary panels for one-off numeric values.
 *
 * Displays a table of label-value-unit rows.
 *
 * @example
 * ```tsx
 * import { UNITS } from '@tetherto/mdk-react-devkit'
 *
 * <GenericDataBox
 *   data={[
 *     { label: 'Temperature', value: 45, units: UNITS.TEMPERATURE_C },
 *     { label: 'Pressure', value: 2.5, units: UNITS.PRESSURE_BAR, isHighlighted: true },
 *     { label: 'Status', value: 'Running', color: 'green' }
 *   ]}
 * />
 * ```
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const GenericDataBox = ({ data = [], fallbackValue }: GenericDataBoxProps): ReactElement => {
  return (
    <div className="mdk-generic-data-box">
      {data.map((item, index) => (
        <DataRow
          key={`${item.label}-${item.value}-${index}`}
          label={item.label}
          value={item.value ?? fallbackValue}
          units={item.units || item.unit}
          isHighlighted={item.isHighlighted}
          color={item.color}
          flash={item.flash}
        />
      ))}
    </div>
  )
}
