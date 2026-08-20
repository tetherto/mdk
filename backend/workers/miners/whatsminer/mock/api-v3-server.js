'use strict'

const net = require('node:net')
const crypto = require('node:crypto')
const zlib = require('node:zlib')
const { FrameDecoder, encodeFrame } = require('../lib/protocols/wm-api-v3-transport')

const SENSITIVE_PARAM_COMMANDS = new Set([
  'set.miner.pools',
  'set.user.change_passwd'
])

const DEFAULT_STATE = {
  salt: '5QAHiKMb',
  logData: zlib.gzipSync(Buffer.from('mock WhatsMiner API v3 diagnostic logs\n')),
  firmwareData: null,
  summary: {
    elapsed: 1074,
    'bootup-time': 1175,
    'freq-avg': 788,
    'target-freq': 0,
    'factory-hash': 101.366,
    'hash-average': 101.847,
    'hash-1min': 102.072,
    'hash-15min': 101.847,
    'hash-realtime': 101.847,
    'power-rate': 31.886,
    'power-5min': 3247.641,
    'power-on-stats': {
      'energy-ws': 70653003,
      'total-ths': 1949569,
      'total-pool-ths': 1832965,
      'reject-percent': 0
    },
    'power-realtime': 3268,
    'environment-temperature': 34.8,
    'board-temperature': [69.6, 70.1, 72.3],
    'chip-temp-min': 83.2,
    'chip-temp-avg': 92.9,
    'chip-temp-max': 100.3,
    'power-limit': 3500,
    'up-freq-finish': 1,
    'fan-speed-in': 4980,
    'fan-speed-out': 5070
  },
  pools: [{
    id: 1,
    url: 'stratum+tcp://pool.example:3333',
    status: 'alive',
    account: 'worker.1',
    'stratum-active': true,
    'reject-percent': 4.5,
    'last-share-time': 1692685469
  }],
  edevs: [{
    id: 0,
    slot: 0,
    'hash-average': 33.972,
    'factory-hash': 33.789,
    freq: 785,
    'effective-chips': 70,
    'chip-temp-min': 84.9,
    'chip-temp-avg': 92.2,
    'chip-temp-max': 97.4
  }],
  setting: {
    'power-mode': 'normal',
    'power-limit': 3500,
    'upfreq-speed': 2,
    'target-freq': 0,
    power: 0,
    'power-percent': 100,
    'fast-hash': 'disable'
  },
  deviceInfo: {
    network: {
      ip: '192.168.2.136',
      proto: 'dhcp',
      netmask: '255.255.255.0',
      dns: '192.168.2.1',
      gateway: '192.168.2.1',
      hostname: 'WhatsMiner',
      mac: '00:11:22:33:44:55'
    },
    miner: { type: 'M50S', working: 'true', 'miner-sn': 'MINER-MOCK', UpfreqSpeed: '2' },
    system: {
      api: '3.0.0',
      platform: 'H616',
      fwversion: '20260819.mock',
      'control-board-version': 'CB6V10',
      ledstatus: 'auto'
    },
    power: {
      type: 'P221C',
      hwversion: 'R00033',
      swversion: 'P00031',
      model: 'P22-12-3300-C',
      fanspeed: 6112,
      iin: 14.8,
      vin: 220.5,
      sn: 'PSU-MOCK',
      vendor: '1'
    },
    'error-code': []
  }
}

function getAuthKey (request, state, password) {
  return crypto.createHash('sha256')
    .update(`${request.cmd}${password}${state.salt}${request.ts}`)
    .digest()
}

function decryptParam (request, key) {
  const decipher = crypto.createDecipheriv('aes-256-ecb', key, null)
  return JSON.parse(Buffer.concat([
    decipher.update(Buffer.from(request.param, 'base64')),
    decipher.final()
  ]).toString('utf8'))
}

