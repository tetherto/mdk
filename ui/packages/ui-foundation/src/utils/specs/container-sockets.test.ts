import { describe, expect, it } from 'vitest'
import {
  type ContainerSnapshotForSockets,
  deriveSelectedSockets,
  getAntspaceHydroIndexes,
  getAntspaceImmersionIndexes,
  getBitdeerIndexes,
  getConnectedMinerForSocket,
  getPduByIndex,
  getPduData,
  getSocketInfo,
  type MinerForSocket,
} from '../container-sockets'

const bitdeerContainer = (pduData: unknown[]): ContainerSnapshotForSockets => ({
  type: 'container-bd-d40-m56',
  info: { container: 'container-bd-d40-m56-01' },
  last: { snap: { stats: { container_specific: { pdu_data: pduData as never } } } },
})

const miner = (id: string, pos: string): MinerForSocket => ({
  id,
  type: 'miner-antminer-s19',
  info: { pos, container: 'container-bd-d40-m56-01' },
})

describe('index parsers', () => {
  it('splits a Bitdeer / MicroBT position into [pdu, socket]', () => {
    expect(getBitdeerIndexes('a1_3')).toEqual(['a1', '3'])
  })

  it('splits an Antspace Hydro position into [rack, pdu, socket]', () => {
    expect(getAntspaceHydroIndexes('r2_p4_7')).toEqual(['r2', 'p4', '7'])
  })

  it('splits an Antspace Immersion position into [pdu, socket]', () => {
    expect(getAntspaceImmersionIndexes('p1_9')).toEqual(['p1', '9'])
  })

  it('returns [] for an unparseable position', () => {
    expect(getBitdeerIndexes('nounderscore')).toEqual([])
  })
})

describe('getPduData / getPduByIndex', () => {
  it('reads the pdu_data array off the snapshot', () => {
    const container = bitdeerContainer([{ pdu: 'a1', sockets: [] }])
    expect(getPduData(container.last)).toHaveLength(1)
  })

  it('returns undefined when there is no snapshot', () => {
    expect(getPduData(undefined)).toBeUndefined()
  })

  it('finds a PDU row by index (string-coerced)', () => {
    const container = bitdeerContainer([{ pdu: 'a1', sockets: [] }, { pdu: 'a2', sockets: [] }])
    expect(getPduByIndex(container, 'a2')?.pdu).toBe('a2')
    expect(getPduByIndex(container, 'zz')).toBeUndefined()
  })
})

describe('getConnectedMinerForSocket', () => {
  it('matches a miner by exact position, ignoring non-miners', () => {
    const devices: MinerForSocket[] = [
      { id: 'c1', type: 'container-bd-d40-m56', info: { pos: 'a1_3' } },
      miner('m1', 'a1_3'),
    ]
    expect(getConnectedMinerForSocket(devices, 'a1_3')?.id).toBe('m1')
    expect(getConnectedMinerForSocket(devices, 'a9_9')).toBeUndefined()
  })
})

describe('getSocketInfo', () => {
  it('joins the live Bitdeer socket (enabled/cooling) and connected miner', () => {
    const container = bitdeerContainer([
      { pdu: 'a1', sockets: [{ socket: '3', enabled: true, cooling: false }] },
    ])
    const info = getSocketInfo(container, 'a1_3', [miner('m1', 'a1_3')])
    expect(info).toMatchObject({
      containerId: 'container-bd-d40-m56-01',
      minerId: 'm1',
      pduIndex: 'a1',
      socketIndex: '3',
      enabled: true,
      cooling: false,
    })
  })

  it('forces enabled:true for Antspace Hydro (no live socket table)', () => {
    const container: ContainerSnapshotForSockets = {
      type: 'container-as-hk3',
      info: { container: 'antspace-hydro-01' },
    }
    const info = getSocketInfo(container, 'r2_p4_7', [])
    expect(info).toMatchObject({ pduIndex: 'r2_p4', socketIndex: '7', enabled: true })
  })

  it('parses Antspace Immersion positions', () => {
    const container: ContainerSnapshotForSockets = {
      type: 'container-as-immersion',
      info: { container: 'antspace-immersion-01' },
    }
    const info = getSocketInfo(container, 'p1_9', [])
    expect(info).toMatchObject({ pduIndex: 'p1', socketIndex: '9', enabled: true })
  })

  it('omits enabled when the Bitdeer PDU row is missing', () => {
    const container = bitdeerContainer([])
    const info = getSocketInfo(container, 'a1_3', [])
    expect(info.pduIndex).toBe('a1')
    expect(info.socketIndex).toBe('3')
    expect(info.enabled).toBeUndefined()
  })
})

describe('deriveSelectedSockets', () => {
  it('resolves selected pos-tags per container, stripping the pos- prefix', () => {
    const container = bitdeerContainer([
      { pdu: 'a1', sockets: [{ socket: '3', enabled: true }] },
    ])
    const selectedDevicesTags = {
      'container-bd-d40-m56-01': { 'pos-a1_3': { isPosTag: true, minerId: 'm1' } },
    }
    const result = deriveSelectedSockets([container], selectedDevicesTags, [miner('m1', 'a1_3')])
    expect(result['container-bd-d40-m56-01']?.sockets).toHaveLength(1)
    expect(result['container-bd-d40-m56-01']?.sockets[0]).toMatchObject({
      pduIndex: 'a1',
      socketIndex: '3',
      enabled: true,
    })
  })

  it('omits containers with no selected tags and skips tagless containers', () => {
    const tagged = bitdeerContainer([{ pdu: 'a1', sockets: [] }])
    const tagless: ContainerSnapshotForSockets = { type: 'container-bd-d40-m56' }
    const result = deriveSelectedSockets([tagged, tagless], {}, [])
    expect(result).toEqual({})
  })
})
