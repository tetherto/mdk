import { COLOR } from '@tetherto/mdk-core-ui'
import { describe, expect, it } from 'vitest'
import { getCommonColorMapping, getCommonTableColumns } from '../helpers'

describe('getCommonTableColumns', () => {
  it('returns 5 columns', () => {
    const columns = getCommonTableColumns()
    expect(columns).toHaveLength(5)
  })

  it('has correct column structure', () => {
    const columns = getCommonTableColumns()
    const headers = columns.map((col) => col.header)

    expect(headers).toEqual(['State', 'Range', 'Color', 'Flash', 'Sound'])
  })

  it('has correct column sizes', () => {
    const columns = getCommonTableColumns()
    const sizes = columns.map((col) => col.size)

    expect(sizes).toEqual([20, 25, 15, 20, 20])
  })

  it('has valid cell renderers', () => {
    const columns = getCommonTableColumns()

    columns.forEach((col) => {
      expect(typeof col.cell).toBe('function')
    })
  })

  it('state column returns correct value', () => {
    const columns = getCommonTableColumns()
    const stateColumn = columns[0]

    const mockInfo = {
      getValue: () => 'Critical Low',
    }

    const result = stateColumn.cell(mockInfo as any)
    expect(result).toBe('Critical Low')
  })

  it('range column returns correct value', () => {
    const columns = getCommonTableColumns()
    const rangeColumn = columns[1]

    const mockInfo = {
      getValue: () => '< 35°C',
    }

    const result = rangeColumn.cell(mockInfo as any)
    expect(result).toBe('< 35°C')
  })

  it('color column returns correct value', () => {
    const columns = getCommonTableColumns()
    const colorColumn = columns[2]

    const mockInfo = {
      getValue: () => <div>Red</div>,
    }

    const result = colorColumn.cell(mockInfo as any)
    expect(result).toEqual(<div>Red</div>)
  })

  it('flash column wraps value in div', () => {
    const columns = getCommonTableColumns()
    const flashColumn = columns[3]

    const mockInfo = {
      getValue: () => <span>Flashing</span>,
    }

    const result = flashColumn.cell(mockInfo as any)
    expect(result).toEqual(
      <div>
        <span>Flashing</span>
      </div>,
    )
  })

  it('sound column wraps value in div', () => {
    const columns = getCommonTableColumns()
    const soundColumn = columns[4]

    const mockInfo = {
      getValue: () => <span>Sound On</span>,
    }

    const result = soundColumn.cell(mockInfo as any)
    expect(result).toEqual(
      <div>
        <span>Sound On</span>
      </div>,
    )
  })

  it('all columns have required properties', () => {
    const columns = getCommonTableColumns()

    columns.forEach((col) => {
      expect(col).toHaveProperty('header')
      expect(col).toHaveProperty('cell')
      expect(col).toHaveProperty('size')
    })
  })

  it('header is a string for each column', () => {
    const columns = getCommonTableColumns()

    columns.forEach((col) => {
      expect(typeof col.header).toBe('string')
    })
  })

  it('size is a number for each column', () => {
    const columns = getCommonTableColumns()

    columns.forEach((col) => {
      expect(typeof col.size).toBe('number')
    })
  })
})

