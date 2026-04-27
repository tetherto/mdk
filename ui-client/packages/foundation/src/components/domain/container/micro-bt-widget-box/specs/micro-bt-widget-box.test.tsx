import { render, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../types/device'
import { DEVICE_STATUS } from '../../../../../constants/devices'
import type { MicroBTWidgetBoxProps } from '../micro-bt-widget-box'
import { MicroBTWidgetBox } from '../micro-bt-widget-box'

vi.mock('@mdk/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mdk/core')>()

  return {
    ...actual,
    Indicator: ({
      color,
      size,
      children,
    }: {
      color: string
      size: string
      children: React.ReactNode
    }) => (
      <div data-testid="indicator" data-color={color} data-size={size}>
        {children}
      </div>
    ),
  }
})

const buildDevice = (cdu: Record<string, unknown> = {}): Device =>
  ({
    id: 'container-1',
    type: 'microbt',
    last: {
      snap: {
        stats: {
          status: 'running',
          container_specific: { cdu },
        },
      },
    },
  }) as Device

const renderRoot = (props: MicroBTWidgetBoxProps = {}) => {
  const { container } = render(
    <MicroBTWidgetBox
      data={buildDevice({
        circulation_pump_running_status: 'running',
        cooling_fan_control: true,
      })}
      {...props}
    />,
  )

  return container.querySelector('.mdk-micro-bt-widget-box') as HTMLElement
}

describe('MicroBTWidgetBox', () => {
  describe('rendering', () => {
    it('should return null when data is undefined', () => {
      const { container } = render(<MicroBTWidgetBox />)

      expect(container.firstChild).toBeNull()
    })

    it('should render root and both status rows', () => {
      const root = renderRoot()

      expect(root).toBeInTheDocument()
      expect(within(root).getByText('Cicle Pump')).toBeInTheDocument()
      expect(within(root).getByText('Cooling Fan')).toBeInTheDocument()
      expect(within(root).getAllByTestId('indicator')).toHaveLength(2)
    })

    it('should render two item columns with title styling hook', () => {
      const root = renderRoot()

      expect(root.querySelectorAll('.mdk-micro-bt-widget-box__item')).toHaveLength(2)
      expect(root.querySelectorAll('.mdk-micro-bt-widget-box__title')).toHaveLength(2)
    })
  })

  describe('cycle pump', () => {
    it('should show Running in green when circulation_pump_running_status is running', () => {
      const root = renderRoot()

      const indicators = within(root).getAllByTestId('indicator')

      expect(indicators[0]).toHaveAttribute('data-color', 'green')
      expect(indicators[0]).toHaveTextContent(DEVICE_STATUS.RUNNING)
    })

    it('should show Off in gray when circulation pump is not running', () => {
      const root = renderRoot({
        data: buildDevice({
          circulation_pump_running_status: 'stopped',
          cooling_fan_control: true,
        }),
      })

      const indicators = within(root).getAllByTestId('indicator')

      expect(indicators[0]).toHaveAttribute('data-color', 'gray')
      expect(indicators[0]).toHaveTextContent(DEVICE_STATUS.OFF)
    })

    it('should show Off when circulation status is non-lowercase Running string', () => {
      const root = renderRoot({
        data: buildDevice({
          circulation_pump_running_status: 'Running',
          cooling_fan_control: true,
        }),
      })

      const indicators = within(root).getAllByTestId('indicator')

      expect(indicators[0]).toHaveAttribute('data-color', 'gray')
      expect(indicators[0]).toHaveTextContent(DEVICE_STATUS.OFF)
    })

    it('should show Off when cdu is missing', () => {
      const root = renderRoot({
        data: {
          id: 'c',
          type: 'microbt',
          last: {
            snap: {
              stats: {
                container_specific: {},
              },
            },
          },
        } as Device,
      })

      expect(within(root).getAllByTestId('indicator')[0]).toHaveAttribute('data-color', 'gray')
    })
  })

  describe('cooling fan', () => {
    it('should show Running in green when cooling_fan_control is true', () => {
      const root = renderRoot()

      const indicators = within(root).getAllByTestId('indicator')

      expect(indicators[1]).toHaveAttribute('data-color', 'green')
      expect(indicators[1]).toHaveTextContent(DEVICE_STATUS.RUNNING)
    })

    it('should show Error in red when cooling_fan_control is false', () => {
      const root = renderRoot({
        data: buildDevice({
          circulation_pump_running_status: 'running',
          cooling_fan_control: false,
        }),
      })

      const indicators = within(root).getAllByTestId('indicator')

      expect(indicators[1]).toHaveAttribute('data-color', 'red')
      expect(indicators[1]).toHaveTextContent(DEVICE_STATUS.ERROR)
    })

    it('should treat missing cooling_fan_control as Error', () => {
      const root = renderRoot({
        data: buildDevice({
          circulation_pump_running_status: 'running',
        }),
      })

      expect(within(root).getAllByTestId('indicator')[1]).toHaveAttribute('data-color', 'red')
      expect(within(root).getByText(DEVICE_STATUS.ERROR)).toBeInTheDocument()
    })
  })
})
