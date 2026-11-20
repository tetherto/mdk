import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DoughnutChart } from '../index'

type CanvasProps = {
  data: { datasets: Array<{ data: number[] }> }
  options: {
    plugins: {
      tooltip: {
        callbacks?: { label?: (ctx: unknown) => string[] }
        external?: unknown
      }
    }
  }
}

// The real canvas needs Chart.js and a 2D context; record what it was given instead.
const canvas = vi.hoisted(() => ({ props: undefined as CanvasProps | undefined }))
vi.mock('../doughnut-canvas', () => ({
  default: (props: CanvasProps) => {
    canvas.props = props
    return null
  },
}))

const data = [
  { label: 'Subsidy', value: 199 },
  { label: 'Fees', value: 1 },
]

describe('DoughnutChart minSliceAngle', () => {
  it('draws a small slice at the minimum angle but keeps the legend on the true values', async () => {
    render(<DoughnutChart data={data} minSliceAngle={10} />)

    await waitFor(() => expect(canvas.props).toBeDefined())
    const [subsidy, fees] = canvas.props!.data.datasets[0]!.data
    expect((fees! / (subsidy! + fees!)) * 360).toBeCloseTo(10)
    expect(screen.getByText('(0.50%)')).toBeInTheDocument()
  })

  it('shows the true value in the default tooltip', async () => {
    render(<DoughnutChart data={data} minSliceAngle={10} />)

    await waitFor(() => expect(canvas.props).toBeDefined())
    const label = canvas.props!.options.plugins.tooltip.callbacks!.label!
    const drawnFees = canvas.props!.data.datasets[0]!.data[1]
    expect(label({ dataIndex: 1, parsed: drawnFees, label: 'Fees' })).toEqual(['Fees', '1 (0.50%)'])
  })

  it('draws every slice to scale by default', async () => {
    render(<DoughnutChart data={data} />)

    await waitFor(() => expect(canvas.props).toBeDefined())
    expect(canvas.props!.data.datasets[0]!.data).toEqual([199, 1])
  })
})
