'use strict'

const DCS_TAG_DEFAULT = 't-dcs'

function isCentralDCSEnabled (ctx) {
  if (ctx.conf?.featureConfig?.centralDCSSetup?.enabled === true) return true
  return false
}

function getDCSTag (ctx) {
  return ctx.conf?.featureConfig?.centralDCSSetup?.tag || DCS_TAG_DEFAULT
}

function extractDcsThing (rpcResults) {
  if (!Array.isArray(rpcResults)) return null

  for (const orkResult of rpcResults) {
    if (!Array.isArray(orkResult)) continue
    for (const thing of orkResult) {
      if (thing && thing?.type && thing.type.includes('dcs') && thing?.last?.snap) {
        return thing
      }
    }
  }
  return null
}

function getSensorReading (sensors, sensorId, defaultConfig = null) {
  if (!sensorId) return defaultConfig
  const sensor = sensors?.find(s => s.equipment === sensorId)
  if (sensor?.value != null) {
    return { value: sensor.value, unit: sensor.unit }
  }
  return defaultConfig
}

function findEquipment (equipmentList, equipmentId) {
  if (!equipmentId || !Array.isArray(equipmentList)) return null
  return equipmentList.find(e => e.equipment === equipmentId)
}

function filterEquipmentBy (equipmentList, field, value) {
  if (!Array.isArray(equipmentList)) return []
  return equipmentList.filter(e => e[field] === value)
}

async function fetchDcsThing (ctx, fields) {
  const dcsTag = getDCSTag(ctx)

  const payload = {
    query: { tags: { $in: [dcsTag] } },
    status: 1,
    fields
  }

  const rpcResults = await ctx.dataProxy.requestDataMap('listThings', payload)
  return extractDcsThing(rpcResults)
}

module.exports = {
  DCS_TAG_DEFAULT,
  isCentralDCSEnabled,
  getDCSTag,
  extractDcsThing,
  getSensorReading,
  findEquipment,
  filterEquipmentBy,
  fetchDcsThing
}
