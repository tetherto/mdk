'use strict'

const { cloneDeep } = require('@bitfinex/lib-js-util-base')
const { getMinerType, randomNumber } = require('../lib')
const { getRandomIP } = require('../lib/utils')

module.exports = function (fastify) {
  fastify.get('/cgi-bin/miner_type.cgi', (req, res) => {
    res.send({
      miner_type: req.state.version.miner_type,
      subtype: req.state.version.subtype,
      fw_version: req.state.version.fw_version
    })
  })

  fastify.get('/cgi-bin/get_system_info.cgi', (req, res) => {
    res.send({
      minertype: getMinerType(req.ctx.type),
      nettype: req.state.network.nettype,
      netdevice: req.state.network.netdevice,
      macaddr: req.state.network.macaddr,
      hostname: req.state.network.hostname,
      ipaddress: req.ctx.host,
      netmask: req.state.network.netmask,
      gateway: req.state.network.gateway,
      dnsservers: req.state.network.dnsservers,
      system_mode: req.state.version.system_mode,
      system_kernel_version: req.state.version.system_kernel_version,
      system_filesystem_version: req.state.version.system_filesystem_version,
      firmware_type: req.state.version.firmware_type
    })
  })

  fastify.get('/cgi-bin/get_network_info.cgi', (req, res) => {
    res.send({
      ...req.state.network,
      hostname: undefined,
      gateway: undefined,
      dnsservers: undefined
    })
  })

  fastify.get('/cgi-bin/pools.cgi', (req, res) => {
    // miner returns incremental share values
    req.state.pools[0].accepted += parseInt(randomNumber(0, 100))
    req.state.pools[0].rejected += parseInt(randomNumber(0, 30))
    req.state.pools[0].stale += parseInt(randomNumber(0, 10))

    res.send({
      STATUS: {
        STATUS: 'S',
        when: +new Date(),
        Msg: 'pools',
        api_version: '1.0.0'
      },
      INFO: {
        miner_version: req.state.version.miner_version,
        CompileTime: req.state.version.system_filesystem_version,
        type: req.state.version.miner_type
      },
      POOLS: req.state.pools.map(pool => ({
        ...pool,
        pass: undefined
      }))
    })
  })

  fastify.get('/cgi-bin/stats.cgi', (req, res) => {
    res.send({
      STATUS: {
        STATUS: 'S',
        when: +new Date(),
        Msg: 'stats',
        api_version: '1.0.0'
      },
      INFO: {
        miner_version: req.state.version.miner_version,
        CompileTime: req.state.version.system_filesystem_version,
        type: req.state.version.miner_type
      },
      STATS: req.state.conf['bitmain-work-mode'] === '1'
        ? []
        : [{
            ...req.state.stats,
            'miner-mode': parseInt(req.state.conf['bitmain-work-mode'])
          }]
    })
  })

  fastify.get('/cgi-bin/summary.cgi', (req, res) => {
    res.send({
      STATUS: {
        STATUS: 'S',
        when: +new Date(),
        Msg: 'summary',
        api_version: '1.0.0'
      },
      INFO: {
        miner_version: req.state.version.miner_version,
        CompileTime: req.state.version.system_filesystem_version,
        type: req.state.version.miner_type
      },
      SUMMARY: req.state.conf['bitmain-work-mode'] === '1' ? [] : [req.state.summary]
    })
  })

  fastify.get('/cgi-bin/get_miner_conf.cgi', (req, res) => {
    const data = {
      pools: req.state.pools.map(pool => ({
        url: pool.url,
        user: pool.user,
        pass: pool.pass
      })),
      ...req.state.conf
    }
    res.send(data)
  })

  fastify.get('/cgi-bin/get_blink_status.cgi', (req, res) => {
    res.send({
      blink: req.state.led
    })
  })

  fastify.post('/cgi-bin/blink.cgi', (req, res) => {
    try {
      const state = cloneDeep(req.state)
      state.led = Boolean(req.body.blink)

      Object.assign(req.state, state)
      res.send({ code: 'B000' })
    } catch (e) {
      res.send({ code: 'B001' })
    }
  })

  fastify.post('/cgi-bin/set_miner_conf.cgi', (req, res) => {
    try {
      const state = cloneDeep(req.state)
      const body = req.body
      state.pools = state.pools.map((pool, i) => ({
        ...pool,
        url: body.pools[i].url,
        user: body.pools[i].user,
        pass: body.pools[i].pass
      }))
      state.conf = {
        ...state.conf,
        'bitmain-fan-pwm': body['bitmain-fan-pwm'].toString(),
        'bitmain-work-mode': body['miner-mode'].toString()
      }
      Object.assign(req.state, state)
    } catch (e) {
      res.send({ stats: 'error', code: 'M001', msg: 'Invalid pool!' })
    }
  })

  fastify.post('/cgi-bin/set_network_conf.cgi', (req, res) => {
    try {
      if (req.body.ipPro === 1) {
        req.state.network = {
          nettype: 'DHCP',
          netdevice: 'eth0',
          hostname: 'Antminer',
          ipaddress: req.ctx.host,
          netmask: getRandomIP(),
          gateway: '',
          dnsservers: '',
          conf_nettype: 'DHCP',
          conf_hostname: 'Antminer',
          conf_ipaddress: '',
          conf_netmask: '',
          conf_gateway: '',
          conf_dnsservers: ''
        }
      } else if (req.body.ipPro === 2) {
        req.state.network = {
          nettype: 'Static',
          netdevice: 'eth0',
          hostname: req.body.ipHost,
          ipaddress: req.body.ipAddress,
          netmask: req.body.ipSub,
          gateway: req.body.ipGateway,
          dnsservers: req.body.ipDns,
          conf_nettype: 'Static',
          conf_hostname: req.body.ipHost,
          conf_ipaddress: req.body.ipAddress,
          conf_netmask: req.body.ipSub,
          conf_gateway: req.body.ipGateway,
          conf_dnsservers: req.body.ipDns
        }
      } else {
        throw Error('Invalid network!')
      }
      res.send({ stats: 'success', code: 'N000', msg: 'OK!' })
    } catch (e) {
      res.send({ stats: 'error', code: 'N001', msg: 'Invalid network!' })
    }
  })

  fastify.post('/cgi-bin/passwd.cgi', (req, res) => {
    if (req.json.curPwd === 'root') {
      if (req.json.newPwd !== req.json.confirmPwd) {
        res.send({ stats: 'error', code: 'P002', msg: 'New password not match!' })
      } else {
        req.ctx.password = req.json.newPwd
        res.send({ stats: 'success', code: 'P000', msg: 'OK!' })
      }
    } else {
      res.send({ stats: 'error', code: 'P001', msg: 'Current password invalid!' })
    }
  })

  fastify.get('/cgi-bin/reboot.cgi', (req, res) => {
    res.send({
      blink: req.state.led
    })
  })

  fastify.get('/warning', (req, res) => {
    res.send({
      error_message: req.ctx.error ? 'P:2' : 'None'
    })
  })
}
