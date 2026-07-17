'use strict'

const { DatabaseSync } = require('node:sqlite')

// The worker's own persistence — a plain SQLite file, no MDK stores. One
// handle per file, shared between the boot's sampler loop and the plugin's
// device contexts (openDb is called with the same path from both).

const _open = new Map()

function openDb (dbPath) {
  if (_open.has(dbPath)) return _open.get(dbPath)

  const db = new DatabaseSync(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      ts INTEGER NOT NULL,
      hashrate_ths REAL,
      power_w REAL,
      board_temp_c REAL
    );
    CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      ts INTEGER NOT NULL,
      command TEXT NOT NULL,
      params TEXT,
      result TEXT
    );
    CREATE INDEX IF NOT EXISTS telemetry_device_ts ON telemetry (device_id, ts);
  `)

  const insertSample = db.prepare(
    'INSERT INTO telemetry (device_id, ts, hashrate_ths, power_w, board_temp_c) VALUES (?, ?, ?, ?, ?)')
  const insertCommand = db.prepare(
    'INSERT INTO commands (device_id, ts, command, params, result) VALUES (?, ?, ?, ?, ?)')
  const selectSamples = db.prepare(
    'SELECT ts, hashrate_ths, power_w, board_temp_c FROM telemetry WHERE device_id = ? ORDER BY ts DESC LIMIT ?')
  const selectCommands = db.prepare(
    'SELECT ts, command, params, result FROM commands WHERE device_id = ? ORDER BY ts DESC LIMIT ?')

  const handle = {
    recordSample (deviceId, summary) {
      insertSample.run(deviceId, Date.now(), summary.hashrate_ths, summary.power_w, summary.board_temp_c)
    },
    recordCommand (deviceId, command, params, result) {
      insertCommand.run(deviceId, Date.now(), command, JSON.stringify(params || {}), JSON.stringify(result || {}))
    },
    recentSamples (deviceId, limit) {
      return selectSamples.all(deviceId, limit)
    },
    recentCommands (deviceId, limit) {
      return selectCommands.all(deviceId, limit).map((row) => ({
        ...row, params: JSON.parse(row.params), result: JSON.parse(row.result)
      }))
    },
    close () {
      _open.delete(dbPath)
      db.close()
    }
  }

  _open.set(dbPath, handle)
  return handle
}

module.exports = { openDb }
