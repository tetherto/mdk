import type { IndicatorProps } from '@mdk/core'
import { Indicator, Pagination, Typography } from '@mdk/core'
import { usePagination } from '@mdk/foundation'
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {currentPageItems.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Typography
              variant="heading3"
              size="xl"
              color="primary"
              style={{ marginBottom: '8px' }}
            >
              {item.name}
            </Typography>
            <Typography size="sm" color="muted" style={{ marginBottom: '12px' }}>
              {item.description}
            </Typography>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
