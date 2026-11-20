import type { IndicatorProps } from '@tetherto/mdk-react-devkit/primitives'
import { Indicator, Pagination, Typography } from '@tetherto/mdk-react-devkit/primitives'
import { usePagination } from '@tetherto/mdk-react-adapter'
import { useMemo } from 'react'

import { DemoPageHeader } from '../components/demo-page-header'

type MockStatus = 'active' | 'pending' | 'completed' | 'error'
// Mock data generator
type MockItem = {
  id: number
  name: string
  description: string
  status: MockStatus
  createdAt: string
}

const StatusColors: Record<MockStatus, IndicatorProps['color']> = {
  active: 'green',
  pending: 'amber',
  completed: 'blue',
  error: 'red',
}

const generateMockData = (count: number): MockItem[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Item ${index + 1}`,
    description: `This is a description for item ${index + 1}`,
    status: ['active', 'pending', 'completed', 'error'][
      Math.floor(Math.random() * 4)
    ] as MockStatus,
    createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
  }))
}

export const PaginationExample = (): React.ReactElement => {
  // Generate 247 mock items (to show pagination with multiple pages)
  const allItems = useMemo(() => generateMockData(247), [])

  const { pagination, queryArgs, handleChange } = usePagination({
    pageSize: 20,
    total: allItems.length,
  })

  // Get current page items based on limit and offset
  const currentPageItems = useMemo(() => {
    const { limit, offset } = queryArgs
    return allItems.slice(offset, offset + limit)
  }, [allItems, queryArgs])

  return (
    <section className="demo-section">
      <DemoPageHeader title="Pagination" />
      <div className="demo-section__tile-grid">
        {currentPageItems.map((item) => (
          <div key={item.id} className="demo-section__tile">
            <Typography
              variant="heading3"
              size="xl"
              color="primary"
              className="demo-section__mb-sm"
            >
              {item.name}
            </Typography>
            <Typography size="sm" color="muted" className="demo-section__mb-md">
              {item.description}
            </Typography>
            <div className="demo-section__control-row">
              <Indicator color={StatusColors[item.status]}>{item.status}</Indicator>
              <Typography variant="caption" color="muted">
                ID: {item.id}
              </Typography>
            </div>
          </div>
        ))}
      </div>

      <Pagination {...pagination} onChange={handleChange} />
    </section>
  )
}

export default PaginationExample
