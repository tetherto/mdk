import type { ChangeEvent, FocusEvent, ReactElement, ReactNode, WheelEvent } from 'react'
import { useMemo } from 'react'

import type { UnknownRecord } from '@tetherto/core'
import {
  Button,
  COLOR,
  DataTable,
  getDataTableColumnHelper,
  Indicator,
  Input,
  Label,
  Spinner,
  UNITS,
} from '@tetherto/core'

import { getCommonColorMapping } from './helpers'
import { FlashStatusIndicator, SoundStatusIndicator } from './status-indicator'

import { useContainerThresholds } from '../../../hooks/use-container-thresholds'
import type { Device } from '../../../types/device'
import './base-threshold-form.scss'

type ThresholdConfig = {
  type: string
  title?: string
  unit?: string
  [key: string]: unknown
}

type ParameterSetting = {
  name: string
  value?: number | string
  suffix?: string
  type?: string
}

type BaseThresholdFormProps = {
  data?: Device | UnknownRecord
  thresholdConfigs?: ThresholdConfig[]
  onSave?: (thresholds: Record<string, Record<string, number>>) => void | Promise<void>
  getContainerParametersSettings?: (
    data: Device | UnknownRecord,
  ) => Record<string, ParameterSetting> | undefined
  children?: ReactNode
}

type ThresholdTableRow = {
  key: number
  state: string
  range: string
  color: ReactNode
  flash: ReactNode
  sound: ReactNode
}

const columnHelper = getDataTableColumnHelper<ThresholdTableRow>()

/**
 * Base Threshold Form Component
 *
 * Generic form for editing container thresholds with:
 * - Input fields for threshold values
 * - Visual table showing ranges and colors
 * - Flash and sound indicators
 * - Save/Cancel/Reset actions
 *
 * @example
 * ```tsx
 * <BaseThresholdForm
 *   data={containerData}
 *   thresholdConfigs={[
 *     { type: 'oilTemperature', title: 'Oil Temperature', unit: '°C' }
 *   ]}
 *   onSave={handleSave}
 * />
 * ```
 */