function getResponse (request, state, { password = 'super' } = {}) {
  const { cmd } = request
  let { param } = request

  if (cmd === 'get.device.info') {
    const all = { ...state.deviceInfo, salt: state.salt }
    return {
      code: 0,
      when: 1692685512,
      msg: param === undefined ? all : { [param]: all[param] },
      desc: cmd
    }
  }

  if (cmd === 'get.miner.setting') {
    return { code: 0, when: 1692685512, msg: state.setting, desc: cmd }
  }

  if (cmd === 'get.miner.status') {
    const msg = {}
    for (const section of String(param || '').split('+')) {
      if (section === 'summary') msg.summary = state.summary
      if (section === 'pools') msg.pools = state.pools
      if (section === 'edevs') msg.edevs = state.edevs
    }
    return { code: 0, when: 1692685512, msg, desc: cmd }
  }

  if (cmd === 'get.log.download') {
    return {
      code: 0,
      when: 1692685512,
      msg: { logsize: String(state.logData.length) },
      desc: cmd
    }
  }

  if (String(cmd || '').startsWith('set.')) {
    if (!request.ts || !request.token || !request.account) {
      return { code: -4, when: 1692685512, msg: 'no permission', desc: cmd }
    }

    const key = getAuthKey(request, state, password)
    if (request.token !== key.toString('base64').substring(0, 8)) {
      return { code: -4, when: 1692685512, msg: 'no permission', desc: cmd }
    }

    if (SENSITIVE_PARAM_COMMANDS.has(cmd)) {
      try {
        param = decryptParam(request, key)
      } catch (error) {
        return { code: -1, when: 1692685512, msg: 'invalid encrypted param', desc: cmd }
      }
    }

    if (cmd === 'set.miner.power_mode') state.setting['power-mode'] = param
    if (cmd === 'set.miner.service') state.service = param
    if (cmd === 'set.miner.power_percent') {
      if (typeof param?.percent !== 'string') {
        return { code: -1, when: 1692685512, msg: 'percent must be a string', desc: cmd }
      }
      state.setting['power-percent'] = Number(param.percent)
    }
    if (cmd === 'set.system.led') state.deviceInfo.system.ledstatus = param === 'auto' ? 'auto' : 'manual'
    if (cmd === 'set.miner.pools') {
      state.pools = param.map((pool, index) => ({
        id: index + 1,
        url: pool.pool,
        account: pool.worker,
        status: 'alive'
      }))
    }
    if (cmd === 'set.system.net_config') {
      if (param === 'dhcp') {
        state.deviceInfo.network.proto = 'dhcp'
      } else if (param?.ip && param?.netmask && param?.gateway && param?.dns) {
        state.deviceInfo.network = {
          ...state.deviceInfo.network,
          proto: 'static',
          ip: param.ip,
          netmask: param.netmask,
          gateway: param.gateway,
          dns: param.dns
        }
      } else {
        return { code: -1, when: 1692685512, msg: 'invalid network config', desc: cmd }
      }
    }
    if (cmd === 'set.system.hostname') {
      if (typeof param?.hostname !== 'string' || !param.hostname) {
        return { code: -1, when: 1692685512, msg: 'invalid hostname', desc: cmd }
      }
      state.deviceInfo.network.hostname = param.hostname
    }
    if (cmd === 'set.system.update_firmware') {
      return { code: 0, when: 1692685512, msg: 'ready', desc: cmd }
    }

    return { code: 0, when: 1692685512, msg: 'ok', desc: cmd }
  }

  return { code: -2, when: 1692685512, msg: 'invalid command', desc: cmd || '' }
}

function createServer ({ host = '127.0.0.1', port = 0, state = {}, fragmentResponses = false, password = 'super' } = {}) {
  const mergedState = {
    ...DEFAULT_STATE,
    ...state,
    deviceInfo: {
      ...DEFAULT_STATE.deviceInfo,
      ...state.deviceInfo,
      network: { ...DEFAULT_STATE.deviceInfo.network, ...state.deviceInfo?.network },
      system: { ...DEFAULT_STATE.deviceInfo.system, ...state.deviceInfo?.system },
      miner: { ...DEFAULT_STATE.deviceInfo.miner, ...state.deviceInfo?.miner },
      power: { ...DEFAULT_STATE.deviceInfo.power, ...state.deviceInfo?.power }
    }
  }
  mergedState.logData = Buffer.isBuffer(mergedState.logData)
    ? mergedState.logData
    : Buffer.from(mergedState.logData)
  const requests = []
  const sockets = new Set()
  const server = net.createServer((socket) => {
    sockets.add(socket)
    const decoder = new FrameDecoder()
    let uploadBuffer = Buffer.alloc(0)
    let uploadSize
    let receivingFirmware = false
    socket.once('close', () => sockets.delete(socket))
    socket.on('data', (chunk) => {
      if (receivingFirmware) {
        uploadBuffer = Buffer.concat([uploadBuffer, chunk])
        if (uploadSize === undefined && uploadBuffer.length >= 4) {
          uploadSize = uploadBuffer.readUInt32LE(0)
          uploadBuffer = uploadBuffer.subarray(4)
        }
        if (uploadSize !== undefined && uploadBuffer.length >= uploadSize) {
          mergedState.firmwareData = Buffer.from(uploadBuffer.subarray(0, uploadSize))
          mergedState.deviceInfo.system.fwversion = 'uploaded.mock'
          socket.end(encodeFrame(JSON.stringify({
            code: 0,
            when: 1692685512,
            msg: 'ok',
            desc: 'set.system.update_firmware'
          })))
        }
        return
      }
      let frames
      try {
        frames = decoder.push(chunk)
      } catch (error) {
        socket.destroy()
        return
      }

      for (const frame of frames) {
        let request
        try {
          request = JSON.parse(frame.toString('utf8'))
        } catch (error) {
          socket.end(encodeFrame(JSON.stringify({ code: -1, msg: 'invalid json', desc: '' })))
          continue
        }

        requests.push(request)
        const response = encodeFrame(JSON.stringify(getResponse(request, mergedState, { password })))
        const packet = request.cmd === 'get.log.download'
          ? Buffer.concat([response, mergedState.logData])
          : response
        if (request.cmd === 'set.system.update_firmware') {
          receivingFirmware = true
          socket.write(packet)
          continue
        }
        if (fragmentResponses) {
          socket.write(packet.subarray(0, 2))
          socket.write(packet.subarray(2, 7))
          socket.end(packet.subarray(7))
        } else {
          socket.end(packet)
        }
      }
    })
  })

  const ready = new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => resolve(server.address()))
  })

  return {
    server,
    state: mergedState,
    requests,
    ready,
    async close () {
      for (const socket of sockets) socket.destroy()
      await new Promise((resolve) => server.close(resolve))
    }
  }
}

module.exports = { DEFAULT_STATE, getResponse, createServer }