describe('getCommonColorMapping', () => {
  it('returns color mapping object', () => {
    const mapping = getCommonColorMapping()
    expect(mapping).toBeDefined()
    expect(typeof mapping).toBe('object')
  })

  it('has red color mapping', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.RED]).toEqual({
      text: 'Red',
      color: 'red',
    })
  })

  it('has brick red color mapping', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.BRICK_RED]).toEqual({
      text: 'Red',
      color: 'red',
    })
  })

  it('has green color mapping', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.GREEN]).toEqual({
      text: 'Green',
      color: 'green',
    })
  })

  it('has light green color mapping', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.LIGHT_GREEN]).toEqual({
      text: 'Green',
      color: 'green',
    })
  })

  it('has grass green color mapping', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.GRASS_GREEN]).toEqual({
      text: 'Green',
      color: 'green',
    })
  })

  it('has orange color mapping', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.ORANGE]).toEqual({
      text: 'Orange',
      color: 'amber',
    })
  })

  it('has cold orange color mapping', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.COLD_ORANGE]).toEqual({
      text: 'Orange',
      color: 'amber',
    })
  })

  it('has yellow color mapping', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.YELLOW]).toEqual({
      text: 'Yellow',
      color: 'yellow',
    })
  })

  it('has dark yellow color mapping', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.YELLOW_DARK]).toEqual({
      text: 'Yellow',
      color: 'yellow',
    })
  })

  it('has gold color mapping', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.GOLD]).toEqual({
      text: 'Yellow',
      color: 'yellow',
    })
  })

  it('has white color mapping', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.WHITE]).toEqual({
      text: 'White',
      color: 'slate',
    })
  })

  it('has all expected color keys', () => {
    const mapping = getCommonColorMapping()
    const keys = Object.keys(mapping)

    expect(keys).toContain(COLOR.RED)
    expect(keys).toContain(COLOR.BRICK_RED)
    expect(keys).toContain(COLOR.GREEN)
    expect(keys).toContain(COLOR.LIGHT_GREEN)
    expect(keys).toContain(COLOR.GRASS_GREEN)
    expect(keys).toContain(COLOR.ORANGE)
    expect(keys).toContain(COLOR.COLD_ORANGE)
    expect(keys).toContain(COLOR.YELLOW)
    expect(keys).toContain(COLOR.YELLOW_DARK)
    expect(keys).toContain(COLOR.GOLD)
    expect(keys).toContain(COLOR.WHITE)
  })

  it('all mappings have required properties', () => {
    const mapping = getCommonColorMapping()

    Object.values(mapping).forEach((colorInfo) => {
      expect(colorInfo).toHaveProperty('text')
      expect(colorInfo).toHaveProperty('color')
      expect(typeof colorInfo.text).toBe('string')
      expect(typeof colorInfo.color).toBe('string')
    })
  })

  it('has exactly 11 color mappings', () => {
    const mapping = getCommonColorMapping()
    const keys = Object.keys(mapping)

    expect(keys).toHaveLength(11)
  })

  it('text property is never empty', () => {
    const mapping = getCommonColorMapping()

    Object.values(mapping).forEach((colorInfo) => {
      expect(colorInfo.text.length).toBeGreaterThan(0)
    })
  })

  it('color property is never empty', () => {
    const mapping = getCommonColorMapping()

    Object.values(mapping).forEach((colorInfo) => {
      expect(colorInfo.color.length).toBeGreaterThan(0)
    })
  })

  it('maps multiple reds to same red indicator', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.RED].color).toBe('red')
    expect(mapping[COLOR.BRICK_RED].color).toBe('red')
  })

  it('maps multiple greens to same green indicator', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.GREEN].color).toBe('green')
    expect(mapping[COLOR.LIGHT_GREEN].color).toBe('green')
    expect(mapping[COLOR.GRASS_GREEN].color).toBe('green')
  })

  it('maps multiple oranges to same amber indicator', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.ORANGE].color).toBe('amber')
    expect(mapping[COLOR.COLD_ORANGE].color).toBe('amber')
  })

  it('maps multiple yellows to same yellow indicator', () => {
    const mapping = getCommonColorMapping()

    expect(mapping[COLOR.YELLOW].color).toBe('yellow')
    expect(mapping[COLOR.YELLOW_DARK].color).toBe('yellow')
    expect(mapping[COLOR.GOLD].color).toBe('yellow')
  })

  it('uses valid indicator colors', () => {
    const mapping = getCommonColorMapping()
    const validColors = ['red', 'amber', 'green', 'yellow', 'slate']

    Object.values(mapping).forEach((colorInfo) => {
      expect(validColors).toContain(colorInfo.color)
    })
  })
})
