import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../../types'
import { MicroBTEditableThresholdForm } from '../../../../container-params-settings/micro-bt-editable-threshold-form'
import { MicroBTSettings } from '../settings/micro-bt-settings'
import * as utils from '../settings/micro-bt-utils'

vi.mock('../../../../container-params-settings', () => ({
  ContainerParamsSettings: vi.fn(() => <div data-testid="params" />),
}))

vi.mock('../../../../container-params-settings/micro-bt-editable-threshold-form', () => ({
  MicroBTEditableThresholdForm: vi.fn((props) => (
    <div data-testid="threshold">
      <button onClick={() => props.waterTempColorFunc(35)}>Color</button>
      <button onClick={() => props.waterTempFlashFunc(35)}>Flash</button>
      <button onClick={() => props.waterTempSuperflashFunc(35)}>Superflash</button>
    </div>
  )),
}))

vi.mock('../settings/micro-bt-utils', () => ({
  getMicroBtInletTempColor: vi.fn(),
  shouldMicroBtTemperatureFlash: vi.fn(),
  shouldMicroBtTemperatureSuperflash: vi.fn(),
}))

describe('MicroBTSettings', () => {
  const mockDevice: Device = {
    id: '1',
    type: 'microbt',
    status: 'active',
    last: { snap: { stats: {}, config: {} } },
  }

  it('renders both components', () => {
    render(<MicroBTSettings />)
    expect(screen.getByTestId('params')).toBeInTheDocument()
    expect(screen.getByTestId('threshold')).toBeInTheDocument()
  })

  it('passes data to both components', () => {
    render(<MicroBTSettings data={mockDevice} />)
    expect(MicroBTEditableThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({ data: mockDevice }),
      expect.anything(),
    )
  })

  it('calls color util with correct params', () => {
    render(<MicroBTSettings data={mockDevice} />)
    const props = vi.mocked(MicroBTEditableThresholdForm).mock.calls[0][0]
    props.waterTempColorFunc?.(35)

    expect(utils.getMicroBtInletTempColor).toHaveBeenCalledWith(35, true, null)
  })

  it('calls flash util with correct params', () => {
    render(<MicroBTSettings data={mockDevice} />)
    const props = vi.mocked(MicroBTEditableThresholdForm).mock.calls[0][0]
    props.waterTempFlashFunc?.(35)

    expect(utils.shouldMicroBtTemperatureFlash).toHaveBeenCalledWith(35, true, mockDevice, null)
  })

  it('calls superflash util with correct params', () => {
    render(<MicroBTSettings data={mockDevice} />)
    const props = vi.mocked(MicroBTEditableThresholdForm).mock.calls[0][0]
    props.waterTempSuperflashFunc?.(35)

    expect(utils.shouldMicroBtTemperatureSuperflash).toHaveBeenCalledWith(35, mockDevice, null)
  })

  it('passes containerSettings to utils', () => {
    const settings = { thresholds: { waterTemperature: { COLD: 20 } } }
    render(<MicroBTSettings data={mockDevice} containerSettings={settings} />)

    const props = vi.mocked(MicroBTEditableThresholdForm).mock.calls[0][0]
    props.waterTempColorFunc?.(35)

    expect(utils.getMicroBtInletTempColor).toHaveBeenCalledWith(35, true, settings)
  })
})
