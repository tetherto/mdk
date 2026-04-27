import { Button, DataTable, getDataTableColumnHelper } from '@mdk/core'
import type { DataTableExpandedState, DataTableRow, DataTableRowSelectionState } from '@mdk/core'
import React, { useMemo, useState } from 'react'

import { useDemoToast } from '../utils/use-demo-toast'

const miners = Array.from({ length: 105 })
  .fill({
    id: 1,
    type: 'a',
    power: 'b',
    value: 1,
  })
  .map((_val, index) => ({
    id: index,
    type: ['Alpha', 'Beta', 'Gamma'][Math.floor(Math.random() * 3)],
    power: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
    value: Math.floor(Math.random() * 5000),
  }))

type Miner = (typeof miners)[number]

const columnHelper = getDataTableColumnHelper<Miner>()
const columns = [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'type',
    header: 'Type (Min Size Restricted)',
    minSize: 400,
  },
  columnHelper.accessor((row) => row.power, {
    id: 'power',
    header: 'Power',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor((row) => row.value, {
    id: 'value',
    header: 'Value (Aligned Right)',
    cell: (info) => <div style={{ textAlign: 'end' }}>{info.getValue()}</div>,
  }),
  {
    id: 'type-0',
    accessorKey: 'type',
    header: 'type-0',
    minSize: 400,
  },
  columnHelper.accessor((row) => row.power, {
    id: 'power-1',
    cell: (info) => info.getValue(),
  }),
  {
    id: 'type-1',
    accessorKey: 'type',
    header: 'type-1',
    minSize: 400,
  },
  columnHelper.accessor((row) => row.power, {
    id: 'power-2',
    cell: (info) => info.getValue(),
  }),
  {
    id: 'type-2',
    accessorKey: 'type',
    header: 'type-2',
    minSize: 400,
  },
  columnHelper.accessor((row) => row.power, {
    id: 'power-3',
    cell: (info) => info.getValue(),
  }),
]

const createActionsColumn = (onShowDetails: (row: Miner) => void) =>
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (info) => <Button onClick={() => onShowDetails(info.row.original)}>Details</Button>,
  })

export const BasicTable = (): JSX.Element => {
  const { showToast, ToasterSlot } = useDemoToast()
  const tableColumns = useMemo(
    () => [
      ...columns.slice(0, 4),
      createActionsColumn((row) =>
        showToast('Miner Details', { description: JSON.stringify(row) }),
      ),
    ],
    [showToast],
  )

  return (
    <>
      <h2 className="demo-section__title">Basic Table</h2>
      <DataTable data={miners.slice(0, 5)} columns={tableColumns} />
      <ToasterSlot />
    </>
  )
}

export const ShortTable = (): JSX.Element => {
  const { showToast, ToasterSlot } = useDemoToast()
  const tableColumns = useMemo(
    () => [
      ...columns.slice(0, 4),
      createActionsColumn((row) =>
        showToast('Miner Details', { description: JSON.stringify(row) }),
      ),
    ],
    [showToast],
  )

  return (
    <>
      <h2 className="demo-section__title">Short Table</h2>
      <DataTable
        data={miners.slice(0, 15)}
        columns={tableColumns}
        contentClassName="demo-table-content--short"
      />
      <ToasterSlot />
    </>
  )
}

export const ControlledTable = (): JSX.Element => {
  const { showToast, ToasterSlot } = useDemoToast()
  const [selections, setSelections] = useState<DataTableRowSelectionState>({
    0: false,
  })
  const [expandedRows, setExpandedRows] = useState<DataTableExpandedState>({})
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<Miner[]>(miners)

  const tableColumns = useMemo(
    () => [
      ...columns,
      createActionsColumn((row) =>
        showToast('Miner Details', { description: JSON.stringify(row) }),
      ),
    ],
    [showToast],
  )

  const handleToggleFirst = (): void => {
    setSelections({
      ...selections,
      0: !selections[0],
    })
  }

  const handleExpandThird = (): void => {
    if (typeof expandedRows !== 'boolean') {
      setExpandedRows({
        ...expandedRows,
        2: !expandedRows[2],
      })
    }
  }

  const handleToggleLoading = (): void => {
    setIsLoading((old) => !old)
  }

  const handleToggleEmpty = (): void => {
    setData((old) => (old.length ? [] : miners))
  }

  const renderExpandedContent = (row: DataTableRow<Miner>): React.ReactNode => {
    return JSON.stringify(row.original)
  }

  return (
    <>
      <h2 className="demo-section__title">Fully Featured Table</h2>
      <p>
        Table with horizontal scroll, pagination, sorting, row selection, row expansion, empty state
      </p>
      <div style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
        <Button onClick={handleToggleFirst}>Toggle 1st row selection</Button>
        <Button onClick={handleExpandThird}>Toggle 3rd row expansion</Button>
        <Button onClick={handleToggleLoading}>Toggle loading</Button>
        <Button onClick={handleToggleEmpty}>Toggle empty</Button>
      </div>
      <DataTable
        data={data}
        columns={tableColumns}
        enableRowSelection
        selections={selections}
        onSelectionsChange={setSelections}
        enableRowExpansion
        expandedRows={expandedRows}
        onExpandedRowsChange={setExpandedRows}
        renderExpandedContent={renderExpandedContent}
        loading={isLoading}
      />
      <ToasterSlot />
    </>
  )
}

export const DemoTable = (): JSX.Element => {
  return (
    <>
      <BasicTable />
      <ControlledTable />
      <ShortTable />
    </>
  )
}
