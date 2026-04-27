'use strict'

const { randomNumber, getRandomIP, getMinerType, getHashrate } = require('../lib')
const { cloneDeep } = require('@bitfinex/lib-js-util-base')

module.exports = function (ctx) {
  const state = {
    led: false,
    currentTemp: 32,
    startTime: +new Date(),
    version: {
      miner_version: '20.3',
      miner_type: getMinerType(ctx.type),
      subtype: 'zynq7007_HHB56XXX',
      fw_version: 'Wed Jul 20 19:14:27 CST 2022',
      system_mode: 'GNU/Linux',
      system_kernel_version: 'Linux 4.6.0-xilinx-g03c746f7 #1 SMP PREEMPT Thu Mar 31 19:01:56 CST 2022',
      system_filesystem_version: 'Wed Jul 20 19:14:27 CST 2022',
      firmware_type: 'Release'
    },
    network: {
      nettype: 'DHCP',
      netdevice: 'eth0',
      macaddr: '80:AC:7A:CD:50:64',
      hostname: 'Antminer',
      ipaddress: ctx.host,
      netmask: getRandomIP(),
      gateway: '',
      dnsservers: '',
      conf_nettype: 'DHCP',
      conf_hostname: 'Antminer',
      conf_ipaddress: '',
      conf_netmask: '',
      conf_gateway: '',
      conf_dnsservers: ''
    },
    pools: [
      {
        index: 0,
        url: 'stratum+tcp://btc.f2pool.com:1314',
        user: 'haven7346',
        status: 'Alive',
        pass: 'xxxx',
        priority: 0,
        getworks: 0,
        accepted: 0,
        rejected: 0,
        discarded: 0,
        stale: 0,
        diff: '',
        diff1: 0,
        diffa: 0,
        diffr: 0,
        diffs: 0,
        lsdiff: 0,
        lstime: '0'
      },
      {
        index: 1,
        url: 'stratum+tcp://btc-asia.f2pool.com:1314',
        user: 'haven7346',
        status: 'Alive',
        pass: 'xxxx',
        priority: 1,
        getworks: 0,
        accepted: 0,
        rejected: 0,
        discarded: 0,
        stale: 0,
        diff: '',
        diff1: 0,
        diffa: 0,
        diffr: 0,
        diffs: 0,
        lsdiff: 0,
        lstime: '0'
      },
      {
        index: 2,
        url: 'stratum+tcp://btc-euro.f2pool.com:1314',
        user: 'haven7346',
        pass: 'xxxx',
        status: 'Alive',
        priority: 2,
        getworks: 0,
        accepted: 0,
        rejected: 0,
        discarded: 0,
        stale: 0,
        diff: '',
        diff1: 0,
        diffa: 0,
        diffr: 0,
        diffs: 0,
        lsdiff: 0,
        lstime: '0'
      }
    ],
    conf: {
      'api-listen': true,
      'api-network': true,
      'api-groups': 'A:stats:pools:devs:summary:version',
      'api-allow': 'A:0/0,W:*',
      'bitmain-fan-ctrl': false,
      'bitmain-fan-pwm': '100',
      'bitmain-use-vil': true,
      'bitmain-freq': '485',
      'bitmain-voltage': '1980',
      'bitmain-ccdelay': '0',
      'bitmain-pwth': '4',
      'bitmain-work-mode': '0',
      'bitmain-freq-level': '100'
    },
    stats: {
      ...getHashrate(),
      elapsed: 0,
      rate_ideal: 257000,
      rate_unit: 'GH/s',
      chain_num: 3,
      fan_num: 4,
      fan: [0, 0, 0, 0],
      hwp_total: 0.0,
      'freq-level': 100,
      chain: [0, 1, 2].map(i => ({
        index: i,
        freq_avg: 0,
        rate_ideal: 86628,
        rate_real: 0.0,
        asic_num: 204,
        asic: ' oooooooooooo oooooooooooo oooooooooooo oooooooooooo oooooooooooo oooooooooooo oooooooooooo oooooooooooo oooooooooooo oooooooooooo oooooooooooo oooooooooooo oooooooooooo oooooooooooo oooooooooooo oooooooooooo oooooooooooo',
        temp_pic: [74, 47, 60, 63],
        temp_pcb: [84, 57, 70, 73],
        temp_chip: [89, 62, 75, 78],
        hw: 0,
        eeprom_loaded: true,
        sn: 'PIEMYPHBCJACJ0A23',
        hwp: 0.0,
        tpl: [
          [12, 13, 36, 37, 60, 61, 84, 85, 108, 109, 132, 133, 156, 157, 180, 181, 204],
          [11, 14, 35, 38, 59, 62, 83, 86, 107, 110, 131, 134, 155, 158, 179, 182, 203],
          [10, 15, 34, 39, 58, 63, 82, 87, 106, 111, 130, 135, 154, 159, 178, 183, 202],
          [9, 16, 33, 40, 57, 64, 81, 88, 105, 112, 129, 136, 153, 160, 177, 184, 201],
          [8, 17, 32, 41, 56, 65, 80, 89, 104, 113, 128, 137, 152, 161, 176, 185, 200],
          [7, 18, 31, 42, 55, 66, 79, 90, 103, 114, 127, 138, 151, 162, 175, 186, 199],
          [6, 19, 30, 43, 54, 67, 78, 91, 102, 115, 126, 139, 150, 163, 174, 187, 198],
          [5, 20, 29, 44, 53, 68, 77, 92, 101, 116, 125, 140, 149, 164, 173, 188, 197],
          [4, 21, 28, 45, 52, 69, 76, 93, 100, 117, 124, 141, 148, 165, 172, 189, 196],
          [3, 22, 27, 46, 51, 70, 75, 94, 99, 118, 123, 142, 147, 166, 171, 190, 195],
          [2, 23, 26, 47, 50, 71, 74, 95, 98, 119, 122, 143, 146, 167, 170, 191, 194],
          [1, 24, 25, 48, 49, 72, 73, 96, 97, 120, 121, 144, 145, 168, 169, 192, 193]
        ]
      }))
    },
    summary: {
      ...getHashrate(),
      elapsed: 0,
      bestshare: 0
    }
  }

  const updateState = () => {
    const newState = cloneDeep(state)

    const newTemp = (newState.currentTemp + (newState.conf['bitmain-work-mode'] === '1' ? -100 : 100))
    if (newTemp > 100) newState.currentTemp = 100
    if (newTemp < 27) newState.currentTemp = 27
    newState.currentTemp = newTemp

    if (state.conf['bitmain-work-mode'] === '1') {
      newState.pools.forEach(pool => {
        pool.accepted = 0
        pool.status = 'Disabled'
      })
    } else {
      newState.stats.chain.forEach(chain => {
        chain.freq_avg = (475 + chain.freq_avg) / 2
        chain.rate_real = Math.floor((randomNumber() * (0.001) + 0.999) * 8662800) / 100
        chain.temp_pic = chain.temp_pic.map(() => randomNumber(newState.currentTemp - 2, newState.currentTemp + 2))
        chain.temp_pcb = chain.temp_pcb.map(() => randomNumber(newState.currentTemp - 2, newState.currentTemp + 2))
        chain.temp_chip = chain.temp_chip.map(() => randomNumber(newState.currentTemp - 2, newState.currentTemp + 2))
      })

      Object.assign(newState.summary, {
        elapsed: Math.floor((+new Date() - newState.startTime) / 1000),
        ...getHashrate(),
        rate_ideal: 257000
      })

      newState.pools[0].accepted += Math.floor(randomNumber(0, 3))
      newState.pools.forEach(pool => {
        pool.status = 'Alive'
      })
    }

    Object.assign(state, newState)

    return state
  }

  updateState()

  const initialState = JSON.parse(JSON.stringify(state))

  function cleanup () {
    Object.assign(state, initialState)

    return state
  }

  return { state, cleanup }
}
