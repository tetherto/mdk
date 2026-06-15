/**
 * Runnable example for Pagination.
 */
import { useState } from 'react'
import { Pagination } from '@tetherto/mdk-react-devkit'

export const PaginationExample = () => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  return (
    <Pagination
      total={483}
      current={page}
      pageSize={pageSize}
      showTotal
      onChange={(p, ps) => {
        setPage(p)
        setPageSize(ps)
      }}
    />
  )
}
