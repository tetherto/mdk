import type { UnknownRecord } from '@tetherto/mdk-core-ui'
import { Input, Label } from '@tetherto/mdk-core-ui'
import type { ChangeEvent, ReactElement } from 'react'
import { useEffect, useState } from 'react'

import { getContainerParametersSettings } from '../../../utils/container-settings-utils'
import './container-params-settings.scss'

type ParamItem = {
  name: string
  value?: number | string
  suffix?: string
  type?: string
}

type ContainerParamsSettingsProps = {
  title?: string
  data?: UnknownRecord
}

/**
 * Container Parameters Settings Component
 *
 * Displays container-specific parameters in a grid layout with
 * read-only input fields showing current values and units.
 *
 * @example
 * ```tsx
 * <ContainerParamsSettings
 *   title="System Parameters"
 *   data={containerData}
 * />
 * ```
 */
export const ContainerParamsSettings = ({
  title = 'Parameters',
  data = {},
}: ContainerParamsSettingsProps): ReactElement | null => {
  const [params, setParams] = useState<Record<string, ParamItem> | undefined>(
    getContainerParametersSettings(data),
  )

  const getParamChangeHandler = (key: string) => (event: ChangeEvent<HTMLInputElement>) => {
    setParams((prev: Record<string, ParamItem> | undefined) => {
      if (!prev?.[key]) return prev
      return {
        ...prev,
        [key]: {
          ...prev[key],
          value: Number(event?.target?.value),
        },
      }
    })
  }

  useEffect(() => {
    setParams(getContainerParametersSettings(data))
  }, [data])

  if (!params) {
    return null
  }

  const paramEntries = Object.entries(params)

  return (
    <div className="mdk-container-params">
      <h2 className="mdk-container-params__title">{title}</h2>

      <div className="mdk-container-params__grid">
        {paramEntries.map(([key, item]) => (
          <div key={key} className="mdk-container-params__field">
            <Label className="mdk-container-params__label" htmlFor={`${key}-input`}>
              {item?.name}
            </Label>
            <Input
              id={`${key}-input`}
              type={item?.type || 'text'}
              suffix={item?.suffix}
              disabled
              value={Number(item?.value ?? 0) || 0}
              onChange={getParamChangeHandler(key)}
              className="mdk-container-params__input"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default ContainerParamsSettings
