import { describe, expect, it } from 'vitest'
import { createDevicesStore, NO_CONTAINER_KEY, type SocketData } from './devices-store'

const socket = (containerId: string, minerId: string, pdu = 0, idx = 0): SocketData => ({
  containerId,
  minerId,
  pduIndex: pdu,
  socketIndex: idx,
  miner: { id: minerId },
})

describe('devicesStore', () => {
  it('selectContainer / removeSelectedContainer', () => {
    const store = createDevicesStore()
    store.getState().selectContainer({ id: 'c1' })
    store.getState().selectContainer({ id: 'c2' })
    expect(Object.keys(store.getState().selectedContainers)).toEqual(['c1', 'c2'])
    store.getState().removeSelectedContainer({ id: 'c1' })
    expect(Object.keys(store.getState().selectedContainers)).toEqual(['c2'])
  })

  it('selectMultipleContainers / removeMultipleContainers', () => {
    const store = createDevicesStore()
    store.getState().selectMultipleContainers([{ id: 'a' }, { id: 'b' }])
    expect(Object.keys(store.getState().selectedContainers)).toEqual(['a', 'b'])
    store.getState().removeMultipleContainers([{ id: 'a' }])
    expect(Object.keys(store.getState().selectedContainers)).toEqual(['b'])
  })

  it('selectLVCabinet / removeSelectedLVCabinet', () => {
    const store = createDevicesStore()
    store.getState().selectLVCabinet({ id: 'lv1' })
    expect(store.getState().selectedLvCabinets.lv1).toBeDefined()
    store.getState().removeSelectedLVCabinet({ id: 'lv1' })
    expect(store.getState().selectedLvCabinets.lv1).toBeUndefined()
  })

  it('setMultipleSelectedDevices skips duplicates', () => {
    const store = createDevicesStore()
    store.getState().setMultipleSelectedDevices([{ id: '1' }, { id: '2' }])
    store.getState().setMultipleSelectedDevices([{ id: '2' }, { id: '3' }])
    expect(store.getState().selectedDevices.map((d) => d.id)).toEqual(['1', '2', '3'])
  })

  it('removeMultipleSelectedDevices', () => {
    const store = createDevicesStore()
    store.getState().setSelectedDevices([{ id: '1' }, { id: '2' }, { id: '3' }])
    store.getState().removeMultipleSelectedDevices(['2'])
    expect(store.getState().selectedDevices.map((d) => d.id)).toEqual(['1', '3'])
  })

  it('setSelectDevice / removeSelectedDevice', () => {
    const store = createDevicesStore()
    store.getState().setSelectDevice({ id: '1' })
    store.getState().setSelectDevice({ id: '2' })
    store.getState().removeSelectedDevice('1')
    expect(store.getState().selectedDevices.map((d) => d.id)).toEqual(['2'])
  })

  it('filterTags add / remove (case-insensitive trim)', () => {
    const store = createDevicesStore()
    store.getState().setFilterTags(['  FOO ', 'BAR'])
    expect(store.getState().filterTags).toEqual(['FOO', 'BAR'])
    store.getState().removeFilterTag('foo')
    expect(store.getState().filterTags).toEqual(['BAR'])
  })

  it('setSelectSocket / removeSelectedSocket', () => {
    const store = createDevicesStore()
    store.getState().setSelectSocket(socket('c1', 'm1'))
    store.getState().setSelectSocket(socket('c1', 'm2'))
    expect(store.getState().selectedSockets.c1?.sockets).toHaveLength(2)

    store.getState().removeSelectedSocket({ containerId: 'c1', minerId: 'm1' })
    expect(store.getState().selectedSockets.c1?.sockets).toHaveLength(1)

    store.getState().removeSelectedSocket({ containerId: 'c1', minerId: 'm2' })
    expect(store.getState().selectedSockets.c1).toBeUndefined()
  })

  it('setMultipleSelectedSockets groups by containerId and dedupes by (pdu, socket)', () => {
    const store = createDevicesStore()
    store.getState().setMultipleSelectedSockets([
      socket('c1', 'm1', 0, 1),
      socket('c1', 'm2', 0, 1), // dup pdu/socket — should be skipped
      socket('c1', 'm3', 0, 2),
      socket('c2', 'm4', 1, 0),
    ])
    const state = store.getState().selectedSockets
    expect(state.c1?.sockets).toHaveLength(2)
    expect(state.c2?.sockets).toHaveLength(1)
  })

  it('removeMultipleSelectedSockets removes matching sockets and prunes empty containers', () => {
    const store = createDevicesStore()
    store
      .getState()
      .setMultipleSelectedSockets([
        socket('c1', 'm1', 0, 1),
        socket('c1', 'm3', 0, 2),
        socket('c2', 'm4', 1, 0),
      ])
    store
      .getState()
      .removeMultipleSelectedSockets([socket('c1', 'm1', 0, 1), socket('c2', 'm4', 1, 0)])
    const state = store.getState().selectedSockets
    expect(state.c1?.sockets).toHaveLength(1)
    expect(state.c2).toBeUndefined()
  })

  it('setResetSelections clears all selection state', () => {
    const store = createDevicesStore()
    store.getState().setSelectDevice({ id: '1' })
    store.getState().selectContainer({ id: 'c1' })
    store.getState().setResetSelections()
    expect(store.getState().selectedDevices).toEqual([])
    expect(store.getState().selectedContainers).toEqual({})
  })

  it('selectDeviceTag uses NO_CONTAINER_KEY when no container is provided', () => {
    const store = createDevicesStore()
    store.getState().selectDeviceTag({ id: 'm1', info: {} })
    expect(store.getState().selectedDevicesTags[NO_CONTAINER_KEY]?.['id-m1']).toEqual({
      isPosTag: false,
      minerId: 'm1',
    })
  })

  it('selectDeviceTag with pos tag adds pos-* key (matches Redux slice behaviour)', () => {
    const store = createDevicesStore()
    store.getState().selectDeviceTag({ id: 'm1', info: { container: 'c1', pos: 'p1' } })
    expect(store.getState().selectedDevicesTags.c1?.['pos-p1']).toEqual({
      isPosTag: true,
      minerId: 'm1',
    })
    expect(store.getState().selectedDevicesTags.c1?.['id-m1']).toBeUndefined()
  })

  it('selectDeviceTag without pos tag stores id-* key', () => {
    const store = createDevicesStore()
    store.getState().selectDeviceTag({ id: 'm1', info: { container: 'c1' } })
    expect(store.getState().selectedDevicesTags.c1?.['id-m1']).toEqual({
      isPosTag: false,
      minerId: 'm1',
    })
  })

  it('removeDeviceTag clears bucket when empty', () => {
    const store = createDevicesStore()
    store.getState().selectDeviceTag({ id: 'm1', info: { container: 'c1' } })
    store.getState().removeDeviceTag({ id: 'm1', info: { container: 'c1' } })
    expect(store.getState().selectedDevicesTags.c1).toBeUndefined()
  })

  it('removeDeviceTag is a no-op for unknown container', () => {
    const store = createDevicesStore()
    store.getState().removeDeviceTag({ id: 'm1', info: { container: 'missing' } })
    expect(store.getState().selectedDevicesTags.missing).toBeUndefined()
  })

  it('removeDeviceTag without container key removes from NO_CONTAINER bucket', () => {
    const store = createDevicesStore()
    store.getState().selectDeviceTag({ id: 'm1', info: {} })
    store.getState().selectDeviceTag({ id: 'm2', info: {} })
    store.getState().removeDeviceTag({ id: 'm1', info: {} })
    expect(store.getState().selectedDevicesTags[NO_CONTAINER_KEY]?.['id-m1']).toBeUndefined()
    expect(store.getState().selectedDevicesTags[NO_CONTAINER_KEY]?.['id-m2']).toBeDefined()
  })

  it('removeDeviceTag with pos removes pos-* and id-* entries', () => {
    const store = createDevicesStore()
    store.getState().selectDeviceTag({ id: 'm1', info: { container: 'c1', pos: 'p1' } })
    store.getState().removeDeviceTag({ id: 'm1', info: { container: 'c1', pos: 'p1' } })
    expect(store.getState().selectedDevicesTags.c1).toBeUndefined()
  })

  it('removeSelectedSocket is a no-op for unknown container', () => {
    const store = createDevicesStore()
    store.getState().removeSelectedSocket({ containerId: 'missing', minerId: 'm1' })
    expect(store.getState().selectedSockets).toEqual({})
  })

  it('setSelectedSockets / setSelectedLvCabinets bulk replace', () => {
    const store = createDevicesStore()
    store.getState().setSelectedSockets({ c1: { sockets: [socket('c1', 'm1')] } })
    expect(store.getState().selectedSockets.c1?.sockets).toHaveLength(1)
    store.getState().setSelectedLvCabinets({ lv1: { id: 'lv1' } })
    expect(store.getState().selectedLvCabinets.lv1).toBeDefined()
  })

  it('resetSelectedDevicesTags clears tags + devices + sockets', () => {
    const store = createDevicesStore()
    store.getState().setSelectDevice({ id: '1' })
    store.getState().selectDeviceTag({ id: '1', info: { container: 'c1' } })
    store.getState().resetSelectedDevicesTags()
    expect(store.getState().selectedDevicesTags).toEqual({})
    expect(store.getState().selectedDevices).toEqual([])
    expect(store.getState().selectedSockets).toEqual({})
  })
})
