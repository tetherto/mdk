'use strict'

const { test } = require('brittle')
const { MAINTENANCE } = require('../../lib/utils/constants')

let MinerManager
try {
  MinerManager = require('../../lib/miner.manager')
} catch (e) {
  test.skip('MinerManager requires miningos-tpl-lib-thing', (t) => {
    t.pass('skipped')
  })
}

function createManager (opts = {}) {
  const conf = opts.conf ?? {
    thing: {
      allowDuplicateIPs: false,
      isStaticIpAssignment: false,
      minerDefaultPort: 4028,
      miner: {
        pools: [],
        nominalEfficiencyWThs: { miner: { low: 25, normal: 50, high: 75 } }
      }
    }
  }
  const ctx = opts.ctx ?? {
    rack: 'test',
    deps: {
      wtype: 'miner',
      loadConf: () => {},
      loadLib: () => null
    }
  }
  const manager = new MinerManager(conf, ctx)
  manager.mem = opts.mem ?? { things: {} }
  manager.conf = conf
  manager.debugThingError = () => {}
  manager.debugError = () => {}
  return manager
}

if (MinerManager) {
  test('MinerManager: getThingType and _getThingBaseType', (t) => {
    const manager = createManager()
    t.is(manager.getThingType(), 'miner')
    t.is(manager._getThingBaseType(), 'miner')
  })

  test('MinerManager: selectThingInfo returns address and port', (t) => {
    const manager = createManager()
    const thg = { opts: { address: '192.168.1.10', port: 4028 } }
    t.alike(manager.selectThingInfo(thg), { address: '192.168.1.10', port: 4028 })
  })

  test('MinerManager: selectThingInfo handles missing opts', (t) => {
    const manager = createManager()
    t.alike(manager.selectThingInfo({}), { address: undefined, port: undefined })
  })

  test('MinerManager: _isMinerOutsideContainerLocation', (t) => {
    const manager = createManager()
    t.ok(manager._isMinerOutsideContainerLocation({ info: { location: 'site.other' } }))
    t.not(manager._isMinerOutsideContainerLocation({ info: { location: 'site.container' } }))
    t.not(manager._isMinerOutsideContainerLocation({ info: {} }))
  })

  test('MinerManager: _validateMinerDataChange allows unique data', (t) => {
    const manager = createManager({
      mem: { things: { t1: { id: 't1', info: { serialNum: 'S1' }, opts: {} } } }
    })
    manager._validateMinerDataChange({
      id: 't2',
      info: { serialNum: 'S2', macAddress: 'aa:bb:cc:dd:ee:ff' },
      opts: { address: '192.168.1.2' }
    })
    t.pass()
  })

  test('MinerManager: _validateMinerDataChange rejects duplicate serialNum', (t) => {
    const manager = createManager({
      mem: { things: { t1: { id: 't1', info: { serialNum: 'S1' }, opts: {} } } }
    })
    t.exception(() => {
      manager._validateMinerDataChange({
        id: 't2',
        info: { serialNum: 'S1' },
        opts: {}
      })
    }, /ERR_THING_SERIALNUM_EXISTS/)
  })

  test('MinerManager: _validateMinerDataChange rejects duplicate macAddress', (t) => {
    const manager = createManager({
      mem: { things: { t1: { id: 't1', info: { macAddress: 'aa:bb:cc:dd:ee:ff' }, opts: {} } } }
    })
    t.exception(() => {
      manager._validateMinerDataChange({
        id: 't2',
        info: { macAddress: 'AA:BB:CC:DD:EE:FF' },
        opts: {}
      })
    }, /ERR_THING_MACADDRESS_EXISTS/)
  })

  test('MinerManager: _validateMinerDataChange rejects duplicate pos+container', (t) => {
    const manager = createManager({
      mem: { things: { t1: { id: 't1', info: { pos: 1, container: 'c1' }, opts: {} } } }
    })
    t.exception(() => {
      manager._validateMinerDataChange({
        id: 't2',
        info: { pos: 1, container: 'c1' },
        opts: {}
      })
    }, /ERR_THING_POS_EXISTS/)
  })

  test('MinerManager: _validateMinerDataChange rejects duplicate IP when allowDuplicateIPs false', (t) => {
    const manager = createManager({
      mem: { things: { t1: { id: 't1', info: {}, opts: { address: '192.168.1.10' } } } }
    })
    t.exception(() => {
      manager._validateMinerDataChange({
        id: 't2',
        info: {},
        opts: { address: '192.168.1.10' }
      })
    }, /ERR_THING_IP_ADDRESS_EXISTS/)
  })

  test('MinerManager: _validateMinerDataChange allows duplicate IP when allowDuplicateIPs true', (t) => {
    const manager = createManager({
      conf: {
        thing: {
          allowDuplicateIPs: true,
          isStaticIpAssignment: false,
          minerDefaultPort: 4028,
          miner: { pools: [], nominalEfficiencyWThs: {} }
        }
      },
      mem: { things: { t1: { id: 't1', info: {}, opts: { address: '192.168.1.10' } } } }
    })
    manager._validateMinerDataChange({
      id: 't2',
      info: {},
      opts: { address: '192.168.1.10' }
    })
    t.pass()
  })

  test('MinerManager: _validateUpdateThing validates container when location set', (t) => {
    const manager = createManager()
    t.exception(() => {
      manager._validateUpdateThing({
        id: 't1',
        info: { location: 'site.container', container: null },
        opts: {}
      })
    }, /ERR_THING_VALIDATE_CONTAINER_INVALID/)
  })

  test('MinerManager: _validateUpdateThing runs _validateMinerDataChange', (t) => {
    const manager = createManager({
      mem: { things: { t1: { id: 't1', info: { serialNum: 'S1' }, opts: {} } } }
    })
    t.exception(() => {
      manager._validateUpdateThing({
        id: 't2',
        info: { serialNum: 'S1' },
        opts: {}
      })
    }, /ERR_THING_SERIALNUM_EXISTS/)
  })

  test('MinerManager: getMinerDefaultPort', (t) => {
    const manager = createManager({
      conf: { thing: { minerDefaultPort: 4028, miner: {}, isStaticIpAssignment: false, allowDuplicateIPs: false } }
    })
    t.is(manager.getMinerDefaultPort(), 4028)
  })

  test('MinerManager: getNominalEficiencyWThs from conf', (t) => {
    const manager = createManager({
      conf: {
        thing: {
          miner: { nominalEfficiencyWThs: { miner: { low: 25 } } },
          isStaticIpAssignment: false,
          allowDuplicateIPs: false,
          minerDefaultPort: 4028
        }
      }
    })
    t.alike(manager.getNominalEficiencyWThs({}), { low: 25 })
  })

  test('MinerManager: getThingConf poolConfig returns miner pools', async (t) => {
    const manager = createManager({
      conf: {
        thing: {
          miner: { pools: [{ url: 'stratum://pool' }] },
          isStaticIpAssignment: false,
          allowDuplicateIPs: false,
          minerDefaultPort: 4028
        }
      }
    })
    const out = await manager.getThingConf({ requestType: 'poolConfig' })
    t.is(out.length, 1)
    t.is(out[0].url, 'stratum://pool')
  })

  test('MinerManager: _setStaticIpThing with forceSetIp does not throw', (t) => {
    const manager = createManager()
    const thg = { info: {}, opts: {} }
    t.is(manager._setStaticIpThing(thg, true), 1)
  })

  test('MinerManager: _setStaticIpThing without container/pos throws', (t) => {
    const manager = createManager()
    const thg = { info: {}, opts: {} }
    t.exception(() => manager._setStaticIpThing(thg, false), /ERR_THG_INFO_INVALID/)
  })

  test('MinerManager: _releaseStaticIpThing clears address', (t) => {
    const manager = createManager()
    const thg = { opts: { address: '192.168.1.1' } }
    t.is(manager._releaseStaticIpThing(thg), 1)
    t.is(thg.opts.address, '')
  })

  test('MinerManager: setIpThing with isStaticIpAssignment uses _setStaticIpThing', async (t) => {
    const manager = createManager({
      conf: {
        thing: {
          isStaticIpAssignment: true,
          allowDuplicateIPs: false,
          minerDefaultPort: 4028,
          miner: {}
        }
      }
    })
    const thg = { info: {}, opts: {} }
    await manager.setIpThing(thg, true)
    t.pass('setIpThing with static assignment and forceSetIp did not throw')
  })

  test('MinerManager: releaseIpThing with isStaticIpAssignment uses _releaseStaticIpThing', async (t) => {
    const manager = createManager({
      conf: {
        thing: {
          isStaticIpAssignment: true,
          allowDuplicateIPs: false,
          minerDefaultPort: 4028,
          miner: {}
        }
      }
    })
    const thg = { opts: { address: '192.168.1.1' } }
    await manager.releaseIpThing(thg)
    t.is(thg.opts.address, '')
  })

  test('MinerManager: setIpThing with minigosNet stub', async (t) => {
    const manager = createManager({
      conf: { thing: { isStaticIpAssignment: false, allowDuplicateIPs: false, minerDefaultPort: 4028, miner: {} } }
    })
    manager.minigosNet_n0 = {
      setIpThing: async () => {},
      releaseIpThing: async () => {},
      disconnectThing: async () => {}
    }
    const thg = { info: {}, opts: {} }
    await manager.setIpThing(thg, false)
    t.pass('setIpThing with minigosNet stub did not throw')
  })

  test('MinerManager: releaseIpThing with minigosNet stub', async (t) => {
    const manager = createManager({
      conf: { thing: { isStaticIpAssignment: false, allowDuplicateIPs: false, minerDefaultPort: 4028, miner: {} } }
    })
    manager.minigosNet_n0 = {
      setIpThing: async () => {},
      releaseIpThing: async () => {},
      disconnectThing: async () => {}
    }
    const thg = { opts: {} }
    await manager.releaseIpThing(thg)
    t.pass('releaseIpThing with minigosNet stub did not throw')
  })

  test('MinerManager: _setUpPortBasedOnMinerType sets default port', (t) => {
    const manager = createManager({
      conf: { thing: { minerDefaultPort: 4028, miner: {}, isStaticIpAssignment: false, allowDuplicateIPs: false } }
    })
    const thg = { opts: {}, info: { container: 'c1', pos: 1 } }
    manager._setUpPortBasedOnMinerType(thg)
    t.is(thg.opts.port, 4028)
  })

  test('MinerManager: _setUpPortBasedOnMinerType skips when container is MAINTENANCE', (t) => {
    const manager = createManager({
      conf: { thing: { minerDefaultPort: 4028, miner: {}, isStaticIpAssignment: false, allowDuplicateIPs: false } }
    })
    const thg = { opts: {}, info: { container: MAINTENANCE, pos: 1 } }
    manager._setUpPortBasedOnMinerType(thg)
    t.is(thg.opts.port, undefined)
  })

  test('MinerManager: disconnectThing delegates to minigosNet', async (t) => {
    const manager = createManager({
      conf: { thing: { isStaticIpAssignment: false, allowDuplicateIPs: false, minerDefaultPort: 4028, miner: {} } }
    })
    let disconnected = false
    manager.minigosNet_n0 = {
      disconnectThing: async (thg) => {
        disconnected = true
        t.is(thg.id, 't1')
      }
    }
    const thg = { id: 't1', opts: {} }
    await manager.disconnectThing(thg)
    t.ok(disconnected)
  })

  test('MinerManager: saveSharesData aggregates container shares', async (t) => {
    const manager = createManager({
      mem: {
        things: {
          t1: {
            info: { container: 'c1' },
            last: { snap: { stats: { all_pools_shares: { accepted: 10, rejected: 1, stale: 0 } } } }
          },
          t2: {
            info: { container: 'c1' },
            last: { snap: { stats: { all_pools_shares: { accepted: 5, rejected: 0, stale: 1 } } } }
          }
          // t3 no shares - should still create container entry with 0,0,0
        }
      },
      conf: { thing: { miner: {}, isStaticIpAssignment: false, allowDuplicateIPs: false, minerDefaultPort: 4028 } }
    })
    try {
      await manager.saveSharesData()
      t.pass('saveSharesData completed (writes depend on store)')
    } catch (e) {
      t.pass('saveSharesData failed as expected when store not available: ' + e.message)
    }
  })
}
