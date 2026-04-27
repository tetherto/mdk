/**
 * Synthetic demo data for the Device Explorer page.
 *
 * All identifiers (IDs, serials, MAC addresses, IP addresses, site names,
 * comments, users) are fully fabricated. MAC addresses use the 02:xx
 * locally-administered prefix so they cannot collide with real hardware.
 */

const SITE = 'Demo Site'
const DEMO_USER = 'operator1@example.com'
const NOW = Date.UTC(2026, 0, 1)

const pad = (n: number, width = 3) => String(n).padStart(width, '0')

const mac = (n: number): string => {
  const hi = pad(Math.floor(n / 256), 2)
  const lo = pad(n % 256, 2)
  return `02:00:00:00:${hi}:${lo}`
}

const ip = (n: number): string => `192.168.1.${n}`

const demoComment = (n: number) => ({
  ts: NOW - n * 60_000,
  comment: `Demo comment ${n}`,
  user: DEMO_USER,
})

type MinerStatus = 'online' | 'offline' | 'error' | 'maintenance'

const MINER_TYPE = 'miner-demo-m1'

const makeMiner = (n: number, status: MinerStatus) => {
  const id = `miner-${pad(n)}`
  const code = `DEMO-M${pad(n)}`
  const serialNum = `SN-M${pad(n)}`
  const macAddress = mac(n)
  const isOnline = status === 'online'
  const container = status === 'maintenance' ? 'maintenance' : `demo-container-${((n - 1) % 2) + 1}`

  const info = {
    site: SITE,
    container,
    pos: isOnline ? `row-${n}` : '',
    serialNum,
    macAddress,
    createdAt: NOW - 30 * 24 * 60 * 60 * 1000,
    updatedAt: NOW,
  }

  const stats = isOnline
    ? {
        status: 'online',
        uptime_ms: 6 * 60 * 60 * 1000,
        power_w: 3100,
        hashrate_mhs: { t_5m: 110_000_000 },
        poolHashrate: '108 TH/s',
        temperature_c: { max: 62 },
      }
    : { status }

  const config = isOnline
    ? { firmware_ver: '1.0.0-demo', power_mode: 'normal', led_status: false }
    : undefined

  return {
    id,
    type: MINER_TYPE,
    shortCode: code,
    code,
    container,
    position: info.pos,
    address: isOnline ? ip(n) : null,
    ip: isOnline ? ip(n) : null,
    status: stats.status,
    isPoolStatsEnabled: true,
    tags: ['t-miner', MINER_TYPE, `code-${code}`, `container-${container}`],
    info,
    stats,
    config,
    alerts: null,
    error: status === 'error' ? 'demo_error' : null,
    err: null,
    device: {
      id,
      code,
      type: MINER_TYPE,
      info,
      address: isOnline ? ip(n) : null,
      port: 5020,
      last: {
        alerts: null,
        err: null,
        snap: {
          stats,
          ...(config ? { config } : {}),
        },
      },
      isRaw: true,
    },
  }
}

const CONTAINER_TYPES = [
  'container-demo-a',
  'container-demo-b',
  'container-demo-c',
  'container-demo-d',
] as const

type ContainerStatus = 'running' | 'stopped' | 'offline' | 'error'

const makeContainer = (n: number, type: string, status: ContainerStatus) => {
  const id = `container-${pad(n)}`
  const code = `DEMO-C${pad(n)}`
  const containerKey = `demo-container-${n}`

  return {
    id,
    type,
    code,
    tags: ['t-container', type, `container-${containerKey}`],
    info: {
      site: SITE,
      container: containerKey,
      serialNum: `SN-C${pad(n)}`,
      macAddress: mac(100 + n),
      subnet: '192.168.1.0/24',
      createdAt: NOW - 30 * 24 * 60 * 60 * 1000,
      updatedAt: NOW,
    },
    rack: `${type}-shelf-0`,
    address: ip(100 + n),
    port: 6000 + n,
    comments: n === 1 ? [demoComment(1)] : [],
    last: {
      alerts: null,
      err: status === 'error' ? 'demo_error' : null,
      snap: {
        stats: {
          status,
          power_w: status === 'running' ? 1_200_000 + n * 10_000 : 0,
          ambient_temp_c: 28 + n,
          humidity_percent: 55 + n,
        },
      },
    },
    isRaw: true,
  }
}

const makeCabinet = (n: number) => ({
  id: `lv-${pad(n)}`,
  type: 'cabinet-lv',
  code: `DEMO-CAB${pad(n)}`,
  tags: ['t-cabinet', 'cabinet-lv', `id-lv-${pad(n)}`],
  info: {
    site: SITE,
    container: `demo-cabinet-${n}`,
    serialNum: `SN-CAB${pad(n)}`,
  },
  rootTempSensor: {
    id: `tempsensor-${pad(n)}`,
    type: 'tempsensor',
    last: { snap: { stats: { temp_c: 45 + n } } },
  },
  powerMeters: [
    {
      id: `pm-${pad(n)}-a`,
      type: 'powermeter',
      last: { snap: { stats: { power_w: 500_000 + n * 25_000 } } },
    },
    {
      id: `pm-${pad(n)}-b`,
      type: 'powermeter',
      last: { snap: { stats: { power_w: 300_000 + n * 15_000 } } },
    },
  ],
  last: { alerts: null, err: null, snap: { stats: { status: 'running' } } },
})

const MINER_STATUSES: MinerStatus[] = ['online', 'offline', 'error', 'maintenance']
const CONTAINER_STATUSES: ContainerStatus[] = ['running', 'stopped', 'offline', 'error']

export const minersData = MINER_STATUSES.map((status, i) => makeMiner(i + 1, status))

export const containerData = CONTAINER_TYPES.map((type, i) =>
  makeContainer(i + 1, type, CONTAINER_STATUSES[i] ?? 'running'),
)

export const cabinetData = [1, 2].map(makeCabinet)
