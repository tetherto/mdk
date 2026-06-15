'use strict'

const Base = require('@bitfinex/bfx-facs-base')

class MDKNetFacility extends Base {
  constructor (caller, opts, ctx) {
    super(caller, opts, ctx)

    this.name = 'mdk-net'
    this._hasConf = true

    this.init()
  }

  async disconnectThing (thg) {
    if (!thg.ctrl) {
      return
    }

    try {
      thg.ctrl.close()
    } catch (e) {}

    delete thg.ctrl
  }

  async setIpThing (thg, forceSetIp = false) {
    if (!this.conf.dhcpRpcPublicKey) {
      throw new Error('ERR_WRK_DHCP_KEY_INVALID')
    }

    if (!thg.info) {
      throw new Error('ERR_THG_INFO_INVALID')
    }

    if (!thg.info.macAddress || !thg.info.subnet) {
      throw new Error('ERR_THG_INFO_MAC_SUBNET_INVALID')
    }

    const facNet = this.opts.fac_net
    const res = await facNet.jRequest(
      this.conf.dhcpRpcPublicKey,
      'setIp',
      { mac: thg.info.macAddress, subnet: thg.info.subnet, forceSetIp }
    )

    thg.opts.address = res

    return 1
  }

  async releaseIpThing (thg) {
    if (!this.conf.dhcpRpcPublicKey) {
      throw new Error('ERR_WRK_DHCP_KEY_INVALID')
    }

    if (!thg.opts?.address) {
      throw new Error('ERR_THG_ADDRESS_INVALID')
    }

    const facNet = this.opts.fac_net
    await facNet.jRequest(
      this.conf.dhcpRpcPublicKey,
      'releaseIp',
      { ip: thg.opts.address }
    )

    thg.opts.address = ''

    return 1
  }
}

module.exports = MDKNetFacility
