import { beforeEach, describe, expect, it } from 'vitest'
import type { DevicesState, SocketData } from '../devices-slice'
import {
  devicesSlice,
  NO_CONTAINER_KEY,
  removeDeviceTag,
  removeFilterTag,
  removeMultipleContainers,
  removeMultipleSelectedDevices,
  removeMultipleSelectedSockets,
  removeSelectedContainer,
  removeSelectedDevice,
  removeSelectedLVCabinet,
  removeSelectedSocket,
  resetSelectedDevicesTags,
  selectContainer,
  selectDeviceTag,
  selectFilterTags,
  selectLVCabinet,
  selectMultipleContainers,
  selectSelectedContainers,
  selectSelectedDevices,
  selectSelectedDeviceTags,
  selectSelectedLVCabinets,
  selectSelectedSockets,
  setFilterTags,
  setMultipleSelectedDevices,
  setMultipleSelectedSockets,
  setResetSelections,
  setSelectDevice,
  setSelectedDevices,
  setSelectedLvCabinets,
  setSelectedSockets,
  setSelectSocket,
} from '../devices-slice'

describe('devicesSlice', () => {
  let initialState: DevicesState

  beforeEach(() => {
    initialState = {
      selectedDevices: [],
      selectedSockets: {},
      filterTags: [],
      selectedDevicesTags: {},
      selectedContainers: {},
      selectedLvCabinets: {},
    }
  })

  describe('initial state', () => {
    it('returns initial state', () => {
      const state = devicesSlice.reducer(undefined, { type: 'unknown' })
      expect(state).toEqual(initialState)
    })
  })

  describe('container actions', () => {
    it('selectContainer adds container to selectedContainers', () => {
      const container = { id: 'container-1', name: 'Container 1' }
      const state = devicesSlice.reducer(initialState, selectContainer(container))

      expect(state.selectedContainers['container-1']).toEqual(container)
    })

    it('removeSelectedContainer removes container from selectedContainers', () => {
      const container = { id: 'container-1', name: 'Container 1' }
      initialState.selectedContainers = { 'container-1': container }

      const state = devicesSlice.reducer(initialState, removeSelectedContainer(container))

      expect(state.selectedContainers['container-1']).toBeUndefined()
    })

    it('selectMultipleContainers adds multiple containers', () => {
      const containers = [
        { id: 'container-1', name: 'Container 1' },
        { id: 'container-2', name: 'Container 2' },
      ]

      const state = devicesSlice.reducer(initialState, selectMultipleContainers(containers))

      expect(state.selectedContainers['container-1']).toEqual(containers[0])
      expect(state.selectedContainers['container-2']).toEqual(containers[1])
    })

    it('selectMultipleContainers creates shallow copy of devices', () => {
      const containers = [{ id: 'container-1', name: 'Container 1', data: { test: 'value' } }]

      const state = devicesSlice.reducer(initialState, selectMultipleContainers(containers))

      expect(state.selectedContainers['container-1']).not.toBe(containers[0])
      expect(state.selectedContainers['container-1']).toEqual(containers[0])
    })

    it('removeMultipleContainers removes multiple containers', () => {
      const containers = [
        { id: 'container-1', name: 'Container 1' },
        { id: 'container-2', name: 'Container 2' },
      ]
      initialState.selectedContainers = {
        'container-1': containers[0],
        'container-2': containers[1],
      }

      const state = devicesSlice.reducer(initialState, removeMultipleContainers(containers))

      expect(state.selectedContainers).toEqual({})
    })
  })

  describe('LV cabinet actions', () => {
    it('selectLVCabinet adds cabinet to selectedLvCabinets', () => {
      const cabinet = { id: 'cabinet-1', name: 'Cabinet 1' }
      const state = devicesSlice.reducer(initialState, selectLVCabinet(cabinet))

      expect(state.selectedLvCabinets['cabinet-1']).toEqual(cabinet)
    })

    it('removeSelectedLVCabinet removes cabinet from selectedLvCabinets', () => {
      const cabinet = { id: 'cabinet-1', name: 'Cabinet 1' }
      initialState.selectedLvCabinets = { 'cabinet-1': cabinet }

      const state = devicesSlice.reducer(initialState, removeSelectedLVCabinet(cabinet))

      expect(state.selectedLvCabinets['cabinet-1']).toBeUndefined()
    })

    it('setSelectedLvCabinets replaces all LV cabinets', () => {
      const cabinets = {
        'cabinet-1': { id: 'cabinet-1', name: 'Cabinet 1' },
        'cabinet-2': { id: 'cabinet-2', name: 'Cabinet 2' },
      }

      const state = devicesSlice.reducer(initialState, setSelectedLvCabinets(cabinets))

      expect(state.selectedLvCabinets).toEqual(cabinets)
    })
  })

  describe('device actions', () => {
    it('setSelectedDevices replaces selectedDevices', () => {
      const devices = [
        { id: 'device-1', name: 'Device 1' },
        { id: 'device-2', name: 'Device 2' },
      ]

      const state = devicesSlice.reducer(initialState, setSelectedDevices(devices))

      expect(state.selectedDevices).toEqual(devices)
    })

    it('setSelectDevice adds device to selectedDevices', () => {
      const device = { id: 'device-1', name: 'Device 1' }
      const state = devicesSlice.reducer(initialState, setSelectDevice(device))

      expect(state.selectedDevices).toContainEqual(device)
    })

    it('removeSelectedDevice removes device from selectedDevices', () => {
      const device = { id: 'device-1', name: 'Device 1' }
      initialState.selectedDevices = [device]

      const state = devicesSlice.reducer(initialState, removeSelectedDevice('device-1'))

      expect(state.selectedDevices).toEqual([])
    })

    it('removeSelectedDevice keeps other devices', () => {
      initialState.selectedDevices = [
        { id: 'device-1', name: 'Device 1' },
        { id: 'device-2', name: 'Device 2' },
      ]

      const state = devicesSlice.reducer(initialState, removeSelectedDevice('device-1'))

      expect(state.selectedDevices).toHaveLength(1)
      expect(state.selectedDevices[0].id).toBe('device-2')
    })

    it('setMultipleSelectedDevices adds only new devices', () => {
      initialState.selectedDevices = [{ id: 'device-1', name: 'Device 1' }]
      const newDevices = [
        { id: 'device-1', name: 'Device 1' },
        { id: 'device-2', name: 'Device 2' },
      ]

      const state = devicesSlice.reducer(initialState, setMultipleSelectedDevices(newDevices))

      expect(state.selectedDevices).toHaveLength(2)
      expect(state.selectedDevices[1]).toEqual(newDevices[1])
    })

    it('removeMultipleSelectedDevices removes multiple devices', () => {
      initialState.selectedDevices = [
        { id: 'device-1', name: 'Device 1' },
        { id: 'device-2', name: 'Device 2' },
        { id: 'device-3', name: 'Device 3' },
      ]

      const state = devicesSlice.reducer(
        initialState,
        removeMultipleSelectedDevices(['device-1', 'device-3']),
      )

      expect(state.selectedDevices).toHaveLength(1)
      expect(state.selectedDevices[0].id).toBe('device-2')
    })

    it('removeMultipleSelectedDevices handles non-existent IDs', () => {
      initialState.selectedDevices = [{ id: 'device-1', name: 'Device 1' }]

      const state = devicesSlice.reducer(initialState, removeMultipleSelectedDevices(['device-99']))

      expect(state.selectedDevices).toHaveLength(1)
    })
  })

  describe('filter tags actions', () => {
    it('setFilterTags sets and trims filter tags', () => {
      const tags = ['  tag1  ', 'tag2', '  tag3  ']
      const state = devicesSlice.reducer(initialState, setFilterTags(tags))

      expect(state.filterTags).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('removeFilterTag removes specific tag case-insensitively', () => {
      initialState.filterTags = ['tag1', 'tag2', 'tag3']
      const state = devicesSlice.reducer(initialState, removeFilterTag('TAG2'))

      expect(state.filterTags).toEqual(['tag1', 'tag3'])
    })

    it('removeFilterTag handles lowercase input', () => {
      initialState.filterTags = ['TAG1', 'TAG2', 'TAG3']
      const state = devicesSlice.reducer(initialState, removeFilterTag('tag2'))

      expect(state.filterTags).toEqual(['TAG1', 'TAG3'])
    })

    it('removeFilterTag does nothing if tag not found', () => {
      initialState.filterTags = ['tag1', 'tag2']
      const state = devicesSlice.reducer(initialState, removeFilterTag('tag3'))

      expect(state.filterTags).toEqual(['tag1', 'tag2'])
    })
  })

  describe('socket actions', () => {
    it('setSelectedSockets replaces all sockets', () => {
      const sockets = {
        'container-1': {
          sockets: [
            {
              containerId: 'container-1',
              minerId: 'miner-1',
              pduIndex: 0,
              socketIndex: 0,
              miner: { id: 'miner-1' },
            },
          ],
        },
      }

      const state = devicesSlice.reducer(initialState, setSelectedSockets(sockets))

      expect(state.selectedSockets).toEqual(sockets)
    })

    it('setSelectSocket adds socket to new container', () => {
      const socket: SocketData = {
        containerId: 'container-1',
        minerId: 'miner-1',
        pduIndex: 0,
        socketIndex: 0,
        miner: { id: 'miner-1' },
      }

      const state = devicesSlice.reducer(initialState, setSelectSocket(socket))

      expect(state.selectedSockets['container-1'].sockets).toContainEqual(socket)
    })

    it('setSelectSocket appends socket to existing container', () => {
      const socket1: SocketData = {
        containerId: 'container-1',
        minerId: 'miner-1',
        pduIndex: 0,
        socketIndex: 0,
        miner: { id: 'miner-1' },
      }
      const socket2: SocketData = {
        containerId: 'container-1',
        minerId: 'miner-2',
        pduIndex: 0,
        socketIndex: 1,
        miner: { id: 'miner-2' },
      }

      let state = devicesSlice.reducer(initialState, setSelectSocket(socket1))
      state = devicesSlice.reducer(state, setSelectSocket(socket2))

      expect(state.selectedSockets['container-1'].sockets).toHaveLength(2)
    })

    it('removeSelectedSocket removes socket from container', () => {
      const socket: SocketData = {
        containerId: 'container-1',
        minerId: 'miner-1',
        pduIndex: 0,
        socketIndex: 0,
        miner: { id: 'miner-1' },
      }
      initialState.selectedSockets = {
        'container-1': { sockets: [socket] },
      }

      const state = devicesSlice.reducer(
        initialState,
        removeSelectedSocket({ containerId: 'container-1', minerId: 'miner-1' }),
      )

      expect(state.selectedSockets['container-1']).toBeUndefined()
    })

    it('removeSelectedSocket returns early if container not found', () => {
      const state = devicesSlice.reducer(
        initialState,
        removeSelectedSocket({ containerId: 'non-existent', minerId: 'miner-1' }),
      )

      expect(state.selectedSockets).toEqual({})
    })

    it('removeSelectedSocket keeps container if sockets remain', () => {
      const socket1: SocketData = {
        containerId: 'container-1',
        minerId: 'miner-1',
        pduIndex: 0,
        socketIndex: 0,
        miner: { id: 'miner-1' },
      }
      const socket2: SocketData = {
        containerId: 'container-1',
        minerId: 'miner-2',
        pduIndex: 0,
        socketIndex: 1,
        miner: { id: 'miner-2' },
      }

      initialState.selectedSockets = {
        'container-1': { sockets: [socket1, socket2] },
      }

      const state = devicesSlice.reducer(
        initialState,
        removeSelectedSocket({ containerId: 'container-1', minerId: 'miner-1' }),
      )

      expect(state.selectedSockets['container-1'].sockets).toHaveLength(1)
      expect(state.selectedSockets['container-1'].sockets[0].minerId).toBe('miner-2')
    })

    it('setMultipleSelectedSockets adds multiple sockets without duplicates', () => {
      const sockets: SocketData[] = [
        {
          containerId: 'container-1',
          minerId: 'miner-1',
          pduIndex: 0,
          socketIndex: 0,
          miner: { id: 'miner-1' },
        },
        {
          containerId: 'container-1',
          minerId: 'miner-1',
          pduIndex: 0,
          socketIndex: 0,
          miner: { id: 'miner-1' },
        },
      ]

      const state = devicesSlice.reducer(initialState, setMultipleSelectedSockets(sockets))

      expect(state.selectedSockets['container-1'].sockets).toHaveLength(1)
    })

    it('setMultipleSelectedSockets segregates by container', () => {
      const sockets: SocketData[] = [
        {
          containerId: 'container-1',
          minerId: 'miner-1',
          pduIndex: 0,
          socketIndex: 0,
          miner: { id: 'miner-1' },
        },
        {
          containerId: 'container-2',
          minerId: 'miner-2',
          pduIndex: 0,
          socketIndex: 0,
          miner: { id: 'miner-2' },
        },
      ]

      const state = devicesSlice.reducer(initialState, setMultipleSelectedSockets(sockets))

      expect(state.selectedSockets['container-1'].sockets).toHaveLength(1)
      expect(state.selectedSockets['container-2'].sockets).toHaveLength(1)
    })

    it('removeMultipleSelectedSockets removes multiple sockets', () => {
      const sockets: SocketData[] = [
        {
          containerId: 'container-1',
          minerId: 'miner-1',
          pduIndex: 0,
          socketIndex: 0,
          miner: { id: 'miner-1' },
        },
        {
          containerId: 'container-1',
          minerId: 'miner-2',
          pduIndex: 0,
          socketIndex: 1,
          miner: { id: 'miner-2' },
        },
      ]
      initialState.selectedSockets = {
        'container-1': { sockets },
      }

      const state = devicesSlice.reducer(initialState, removeMultipleSelectedSockets(sockets))

      expect(state.selectedSockets['container-1']).toBeUndefined()
    })

    it('removeMultipleSelectedSockets returns early if container not found', () => {
      const sockets: SocketData[] = [
        {
          containerId: 'non-existent',
          minerId: 'miner-1',
          pduIndex: 0,
          socketIndex: 0,
          miner: { id: 'miner-1' },
        },
      ]

      const state = devicesSlice.reducer(initialState, removeMultipleSelectedSockets(sockets))

      expect(state.selectedSockets).toEqual({})
    })

    it('removeMultipleSelectedSockets filters correctly', () => {
      const socket1: SocketData = {
        containerId: 'container-1',
        minerId: 'miner-1',
        pduIndex: 0,
        socketIndex: 0,
        miner: { id: 'miner-1' },
      }
      const socket2: SocketData = {
        containerId: 'container-1',
        minerId: 'miner-2',
        pduIndex: 1,
        socketIndex: 1,
        miner: { id: 'miner-2' },
      }

      initialState.selectedSockets = {
        'container-1': { sockets: [socket1, socket2] },
      }

      const state = devicesSlice.reducer(initialState, removeMultipleSelectedSockets([socket1]))

      expect(state.selectedSockets['container-1'].sockets).toHaveLength(1)
      expect(state.selectedSockets['container-1'].sockets[0].minerId).toBe('miner-2')
    })
  })

  describe('device tag actions', () => {
    it('selectDeviceTag adds tag without container', () => {
      const payload = {
        id: 'miner-1',
        info: {},
      }

      const state = devicesSlice.reducer(initialState, selectDeviceTag(payload))

      expect(state.selectedDevicesTags[NO_CONTAINER_KEY]['id-miner-1']).toEqual({
        isPosTag: false,
        minerId: 'miner-1',
      })
    })

    it('selectDeviceTag creates NO_CONTAINER_KEY if not exists', () => {
      const payload = {
        id: 'miner-1',
        info: {},
      }

      const state = devicesSlice.reducer(initialState, selectDeviceTag(payload))

      expect(state.selectedDevicesTags[NO_CONTAINER_KEY]).toBeDefined()
    })

    it('selectDeviceTag adds tag with container and pos', () => {
      const payload = {
        id: 'miner-1',
        info: { container: 'container-1', pos: 'A1' },
      }

      const state = devicesSlice.reducer(initialState, selectDeviceTag(payload))

      expect(state.selectedDevicesTags['container-1']['pos-A1']).toEqual({
        isPosTag: true,
        minerId: 'miner-1',
      })
    })

    it('selectDeviceTag creates container if not exists', () => {
      const payload = {
        id: 'miner-1',
        info: { container: 'container-1' },
      }

      const state = devicesSlice.reducer(initialState, selectDeviceTag(payload))

      expect(state.selectedDevicesTags['container-1']).toBeDefined()
    })

    it('selectDeviceTag adds id tag when pos exists but id does not', () => {
      const payload = {
        id: 'miner-1',
        info: { container: 'container-1', posTag: 'A1' },
      }

      initialState.selectedDevicesTags = {
        'container-1': {
          'pos-A1': { isPosTag: true, minerId: 'miner-1' },
        },
      }

      const state = devicesSlice.reducer(initialState, selectDeviceTag(payload))

      expect(state.selectedDevicesTags['container-1']['id-miner-1']).toEqual({
        isPosTag: false,
        minerId: 'miner-1',
      })
    })

    it('selectDeviceTag adds tag with container without pos', () => {
      const payload = {
        id: 'miner-1',
        info: { container: 'container-1' },
      }

      const state = devicesSlice.reducer(initialState, selectDeviceTag(payload))

      expect(state.selectedDevicesTags['container-1']['id-miner-1']).toEqual({
        isPosTag: false,
        minerId: 'miner-1',
      })
    })

    it('removeDeviceTag removes tag without container', () => {
      initialState.selectedDevicesTags = {
        [NO_CONTAINER_KEY]: {
          'id-miner-1': { isPosTag: false, minerId: 'miner-1' },
        },
      }

      const payload = {
        id: 'miner-1',
        info: {},
      }

      const state = devicesSlice.reducer(initialState, removeDeviceTag(payload))

      expect(state.selectedDevicesTags[NO_CONTAINER_KEY]['id-miner-1']).toBeUndefined()
    })

    it('removeDeviceTag returns early if NO_CONTAINER_KEY does not exist', () => {
      const payload = {
        id: 'miner-1',
        info: {},
      }

      const state = devicesSlice.reducer(initialState, removeDeviceTag(payload))

      expect(state.selectedDevicesTags).toEqual({})
    })

    it('removeDeviceTag removes tag with pos and container', () => {
      initialState.selectedDevicesTags = {
        'container-1': {
          'id-miner-1': { isPosTag: false, minerId: 'miner-1' },
          'pos-A1': { isPosTag: true, minerId: 'miner-1' },
        },
      }

      const payload = {
        id: 'miner-1',
        info: { container: 'container-1', pos: 'A1' },
      }

      const state = devicesSlice.reducer(initialState, removeDeviceTag(payload))

      expect(state.selectedDevicesTags['container-1']).toBeUndefined()
    })

    it('removeDeviceTag returns early if container does not exist', () => {
      const payload = {
        id: 'miner-1',
        info: { container: 'non-existent', pos: 'A1' },
      }

      const state = devicesSlice.reducer(initialState, removeDeviceTag(payload))

      expect(state.selectedDevicesTags).toEqual({})
    })

    it('removeDeviceTag keeps container if tags remain', () => {
      initialState.selectedDevicesTags = {
        'container-1': {
          'id-miner-1': { isPosTag: false, minerId: 'miner-1' },
          'id-miner-2': { isPosTag: false, minerId: 'miner-2' },
        },
      }

      const payload = {
        id: 'miner-1',
        info: { container: 'container-1' },
      }

      const state = devicesSlice.reducer(initialState, removeDeviceTag(payload))

      expect(state.selectedDevicesTags['container-1']).toBeDefined()
      expect(state.selectedDevicesTags['container-1']['id-miner-2']).toBeDefined()
    })
  })

  describe('reset actions', () => {
    it('setResetSelections resets all selections', () => {
      initialState.selectedDevices = [{ id: 'device-1' }]
      initialState.selectedContainers = { 'container-1': { id: 'container-1' } }
      initialState.selectedSockets = { 'container-1': { sockets: [] } }
      initialState.selectedDevicesTags = { 'container-1': {} }
      initialState.selectedLvCabinets = { 'cabinet-1': { id: 'cabinet-1' } }

      const state = devicesSlice.reducer(initialState, setResetSelections())

      expect(state.selectedDevices).toEqual([])
      expect(state.selectedContainers).toEqual({})
      expect(state.selectedSockets).toEqual({})
      expect(state.selectedDevicesTags).toEqual({})
      expect(state.selectedLvCabinets).toEqual({})
    })

    it('resetSelectedDevicesTags resets tags and related selections', () => {
      initialState.selectedDevicesTags = { 'container-1': {} }
      initialState.selectedDevices = [{ id: 'device-1' }]
      initialState.selectedSockets = { 'container-1': { sockets: [] } }

      const state = devicesSlice.reducer(initialState, resetSelectedDevicesTags())

      expect(state.selectedDevicesTags).toEqual({})
      expect(state.selectedDevices).toEqual([])
      expect(state.selectedSockets).toEqual({})
    })
  })

  describe('selectors', () => {
    const mockRootState = {
      devices: {
        selectedDevices: [{ id: 'device-1' }],
        selectedContainers: { 'container-1': { id: 'container-1' } },
        selectedLvCabinets: { 'cabinet-1': { id: 'cabinet-1' } },
        selectedSockets: {
          'container-1': {
            sockets: [
              {
                containerId: 'container-1',
                minerId: 'miner-1',
                pduIndex: 0,
                socketIndex: 0,
                miner: { id: 'miner-1' },
              },
            ],
          },
        },
        filterTags: ['tag1', 'tag2'],
        selectedDevicesTags: {
          'container-1': { 'id-miner-1': { isPosTag: false, minerId: 'miner-1' } },
        },
      },
    }

    it('selectSelectedDevices returns selectedDevices', () => {
      const result = selectSelectedDevices(mockRootState)
      expect(result).toEqual([{ id: 'device-1' }])
    })

    it('selectSelectedContainers returns selectedContainers', () => {
      const result = selectSelectedContainers(mockRootState)
      expect(result).toEqual({ 'container-1': { id: 'container-1' } })
    })

    it('selectSelectedLVCabinets returns selectedLvCabinets', () => {
      const result = selectSelectedLVCabinets(mockRootState)
      expect(result).toEqual({ 'cabinet-1': { id: 'cabinet-1' } })
    })

    it('selectSelectedSockets returns selectedSockets', () => {
      const result = selectSelectedSockets(mockRootState)
      expect(result).toEqual(mockRootState.devices.selectedSockets)
    })

    it('selectFilterTags returns filterTags', () => {
      const result = selectFilterTags(mockRootState)
      expect(result).toEqual(['tag1', 'tag2'])
    })

    it('selectSelectedDeviceTags returns selectedDevicesTags', () => {
      const result = selectSelectedDeviceTags(mockRootState)
      expect(result).toEqual(mockRootState.devices.selectedDevicesTags)
    })
  })
})
