'use strict'

const test = require('brittle')
const path = require('path')
const Base = require('@bitfinex/bfx-facs-base')
const MDKNetFacility = require('../../index.js')

// Store original init method
const originalInit = Base.prototype.init

// Mock init to avoid reading config files
Base.prototype.init = function () {
  // Only call original init if _hasConf is false, otherwise just set empty conf
  if (this._hasConf && !this.conf) {
    this.conf = {}
  } else if (!this._hasConf) {
    originalInit.call(this)
  }
}

// Helper function to create a facility with proper context
function createFacility (opts = {}) {
  const mockCtx = {
    root: path.join(__dirname, '../..'),
    env: 'test'
  }
  const mockCaller = {
    ctx: mockCtx
  }
  const mockOpts = { ...opts }

  return new MDKNetFacility(mockCaller, mockOpts, mockCtx)
}

test('constructor initializes correctly', (t) => {
  const facility = createFacility()

  t.ok(facility, 'facility instance created')
  t.is(facility.name, 'mdk-net', 'name is set correctly')
  t.is(facility._hasConf, true, '_hasConf is set correctly')
})

test('disconnectThing returns early when thg.ctrl is missing', async (t) => {
  const facility = createFacility()
  const thg = {}

  await facility.disconnectThing(thg)

  t.ok(true, 'disconnectThing completes without error when ctrl is missing')
})

test('disconnectThing closes ctrl and deletes it', async (t) => {
  const facility = createFacility()
  let closeCalled = false
  const thg = {
    ctrl: {
      close: () => {
        closeCalled = true
      }
    }
  }

  await facility.disconnectThing(thg)

  t.ok(closeCalled, 'close was called')
  t.ok(!thg.ctrl, 'ctrl was deleted')
})

test('disconnectThing handles close errors gracefully', async (t) => {
  const facility = createFacility()
  const thg = {
    ctrl: {
      close: () => {
        throw new Error('Close error')
      }
    }
  }

  await facility.disconnectThing(thg)

  t.ok(!thg.ctrl, 'ctrl was deleted even when close throws')
})

test('setIpThing throws ERR_WRK_DHCP_KEY_INVALID when dhcpRpcPublicKey is missing', async (t) => {
  const facility = createFacility()
  facility.conf = {}
  const thg = {
    info: {
      macAddress: '00:11:22:33:44:55',
      subnet: '192.168.1.0/24'
    }
  }

  await t.exception(async () => {
    await facility.setIpThing(thg)
  }, 'ERR_WRK_DHCP_KEY_INVALID')
})

test('setIpThing throws ERR_THG_INFO_INVALID when thg.info is missing', async (t) => {
  const facility = createFacility()
  facility.conf = {
    dhcpRpcPublicKey: 'test-key'
  }
  const thg = {}

  await t.exception(async () => {
    await facility.setIpThing(thg)
  }, 'ERR_THG_INFO_INVALID')
})

test('setIpThing throws ERR_THG_INFO_MAC_SUBNET_INVALID when macAddress is missing', async (t) => {
  const facility = createFacility()
  facility.conf = {
    dhcpRpcPublicKey: 'test-key'
  }
  const thg = {
    info: {
      subnet: '192.168.1.0/24'
    }
  }

  await t.exception(async () => {
    await facility.setIpThing(thg)
  }, 'ERR_THG_INFO_MAC_SUBNET_INVALID')
})

test('setIpThing throws ERR_THG_INFO_MAC_SUBNET_INVALID when subnet is missing', async (t) => {
  const facility = createFacility()
  facility.conf = {
    dhcpRpcPublicKey: 'test-key'
  }
  const thg = {
    info: {
      macAddress: '00:11:22:33:44:55'
    }
  }

  await t.exception(async () => {
    await facility.setIpThing(thg)
  }, 'ERR_THG_INFO_MAC_SUBNET_INVALID')
})

test('setIpThing successfully sets IP address', async (t) => {
  const mockIp = '192.168.1.100'
  const mockFacNet = {
    jRequest: async (key, method, params) => {
      t.is(key, 'test-key', 'correct key passed')
      t.is(method, 'setIp', 'correct method passed')
      t.is(params.mac, '00:11:22:33:44:55', 'correct mac passed')
      t.is(params.subnet, '192.168.1.0/24', 'correct subnet passed')
      t.is(params.forceSetIp, false, 'forceSetIp defaults to false')
      return mockIp
    }
  }

  const facility = createFacility({ fac_net: mockFacNet })
  facility.conf = {
    dhcpRpcPublicKey: 'test-key'
  }

  const thg = {
    info: {
      macAddress: '00:11:22:33:44:55',
      subnet: '192.168.1.0/24'
    },
    opts: {}
  }

  const result = await facility.setIpThing(thg)

  t.is(result, 1, 'returns 1 on success')
  t.is(thg.opts.address, mockIp, 'address is set correctly')
})

test('setIpThing passes forceSetIp parameter', async (t) => {
  const mockIp = '192.168.1.100'
  const mockFacNet = {
    jRequest: async (key, method, params) => {
      t.is(params.forceSetIp, true, 'forceSetIp is passed correctly')
      return mockIp
    }
  }

  const facility = createFacility({ fac_net: mockFacNet })
  facility.conf = {
    dhcpRpcPublicKey: 'test-key'
  }

  const thg = {
    info: {
      macAddress: '00:11:22:33:44:55',
      subnet: '192.168.1.0/24'
    },
    opts: {}
  }

  await facility.setIpThing(thg, true)

  t.is(thg.opts.address, mockIp, 'address is set correctly')
})

test('releaseIpThing throws ERR_WRK_DHCP_KEY_INVALID when dhcpRpcPublicKey is missing', async (t) => {
  const facility = createFacility()
  facility.conf = {}
  const thg = {
    opts: {
      address: '192.168.1.100'
    }
  }

  await t.exception(async () => {
    await facility.releaseIpThing(thg)
  }, 'ERR_WRK_DHCP_KEY_INVALID')
})

test('releaseIpThing throws ERR_THG_ADDRESS_INVALID when address is missing', async (t) => {
  const facility = createFacility()
  facility.conf = {
    dhcpRpcPublicKey: 'test-key'
  }
  const thg = {
    opts: {}
  }

  await t.exception(async () => {
    await facility.releaseIpThing(thg)
  }, 'ERR_THG_ADDRESS_INVALID')
})

test('releaseIpThing throws ERR_THG_ADDRESS_INVALID when opts is missing', async (t) => {
  const facility = createFacility()
  facility.conf = {
    dhcpRpcPublicKey: 'test-key'
  }
  const thg = {}

  await t.exception(async () => {
    await facility.releaseIpThing(thg)
  }, 'ERR_THG_ADDRESS_INVALID')
})

test('releaseIpThing successfully releases IP address', async (t) => {
  const mockIp = '192.168.1.100'
  let jRequestCalled = false
  const mockFacNet = {
    jRequest: async (key, method, params) => {
      jRequestCalled = true
      t.is(key, 'test-key', 'correct key passed')
      t.is(method, 'releaseIp', 'correct method passed')
      t.is(params.ip, mockIp, 'correct ip passed')
    }
  }

  const facility = createFacility({ fac_net: mockFacNet })
  facility.conf = {
    dhcpRpcPublicKey: 'test-key'
  }

  const thg = {
    opts: {
      address: mockIp
    }
  }

  const result = await facility.releaseIpThing(thg)

  t.ok(jRequestCalled, 'jRequest was called')
  t.is(result, 1, 'returns 1 on success')
  t.is(thg.opts.address, '', 'address is cleared')
})
