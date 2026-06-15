'use strict'

const MOCK_MINERS = [{
  id: 'miner-001',
  type: 'antminer-s19',
  code: 'M001',
  info: {
    container: 'container-A',
    serialNum: 'SN-001',
    macAddress: 'AA:BB:CC:DD:EE:01',
    pos: 'A1'
  },
  tags: ['t-miner'],
  rack: 'rack-1',
  comments: [],
  opts: { address: '192.168.1.100' },
  ts: Date.now() - 60000,
  last: {
    ts: Date.now(),
    uptime: 86400,
    alerts: [],
    snap: {
      model: 'Antminer S19 XP',
      stats: {
        status: 'online',
        hashrate_mhs: 140000,
        power_w: 3010,
        efficiency_w_ths: 21.5,
        temperature_c: 65
      },
      config: {
        firmware_ver: '2024.01.01',
        power_mode: 'normal',
        led_status: 'off',
        pool_config: {
          url: 'stratum+tcp://btc.f2pool.com:3333',
          user: 'tether.worker1'
        }
      }
    }
  }
},
{
  id: 'miner-002',
  type: 'antminer-s19',
  code: 'M002',
  info: {
    container: 'container-A',
    serialNum: 'SN-002',
    macAddress: 'AA:BB:CC:DD:EE:02',
    pos: 'A2'
  },
  tags: ['t-miner'],
  rack: 'rack-1',
  comments: [{ text: 'needs maintenance' }],
  opts: { address: '192.168.1.101' },
  ts: Date.now() - 120000,
  last: {
    ts: Date.now(),
    uptime: 172800,
    alerts: [{ type: 'high_temp', severity: 'medium' }],
    snap: {
      model: 'Antminer S19 XP',
      stats: {
        status: 'online',
        hashrate_mhs: 135000,
        power_w: 2980,
        efficiency_w_ths: 22.1,
        temperature_c: 72
      },
      config: {
        firmware_ver: '2024.01.01',
        power_mode: 'normal',
        led_status: 'off',
        pool_config: {
          url: 'stratum+tcp://btc.f2pool.com:3333',
          user: 'tether.worker2'
        }
      }
    }
  }
},
{
  id: 'miner-003',
  type: 'whatsminer-m50s',
  code: 'M003',
  info: {
    container: 'container-B',
    serialNum: 'SN-003',
    macAddress: 'AA:BB:CC:DD:EE:03',
    pos: 'B1'
  },
  tags: ['t-miner'],
  rack: 'rack-2',
  comments: [],
  opts: { address: '192.168.2.100' },
  ts: Date.now() - 180000,
  last: {
    ts: Date.now() - 300000,
    uptime: 3600,
    alerts: [],
    snap: {
      model: 'Whatsminer M50S',
      stats: {
        status: 'error',
        hashrate_mhs: 0,
        power_w: 50,
        efficiency_w_ths: 0,
        temperature_c: 30
      },
      config: {
        firmware_ver: '2023.12.15',
        power_mode: 'normal',
        led_status: 'on',
        pool_config: {
          url: 'stratum+tcp://ocean.xyz:3333',
          user: 'tether.worker3'
        }
      }
    }
  }
},
{
  id: 'miner-004',
  type: 'antminer-s19',
  code: 'M004',
  info: {
    container: 'container-B',
    serialNum: 'SN-004',
    macAddress: 'AA:BB:CC:DD:EE:04',
    pos: 'B2'
  },
  tags: ['t-miner'],
  rack: 'rack-2',
  comments: [],
  opts: { address: '192.168.2.101' },
  ts: Date.now() - 240000,
  last: {
    ts: Date.now(),
    uptime: 43200,
    alerts: [],
    snap: {
      model: 'Antminer S19 XP',
      stats: {
        status: 'sleep',
        hashrate_mhs: 0,
        power_w: 10,
        efficiency_w_ths: 0,
        temperature_c: 25
      },
      config: {
        firmware_ver: '2024.01.01',
        power_mode: 'sleep',
        led_status: 'off',
        pool_config: {
          url: 'stratum+tcp://btc.f2pool.com:3333',
          user: 'tether.worker4'
        }
      }
    }
  }
},
{
  id: 'miner-005',
  type: 'antminer-s19',
  code: 'M005',
  info: {
    container: 'container-A',
    serialNum: 'SN-005',
    macAddress: 'AA:BB:CC:DD:EE:05',
    pos: 'A3'
  },
  tags: ['t-miner'],
  rack: 'rack-1',
  comments: [],
  opts: { address: '192.168.1.102' },
  ts: Date.now() - 300000,
  last: {
    ts: Date.now(),
    uptime: 259200,
    alerts: [{ type: 'low_hashrate', severity: 'high' }],
    snap: {
      model: 'Antminer S19 XP',
      stats: {
        status: 'online',
        hashrate_mhs: 120000,
        power_w: 2900,
        efficiency_w_ths: 24.2,
        temperature_c: 68
      },
      config: {
        firmware_ver: '2023.12.15',
        power_mode: 'low',
        led_status: 'off',
        pool_config: {
          url: 'stratum+tcp://btc.f2pool.com:3333',
          user: 'tether.worker5'
        }
      }
    }
  }
}
]
module.exports = { MOCK_MINERS }
