'use strict'

// Contract mirroring the old Whatsminer parity stub: 13 telemetry channels
// (the WM fields the old collectThingSnap returned) and the hardware
// commands from the old ACTION_TYPES. rackReboot and downloadLogs are
// declared here — under the runtime a worker must publish them in its
// contract for the Kernel to accept them (the old gap-2/gap-3 fixes).
module.exports = {
  metadata: {
    provider: 'microbt',
    deviceFamily: 'miner',
    brand: 'Whatsminer',
    modelsSupported: ['M56S'],
    overview: 'Whatsminer stub for MDK parity testing'
  },
  capabilities: {
    telemetry: [
      { name: 'hashrate_rt', type: 'number', unit: 'TH/s', description: 'Real-time hashrate', handler: 'src/telemetry/hashrate-rt.js' },
      { name: 'hashrate_avg', type: 'number', unit: 'TH/s', description: 'Average hashrate', handler: 'src/telemetry/hashrate-avg.js' },
      { name: 'power', type: 'number', unit: 'W', description: 'Power draw', handler: 'src/telemetry/power.js' },
      { name: 'temperature', type: 'number', unit: 'C', description: 'Chip temperature', handler: 'src/telemetry/temperature.js' },
      { name: 'fan_speed_in', type: 'number', unit: 'RPM', description: 'Inlet fan speed', handler: 'src/telemetry/fan-speed-in.js' },
      { name: 'fan_speed_out', type: 'number', unit: 'RPM', description: 'Outlet fan speed', handler: 'src/telemetry/fan-speed-out.js' },
      { name: 'status', type: 'string', unit: '', description: 'Device status', handler: 'src/telemetry/status.js' },
      { name: 'uptime', type: 'number', unit: 's', description: 'Uptime seconds', handler: 'src/telemetry/uptime.js' },
      { name: 'accepted_shares', type: 'number', unit: '', description: 'Accepted shares', handler: 'src/telemetry/accepted-shares.js' },
      { name: 'rejected_shares', type: 'number', unit: '', description: 'Rejected shares', handler: 'src/telemetry/rejected-shares.js' },
      { name: 'pool_url', type: 'string', unit: '', description: 'Active pool URL', handler: 'src/telemetry/pool-url.js' },
      { name: 'efficiency', type: 'number', unit: 'W/TH', description: 'Power efficiency', handler: 'src/telemetry/efficiency.js' },
      { name: 'power_mode', type: 'string', unit: '', description: 'Power mode', handler: 'src/telemetry/power-mode.js' }
    ],
    commands: [
      { name: 'reboot', params: [], handler: 'src/commands/reboot.js' },
      { name: 'setPowerMode', params: [{ name: 'mode', type: 'string' }], handler: 'src/commands/set-power-mode.js' },
      { name: 'setLED', params: [{ name: 'enabled', type: 'boolean' }], handler: 'src/commands/set-led.js' },
      { name: 'setupPools', params: [{ name: 'pools', type: 'object' }], handler: 'src/commands/setup-pools.js' },
      { name: 'setPowerPct', params: [{ name: 'pct', type: 'number', min: 0, max: 100 }], handler: 'src/commands/set-power-pct.js' },
      { name: 'rackReboot', params: [], handler: 'src/commands/rack-reboot.js' },
      { name: 'downloadLogs', params: [], handler: 'src/commands/download-logs.js' }
    ],
    health: { supportedStates: ['OK', 'DEGRADED', 'OFFLINE'] },
    errors: {}
  }
}
