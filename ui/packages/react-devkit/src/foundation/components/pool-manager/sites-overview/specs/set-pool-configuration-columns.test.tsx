import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { POOL_ENDPOINT_ROLES_LABELS } from '../../pool-manager-constants'
import { endpointColumns } from '../set-pool-configuration/set-pool-configuration-columns'

describe('endpointColumns', () => {
  it('should define the correct headers and accessor keys', () => {
    expect(endpointColumns[0]).toMatchObject({ header: 'Host', accessorKey: 'host' })
    expect(endpointColumns[1]).toMatchObject({ header: 'Port', accessorKey: 'port' })
    expect(endpointColumns[2].header).toBe('Role')
  })

  describe('Role Column Cell Renderer', () => {
    const renderRoleCell = (roleValue: string) => {
      const column = endpointColumns[2]
      const mockInfo = { getValue: () => roleValue } as any
      const Cell = column.cell as React.FC<any>
      return render(<Cell {...mockInfo} />)
    }

    it('renders correctly using the actual constants', () => {
      const keys = Object.keys(POOL_ENDPOINT_ROLES_LABELS)
      const testKey = keys[0]
      const expectedLabel =
        POOL_ENDPOINT_ROLES_LABELS[testKey as keyof typeof POOL_ENDPOINT_ROLES_LABELS]

      renderRoleCell(testKey)

      const tag = screen.getByText(expectedLabel)
      expect(tag).toBeInTheDocument()
    })
  })
})
