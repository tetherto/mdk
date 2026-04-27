'use strict'

module.exports = function (fastify) {
  fastify.get('/cooler', async (request, reply) => {
    const operation = request.query.operation
    const { minerInfo, ...state } = request.state
    switch (operation) {
      case 'open':
        if (request.ctx.type === 'IMMERSION') {
          request.state.pump_ready = true
          request.state.pump_operation = true
          request.state.one_pump = true
          request.state.second_pump1 = true
          request.state.second_pump2 = true
          request.state.dry_cooler_freq_run = true
          request.state.dry_cooler_power_freq_run = true
          request.state.container_fan = true
        } else {
          request.state.cooling_tower_fan1 = true
          request.state.cooling_tower_fan2 = true
          request.state.cooling_tower_fan3 = true
          request.state.cooling_tower_fan1_fault = false
          request.state.cooling_tower_fan2_fault = false
          request.state.cooling_tower_fan3_fault = false
          request.state.supply_liquid_temp_high = false
          request.state.supply_liquid_temp_too_high = false
          request.state.supply_liquid_pressure_high = false
          request.state.return_liquid_pressure_low = false
          request.state.supply_liquid_flow_low = false
          request.state.freezing_alarm = false
          request.state.cooling_tower_liquid_level_low = false
          request.state.circulating_pump = true
        }
        return reply.send({ ok: true, method: 'open', params: null })
      case 'close':
        if (request.ctx.type === 'IMMERSION') {
          request.state.pump_ready = false
          request.state.pump_operation = false
          request.state.one_pump = false
          request.state.second_pump1 = false
          request.state.second_pump2 = false
          request.state.dry_cooler_freq_run = false
          request.state.dry_cooler_power_freq_run = false
          request.state.container_fan = false
        } else {
          request.state.cooling_tower_fan1 = false
          request.state.cooling_tower_fan2 = false
          request.state.cooling_tower_fan3 = false
          request.state.cooling_tower_fan1_fault = false
          request.state.cooling_tower_fan2_fault = false
          request.state.cooling_tower_fan3_fault = false
          request.state.supply_liquid_temp_high = false
          request.state.supply_liquid_temp_too_high = false
          request.state.supply_liquid_pressure_high = false
          request.state.return_liquid_pressure_low = false
          request.state.supply_liquid_flow_low = false
          request.state.freezing_alarm = false
          request.state.cooling_tower_liquid_level_low = false
          request.state.circulating_pump = true
        }
        return reply.send({ ok: true, method: 'close', params: null })
      case 'reset':
        return reply.send({ ok: true, method: 'reset', params: null })
      case 'setTemp':
        if (request.query.temp === 'pid') {
          request.state.pid_mode = true
          request.state.supply_liquid_set_temp = 38
          return reply.send({ ok: true, method: 'setTemp', params: null })
        } else {
          const temp = Number(request.query.temp)
          request.state.pid_mode = false
          request.state.supply_liquid_set_temp = temp
          return reply.send({ ok: true, method: 'setTemp', params: null })
        }
      case 'coolerState':
        return { ok: true, method: 'coolerState', params: state }
      case 'minerInfo':
        return { ok: true, method: 'minerInfo', params: minerInfo }
      default:
        return reply.status(400).send({ status: 'error', error: 'ERR_UNSUPPORTED' })
    }
  })
}
