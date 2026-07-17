'use strict'

const http = require('http')
const debug = require('debug')('mdk:worker:demo-worker:mock')

// A standalone "vendor firmware" simulator for the hypothetical WM firmware
// v3: a small HTTP JSON API (GET /api/v3/summary, POST /api/v3/command).
// It knows nothing about MDK — it is the device-side surface the Worker Plugin
// translates against, the way a real v3 miner on the LAN would be.

const POWER_MODES = {
  eco: { power: 0.8, hashrate: 0.85 },
  normal: { power: 1, hashrate: 1 },
  high: { power: 1.15, hashrate: 1.1 }
}

function jitter (value) {
  return Math.round(value * (0.99 + Math.random() * 0.02) * 100) / 100
}

function createServer ({ host, port, serial, hashrateThs, powerW }) {
  const state = {
    serial: serial || 'WM3-0000',
    baseHashrateThs: hashrateThs || 180,
    basePowerW: powerW || 3400,
    powerMode: 'normal',
    bootTime: Date.now()
  }

  const summary = () => {
    const scale = POWER_MODES[state.powerMode]
    return {
      serial: state.serial,
      model: 'WM_V3',
      firmware: 'v3.0.1',
      uptime_s: Math.floor((Date.now() - state.bootTime) / 1000),
      power_mode: state.powerMode,
      hashrate_ths: jitter(state.baseHashrateThs * scale.hashrate),
      power_w: jitter(state.basePowerW * scale.power),
      board_temp_c: jitter(62 + (scale.power - 1) * 20)
    }
  }

  const command = (body) => {
    switch (body.cmd) {
      case 'reboot':
        state.bootTime = Date.now()
        return { ok: true, rebooting: true }
      case 'set-power-mode':
        if (!POWER_MODES[body.mode]) throw new Error(`ERR_BAD_POWER_MODE: ${body.mode}`)
        state.powerMode = body.mode
        return { ok: true, power_mode: state.powerMode }
      default:
        throw new Error(`ERR_UNKNOWN_CMD: ${body.cmd}`)
    }
  }

  const server = http.createServer((req, res) => {
    const reply = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }

    if (req.method === 'GET' && req.url === '/api/v3/summary') return reply(200, summary())

    if (req.method === 'POST' && req.url === '/api/v3/command') {
      let buf = ''
      req.on('data', (chunk) => { buf += chunk })
      req.on('end', () => {
        try {
          reply(200, command(JSON.parse(buf || '{}')))
        } catch (err) {
          reply(400, { ok: false, error: err.message })
        }
      })
      return
    }

    reply(404, { ok: false, error: 'ERR_NOT_FOUND' })
  })

  server.listen(port, host || '127.0.0.1', () => {
    debug('v3 firmware mock %s listening on %s:%d', state.serial, host, port)
  })

  return {
    server,
    state,
    exit () { server.close() }
  }
}

module.exports = { createServer }
