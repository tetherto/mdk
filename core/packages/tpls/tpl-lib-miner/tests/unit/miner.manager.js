'use strict'

const { test } = require('brittle')

let MinerManager
try {
  MinerManager = require('../../lib/miner.manager')
} catch (e) {
  test.skip('lib/miner.manager requires deps (tpl-lib-thing etc.)', (t) => {
    t.pass('skipped')
  })
}

if (MinerManager) {
  function createManager (opts = {}) {
    const conf = {
      thing: {
        allowDuplicateIPs: opts.allowDuplicateIPs ?? false
      }
    }
    const ctx = {
      rack: 'test',
      deps: {
        wtype: 'miner',
        loadConf: () => {},
        loadLib: () => null
      }
    }
    const m = new MinerManager(conf, ctx)
    m.mem = { things: opts.things || {} }
    m.conf = conf
    return m
  }

  test('_validateMinerDataChange: allows unique serialNum', (t) => {
    const manager = createManager({
      things: {
        t1: { id: 't1', info: { serialNum: 'S1' }, opts: {} }
      }
    })
    manager._validateMinerDataChange({
      id: 't2',
      info: { serialNum: 'S2' },
      opts: {}
    })
    t.pass()
  })

  test('_validateMinerDataChange: rejects duplicate serialNum', (t) => {
    const manager = createManager({
      things: {
        t1: { id: 't1', info: { serialNum: 'S1' }, opts: {} }
      }
    })
    t.exception(() => {
      manager._validateMinerDataChange({
        id: 't2',
        info: { serialNum: 'S1' },
        opts: {}
      })
    }, /ERR_THING_SERIALNUM_EXISTS/)
  })

  test('_validateMinerDataChange: same id skipped', (t) => {
    const manager = createManager({
      things: {
        t1: { id: 't1', info: { serialNum: 'S1' }, opts: {} }
      }
    })
    manager._validateMinerDataChange({
      id: 't1',
      info: { serialNum: 'S1' },
      opts: {}
    })
    t.pass()
  })

  test('_validateMinerDataChange: rejects duplicate macAddress', (t) => {
    const manager = createManager({
      things: {
        t1: { id: 't1', info: { macAddress: 'aa:bb:cc:dd:ee:ff' }, opts: {} }
      }
    })
    t.exception(() => {
      manager._validateMinerDataChange({
        id: 't2',
        info: { macAddress: 'aa:bb:cc:dd:ee:ff' },
        opts: {}
      })
    }, /ERR_THING_MACADDRESS_EXISTS/)
  })

  test('_validateMinerDataChange: macAddress comparison case insensitive', (t) => {
    const manager = createManager({
      things: {
        t1: { id: 't1', info: { macAddress: 'AA:BB:CC:DD:EE:FF' }, opts: {} }
      }
    })
    t.exception(() => {
      manager._validateMinerDataChange({
        id: 't2',
        info: { macAddress: 'aa:bb:cc:dd:ee:ff' },
        opts: {}
      })
    }, /ERR_THING_MACADDRESS_EXISTS/)
  })

  test('_validateMinerDataChange: rejects duplicate pos+container', (t) => {
    const manager = createManager({
      things: {
        t1: { id: 't1', info: { pos: 1, container: 'c1' }, opts: {} }
      }
    })
    t.exception(() => {
      manager._validateMinerDataChange({
        id: 't2',
        info: { pos: 1, container: 'c1' },
        opts: {}
      })
    }, /ERR_THING_POS_EXISTS/)
  })

  test('_validateMinerDataChange: rejects duplicate IP when allowDuplicateIPs false', (t) => {
    const manager = createManager({ allowDuplicateIPs: false, things: {} })
    manager.mem.things.t1 = { id: 't1', info: {}, opts: { address: '192.168.1.10' } }
    t.exception(() => {
      manager._validateMinerDataChange({
        id: 't2',
        info: {},
        opts: { address: '192.168.1.10' }
      })
    }, /ERR_THING_IP_ADDRESS_EXISTS/)
  })

  test('_validateMinerDataChange: allows duplicate IP when allowDuplicateIPs true', (t) => {
    const manager = createManager({ allowDuplicateIPs: true, things: {} })
    manager.mem.things.t1 = { id: 't1', info: {}, opts: { address: '192.168.1.10' } }
    manager._validateMinerDataChange({
      id: 't2',
      info: {},
      opts: { address: '192.168.1.10' }
    })
    t.pass()
  })

  test('_isMinerOutsideContainerLocation: true when location does not contain container', (t) => {
    const manager = createManager()
    t.ok(manager._isMinerOutsideContainerLocation({ info: { location: 'site.other' } }))
  })

  test('_isMinerOutsideContainerLocation: false when location contains container', (t) => {
    const manager = createManager()
    t.not(manager._isMinerOutsideContainerLocation({ info: { location: 'site.container' } }))
  })

  test('_isMinerOutsideContainerLocation: false when no location', (t) => {
    const manager = createManager()
    t.not(manager._isMinerOutsideContainerLocation({ info: {} }))
  })

  test('selectThingInfo: returns address and port from opts', (t) => {
    const manager = createManager()
    const thg = { opts: { address: '10.0.0.1', port: 4028 } }
    t.alike(manager.selectThingInfo(thg), { address: '10.0.0.1', port: 4028 })
  })

  test('selectThingInfo: handles missing opts', (t) => {
    const manager = createManager()
    t.alike(manager.selectThingInfo({}), { address: undefined, port: undefined })
  })

  test('getThingType returns miner', (t) => {
    const manager = createManager()
    t.is(manager.getThingType(), 'miner')
  })

  test('validateRegisterThing: throws when opts missing', (t) => {
    const manager = createManager()
    t.exception(() => {
      manager.validateRegisterThing({
        id: 't1',
        info: { serialNum: 'S1' },
        opts: null
      })
    }, /ERR_THING_VALIDATE_OPTS_INVALID/)
  })

  test('validateRegisterThing: runs _validateMinerDataChange', (t) => {
    const manager = createManager({
      things: { t1: { id: 't1', info: { serialNum: 'S1' }, opts: {} } }
    })
    t.exception(() => {
      manager.validateRegisterThing({
        id: 't2',
        info: { serialNum: 'S1' },
        opts: {}
      })
    }, /ERR_THING_SERIALNUM_EXISTS/)
  })

  test('_generateThingId: returns string of length 15', (t) => {
    const manager = createManager()
    const id = manager._generateThingId()
    t.is(typeof id, 'string')
    t.is(id.length, 15)
    t.ok(/^[a-zA-Z0-9]+$/.test(id))
  })

  test('_generateThingId: returns unique ids', (t) => {
    const manager = createManager()
    const ids = new Set()
    for (let i = 0; i < 20; i++) {
      ids.add(manager._generateThingId())
    }
    t.is(ids.size, 20)
  })
}