export const BaseThresholdForm = ({
  data = {},
  thresholdConfigs = [],
  onSave,
  children,
}: BaseThresholdFormProps): ReactElement => {
  let wrappedOnSave

  if (onSave) {
    wrappedOnSave = async (params: { data: UnknownRecord }) => {
      await onSave(params.data.thresholds as Record<string, Record<string, number>>)
    }
  }

  const {
    thresholds,
    isEditing,
    isSaving,
    isSiteLoading,
    isSettingsLoading,
    handleThresholdChange,
    handleThresholdBlur,
    handleSave,
    handleReset,
  } = useContainerThresholds({ data, onSave: wrappedOnSave })

  const handleCancel = (): void => {
    handleReset()
  }

  /**
   * Prevents scroll wheel from changing numeric input values
   */
  const handleWheel = (e: WheelEvent<HTMLInputElement>): void => {
    const input = e.target as HTMLInputElement
    input.blur()
  }

  /**
   * Converts camelCase to Title Case with spaces
   */
  const toTitleCase = (str: string): string => {
    return str
      .replace(/[-_]/g, ' ') // Replace underscores and hyphens with spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capitals in camelCase
      .trim()
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Table columns configuration
  const tableColumns = useMemo(
    () => [
      columnHelper.accessor('state', {
        header: 'State',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('range', {
        header: 'Range',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('color', {
        header: 'Color',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('flash', {
        header: 'Flash',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('sound', {
        header: 'Sound',
        cell: (info) => info.getValue(),
      }),
    ],
    [],
  )

  // Generate table data for threshold visualization
  const generateTableData = ({
    thresholdType,
    config,
  }: {
    thresholdType: string
    config?: ThresholdConfig
  }): ThresholdTableRow[] => {
    const thresholdValues = (thresholds[thresholdType] as Record<string, number> | undefined) || {}
    const thresholdKeys = Object.keys(thresholdValues)
    const data: ThresholdTableRow[] = []

    for (let i = 0; i < thresholdKeys.length; i++) {
      const key = thresholdKeys[i] as string
      const currentValue = thresholdValues[key]
      const nextValue = thresholdValues[thresholdKeys[i + 1] as string]

      let range = ''
      const unit =
        config?.unit ||
        (thresholdType.includes('Temperature') ? UNITS.TEMPERATURE_C : UNITS.PRESSURE_BAR)

      if (i === 0) {
        range = `< ${currentValue}${unit}`
      } else if (i === thresholdKeys.length - 1) {
        range = `> ${currentValue}${unit}`
      } else {
        range = `${currentValue} - ${nextValue}${unit}`
      }

      const fixedColors = [COLOR.RED, COLOR.GOLD, COLOR.GREEN, COLOR.ORANGE, COLOR.RED]
      const color = fixedColors[i] || COLOR.WHITE

      const isFlashing = i === 0 || i === 3 || i === thresholdKeys.length - 1
      const isSuperflashing = i === thresholdKeys.length - 1

      const colorMapping = getCommonColorMapping()
      const colorInfo = colorMapping[color]

      data.push({
        key: i,
        state: toTitleCase(key),
        range,
        color: (
          <Indicator className="mdk-base-threshold-form__color-block" color={colorInfo?.color}>
            {colorInfo?.text}
          </Indicator>
        ),
        flash: <FlashStatusIndicator isFlashing={isFlashing} color={color} />,
        sound: <SoundStatusIndicator isSuperflashing={isSuperflashing} color={color} />,
      })
    }

    return data
  }

  const getThresholdInputs = (thresholdType: string, config?: ThresholdConfig): ReactNode[] => {
    const thresholdValues = (thresholds[thresholdType] as Record<string, number> | undefined) || {}
    const thresholdKeys = Object.keys(thresholdValues)
    const unit =
      config?.unit ||
      (thresholdType.includes('Temperature') ? UNITS.TEMPERATURE_C : UNITS.PRESSURE_BAR)

    return thresholdKeys.map((key, index) => {
      const label = toTitleCase(key)
      const isFirst = index === 0
      const isLast = index === thresholdKeys.length - 1

      let placeholder = ''
      if (isFirst) {
        placeholder = `< ${thresholdValues[key]}`
      } else if (isLast) {
        placeholder = `> ${thresholdValues[key]}`
      } else {
        const nextKey = thresholdKeys[index + 1] as string
        placeholder = `${thresholdValues[key]} - ${thresholdValues[nextKey]}`
      }

      return (
        <div key={key} className="mdk-base-threshold-form__flex-col">
          <Label
            className="mdk-base-threshold-form__input-label"
            htmlFor={`${thresholdType}-${key}-input`}
          >
            {label} starts at:
          </Label>
          <Input
            id={`${thresholdType}-${key}-input`}
            className="mdk-threshold-input"
            type="number"
            step={0.1}
            ref={(el) => {
              if (el) {
                el.value = String(thresholdValues[key] || '')
              }
            }}
            value={thresholdValues[key]}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleThresholdChange(thresholdType, key, e.target.value)
            }
            onBlur={(e: FocusEvent<HTMLInputElement>) =>
              handleThresholdBlur(thresholdType, key, e.target.value)
            }
            onWheel={handleWheel}
            suffix={unit}
            placeholder={placeholder}
          />
        </div>
      )
    })
  }

  return (
    <>
      {children}

      {isSettingsLoading && <Spinner />}

      {!isSettingsLoading &&
        thresholdConfigs.map((config) => {
          const tableData = generateTableData({
            thresholdType: config.type,
            config,
          })

          return (
            <div key={config.type}>
              <h4 className="mdk-base-threshold-form__section-title">{config.title as string}</h4>

              {/* Input Fields */}
              <div className="mdk-base-threshold-form__flex-row">
                {getThresholdInputs(config.type, config)}
              </div>

              {/* Table */}
              <div className="mdk-base-threshold-form__table-container">
                <DataTable
                  bordered
                  data={tableData}
                  columns={tableColumns}
                  enablePagination={false}
                  enableRowSelection={false}
                />
              </div>
            </div>
          )
        })}

      {/* Action Buttons */}
      {isEditing && (
        <div className="mdk-base-threshold-form__action-buttons">
          <Button onClick={handleCancel}>Cancel</Button>
          <Button variant="danger" color="red" onClick={handleReset}>
            Reset Values to Default
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || isSiteLoading || isSettingsLoading}
          >
            Save Settings
          </Button>
        </div>
      )}
    </>
  )
}
