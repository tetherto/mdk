'use strict'

const { v4: uuidv4 } = require('uuid')
const utilsStore = require('hp-svc-facs-store/utils')

const createAlert = ({
  name,
  code,
  description,
  severity,
  createdAt,
  uuid = uuidv4(),
  message = undefined
}) => {
  return {
    name,
    code,
    description,
    severity,
    createdAt,
    uuid,
    message
  }
}

const updateExistingAlerts = (alerts, alertsPrev) => {
  if (!Array.isArray(alertsPrev)) return
  alerts.forEach(alert => {
    const alertExists = alertsPrev.find(val => val.name === alert.name && val.description === alert.description && val.message === alert.message)
    alert.createdAt = alertExists?.createdAt ?? alert.createdAt
    alert.uuid = alertExists?.uuid ?? alert.uuid
  })
}

const getErrorsFromSnap = (snap) => {
  if (!snap) return null
  if (!snap.raw_errors) return null
  return snap.raw_errors
}

class AlertsService {
  constructor ({ logs, getThings, loadLib, conf, getSpecTags, debugError }) {
    this.logs = logs
    this.getThings = getThings
    this.loadLib = loadLib
    this.conf = conf
    this.getSpecTags = getSpecTags
    this.debugError = debugError
  }

  async saveAlerts () {
    const log = await this.logs.getBeeTimeLog('thing-alerts', 0, true)
    const things = this.getThings()
    for (const thg of Object.values(things)) {
      if (thg.last?.alerts) {
        try {
          await this._storeThgAlertsToDb(thg.id, log, thg.last.alerts)
        } catch (error) {
          this.debugError(`ERR_STORE_ALERTS_TO_DB thg:${thg.id}`, error.message)
        }
      }
    }
    await this.logs.releaseBeeTimeLog(log)
  }

  async _storeThgAlertsToDb (thingId, log, alerts = []) {
    if (!Array.isArray(alerts)) {
      return
    }
    const groupedAlerts = alerts.reduce((grouped, alert) => {
      const { createdAt, uuid } = alert
      grouped[createdAt] ??= {}
      grouped[createdAt][uuid] = { ...alert, thingId }
      return grouped
    }, {})

    const timestamps = Object.keys(groupedAlerts)

    for (const timestamp of timestamps) {
      const existingLogEntry = await log.get(utilsStore.convIntToBin(timestamp))
      const existingAlerts = existingLogEntry?.value ? JSON.parse(existingLogEntry.value.toString()) : {}

      const updatedAlerts = { ...existingAlerts, ...groupedAlerts[timestamp] }
      await log.put(
        utilsStore.convIntToBin(timestamp),
        Buffer.from(JSON.stringify(updatedAlerts))
      )
    }
  }

  processThingAlerts (thg) {
    const lLibAlerts = this.loadLib('alerts')

    if (!lLibAlerts) {
      return null
    }

    let alertsFromConfig = this.conf.thing?.alerts
    const baseType = thg.type.split('-')[0]
    const thingConf = this.conf.thing?.[baseType]

    if (!alertsFromConfig) {
      return null
    }
    alertsFromConfig = alertsFromConfig[thg.type]

    if (!alertsFromConfig) {
      return null
    }

    const specs = lLibAlerts.specs
    const snap = thg.last?.snap

    if (!snap) {
      const alert = createAlert({
        name: 'error_snap',
        code: 'error_snap',
        description: thg.last?.err || 'No snap',
        severity: 'medium',
        createdAt: Date.now()
      })
      updateExistingAlerts([alert], thg.last?.alerts)
      return [alert]
    }

    const acc = []

    const alertsContext = {
      conf: alertsFromConfig,
      info: thg.info,
      thingConf,
      id: thg.id
    }

    const errorsFromSnap = getErrorsFromSnap(snap)

    if (errorsFromSnap) {
      acc.push(...errorsFromSnap.map(error => {
        const alertConfig = alertsFromConfig[error.name]

        return createAlert({
          name: error.name,
          code: error.code,
          description: alertConfig?.description || 'unknown_error',
          severity: alertConfig?.severity || 'high',
          createdAt: error.timestamp || Date.now(),
          uuid: uuidv4(),
          message: error.message || undefined
        })
      }))
    }

    this.getSpecTags().forEach(stype => {
      if (!specs[stype]) {
        return
      }

      const aks = Object.keys(specs[stype])

      aks.forEach(ak => {
        const check = specs[stype][ak]
        let at = null

        try {
          if (!check.valid(alertsContext, snap)) {
            return
          }

          at = check.probe(alertsContext, snap)
        } catch (e) {
          const alert = createAlert({
            name: ak,
            code: ak,
            description: e.message,
            severity: 'medium',
            createdAt: Date.now()
          })

          acc.push(alert)
        }

        if (at) {
          const alertConf = alertsFromConfig[ak]
          const alert = createAlert({
            name: alertConf?.name || ak,
            code: alertConf?.code || ak,
            description: alertConf?.description || ak,
            severity: alertConf?.severity || 'medium',
            createdAt: Date.now()
          })

          acc.push(alert)
        }
      })
    })

    updateExistingAlerts(acc, thg.last?.alerts)
    return acc.length ? acc : null
  }
}

module.exports = AlertsService
