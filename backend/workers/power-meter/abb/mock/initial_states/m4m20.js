'use strict'

const { cleanup, getActivePower, randomNumber } = require('../lib')

module.exports = function () {
  const state = {
    energy: {
      active_import_energy_wh: '0',
      active_export_energy_wh: '14931075990',
      active_energy_net_wh: '-14931075990',
      reactive_import_energy_varh: '9553420',
      reactive_export_energy_varh: '963691820',
      reactive_energy_net_varh: '-954138400',
      apparent_import_energy_va: '70',
      apparent_export_energy_va: '14997442290',
      apparent_energy_net_va: '-14997442210',
      active_import_energy_co2_kg_kwh: '0',
      active_import_energy_currency_kwh: '0',
      active_import_energy_tariff_1_wh: '0',
      active_import_energy_tariff_2_wh: '0',
      active_import_energy_tariff_3_wh: '0',
      active_import_energy_tariff_4_wh: '0',
      active_import_energy_tariff_5_wh: '0',
      active_import_energy_tariff_6_wh: '0',
      active_export_energy_tariff_1_wh: '14931084850',
      active_export_energy_tariff_2_wh: '0',
      active_export_energy_tariff_3_wh: '0',
      active_export_energy_tariff_4_wh: '0',
      active_export_energy_tariff_5_wh: '0',
      active_export_energy_tariff_6_wh: '0',
      reactive_import_energy_tariff_1_varh: '9553420',
      reactive_import_energy_tariff_2_varh: '0',
      reactive_import_energy_tariff_3_varh: '0',
      reactive_import_energy_tariff_4_varh: '0',
      reactive_import_energy_tariff_5_varh: '0',
      reactive_import_energy_tariff_6_varh: '0',
      reactive_export_energy_tariff_1_varh: '963693270',
      reactive_export_energy_tariff_2_varh: '0',
      reactive_export_energy_tariff_3_varh: '0',
      reactive_export_energy_tariff_4_varh: '0',
      reactive_export_energy_tariff_5_varh: '0',
      reactive_export_energy_tariff_6_varh: '0',
      active_import_energy_l1_wh: '184464625987328409600',
      active_import_energy_l2_wh: '396879717162024960',
      active_import_energy_l3_wh: '278660226943549440',
      active_export_energy_l1_wh: '492581209243723670',
      active_export_energy_l2_wh: '68477232334168468890',
      active_export_energy_l3_wh: '19188149162365494460',
      active_energy_net_l1_wh: '-78942471968270657440',
      active_energy_net_l2_wh: '-68085982116540657060',
      active_energy_net_l3_wh: '-18903859435887731910',
      reactive_import_energy_l1_varh: '79440682677048442960',
      reactive_import_energy_l2_varh: '24482693474292858900',
      reactive_import_energy_l3_varh: '151503906214510592040',
      reactive_export_energy_l1_varh: '53953123535898546130',
      reactive_export_energy_l2_varh: '152297665648834646950',
      reactive_export_energy_l3_varh: '123606921272717481450',
      reactive_energy_net_l1_varh: '-63982076956099219340',
      reactive_energy_net_l2_varh: '56655283312320834670',
      reactive_energy_net_l3_varh: '27902614441327323700',
      apparent_import_energy_l1_va: '117938015241764864000',
      apparent_import_energy_l2_va: '2412240550410321920',
      apparent_import_energy_l3_va: '2144839322535198720',
      apparent_export_energy_l1_va: '3127186991255464060',
      apparent_export_energy_l2_va: '139836768429853978390',
      apparent_export_energy_l3_va: '42437982238665680460',
      apparent_energy_net_l1_va: '51371997999461750650',
      apparent_energy_net_l2_va: '47045727607418966240',
      apparent_energy_net_l3_va: '-40290328166363375190'
    },
    realtime: {
      ...getActivePower(),
      three_phase_system_voltage_v: 31217.7,
      phase_voltage_l1_v: 17971.100000000002,
      phase_voltage_l2_v: 18040.8,
      phase_voltage_l3_v: 17960.8,
      line_voltage_l1_l2_v: 31245.300000000003,
      line_voltage_l3_l2_v: 31267.800000000003,
      line_voltage_l1_l3_v: 31137,
      three_phase_system_current_a: 412.31,
      current_l1_a: 409.86,
      current_l2_a: 417.38,
      current_l3_a: 409.66,
      current_n_a: 0.05,
      reactive_power_total_var: -2086731,
      reactive_power_l1_var: -627943,
      reactive_power_l2_var: -709440,
      reactive_power_l3_var: -749348,
      apparent_power_total_va: 22247591,
      apparent_power_l1_va: 7363807,
      apparent_power_l2_va: 7528042,
      apparent_power_l3_va: 7355742,
      frequency_hz: 50.050000000000004,
      phase_angles_power_total_deg: 174.60000000000002,
      phase_angles_power_l1_deg: 175.10000000000002,
      phase_angles_power_l2_deg: 174.60000000000002,
      phase_angles_power_l3_deg: 174.10000000000002,
      phase_angles_voltage_l1_deg: 0,
      phase_angles_voltage_l2_deg: -120.10000000000001,
      phase_angles_voltage_l3_deg: 119.80000000000001,
      phase_angles_current_l1_deg: -0.1,
      phase_angles_current_l2_deg: -0.1,
      phase_angles_current_l3_deg: -0.1,
      power_factors_total: 1.7510000000000001,
      power_factors_l1: 0.545,
      power_factors_l2: -0.66,
      power_factors_l3: -0.995,
      current_quadrant_total: 64540,
      current_quadrant_l1: 64542,
      current_quadrant_l2: 64543,
      current_quadrant_l3: 3,
      cosphi_displacement_factor_total: 0.003,
      cosphi_displacement_factor_l1: 0.003,
      cosphi_displacement_factor_l2: 0.003,
      cosphi_displacement_factor_l3: -0.995
    },
    harmonics: {
      voltage: {
        l1_thd_pct: 1.2000000000000002,
        l2_thd_pct: 1.5,
        l3_thd_pct: 1.3,
        l1_l2_thd_pct: 1.7000000000000002,
        l3_l2_thd_pct: 1.7000000000000002,
        l1_l3_thd_pct: 1.2000000000000002
      },
      current: {
        l1_thd_pct: 2.8000000000000003,
        l2_thd_pct: 3.8000000000000003,
        l3_thd_pct: 3.6,
        n_thd_pct: 76.4
      }
    },
    avgminmax: {
      avg_active_power_total_w: 21474836.47,
      max_active_power_total_w: 21474836.47,
      min_active_power_total_w: 21474836.47
    }
  }

  const setInitialState = () => {
    Object.assign(state, getActivePower())

    buffer5.writeBigUInt64BE(BigInt(state.energy.active_import_energy_wh) / 10n, 0)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_export_energy_wh) / 10n, 8)
    buffer5.writeBigInt64BE(BigInt(state.energy.active_energy_net_wh) / 10n, 16)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_import_energy_varh) / 10n, 24)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_export_energy_varh) / 10n, 32)
    buffer5.writeBigInt64BE(BigInt(state.energy.reactive_energy_net_varh) / 10n, 40)
    buffer5.writeBigUInt64BE(BigInt(state.energy.apparent_import_energy_va) / 10n, 48)
    buffer5.writeBigUInt64BE(BigInt(state.energy.apparent_export_energy_va) / 10n, 56)
    buffer5.writeBigInt64BE(BigInt(state.energy.apparent_energy_net_va) / 10n, 64)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_import_energy_co2_kg_kwh) / 10n, 72)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_import_energy_currency_kwh) / 10n, 104)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_import_energy_tariff_1_wh) / 10n, 736)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_import_energy_tariff_2_wh) / 10n, 744)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_import_energy_tariff_3_wh) / 10n, 752)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_import_energy_tariff_4_wh) / 10n, 760)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_import_energy_tariff_5_wh) / 10n, 768)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_import_energy_tariff_6_wh) / 10n, 776)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_export_energy_tariff_1_wh) / 10n, 800)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_export_energy_tariff_2_wh) / 10n, 808)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_export_energy_tariff_3_wh) / 10n, 816)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_export_energy_tariff_4_wh) / 10n, 824)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_export_energy_tariff_5_wh) / 10n, 832)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_export_energy_tariff_6_wh) / 10n, 840)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_import_energy_tariff_1_varh) / 10n, 864)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_import_energy_tariff_2_varh) / 10n, 872)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_import_energy_tariff_3_varh) / 10n, 880)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_import_energy_tariff_4_varh) / 10n, 888)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_import_energy_tariff_5_varh) / 10n, 896)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_import_energy_tariff_6_varh) / 10n, 904)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_export_energy_tariff_1_varh) / 10n, 928)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_export_energy_tariff_2_varh) / 10n, 936)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_export_energy_tariff_3_varh) / 10n, 944)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_export_energy_tariff_4_varh) / 10n, 952)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_export_energy_tariff_5_varh) / 10n, 960)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_export_energy_tariff_6_varh) / 10n, 968)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_import_energy_l1_wh) / 10n, 992)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_import_energy_l2_wh) / 10n, 1000)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_import_energy_l3_wh) / 10n, 1008)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_export_energy_l1_wh) / 10n, 1016)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_export_energy_l2_wh) / 10n, 1024)
    buffer5.writeBigUInt64BE(BigInt(state.energy.active_export_energy_l3_wh) / 10n, 1032)
    buffer5.writeBigInt64BE(BigInt(state.energy.active_energy_net_l1_wh) / 10n, 1040)
    buffer5.writeBigInt64BE(BigInt(state.energy.active_energy_net_l2_wh) / 10n, 1048)
    buffer5.writeBigInt64BE(BigInt(state.energy.active_energy_net_l3_wh) / 10n, 1056)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_import_energy_l1_varh) / 10n, 1064)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_import_energy_l2_varh) / 10n, 1072)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_import_energy_l3_varh) / 10n, 1080)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_export_energy_l1_varh) / 10n, 1088)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_export_energy_l2_varh) / 10n, 1096)
    buffer5.writeBigUInt64BE(BigInt(state.energy.reactive_export_energy_l3_varh) / 10n, 1104)
    buffer5.writeBigInt64BE(BigInt(state.energy.reactive_energy_net_l1_varh) / 10n, 1112)
    buffer5.writeBigInt64BE(BigInt(state.energy.reactive_energy_net_l2_varh) / 10n, 1120)
    buffer5.writeBigInt64BE(BigInt(state.energy.reactive_energy_net_l3_varh) / 10n, 1128)
    buffer5.writeBigUInt64BE(BigInt(state.energy.apparent_import_energy_l1_va) / 10n, 1136)
    buffer5.writeBigUInt64BE(BigInt(state.energy.apparent_import_energy_l2_va) / 10n, 1144)
    buffer5.writeBigUInt64BE(BigInt(state.energy.apparent_import_energy_l3_va) / 10n, 1152)
    buffer5.writeBigUInt64BE(BigInt(state.energy.apparent_export_energy_l1_va) / 10n, 1160)
    buffer5.writeBigUInt64BE(BigInt(state.energy.apparent_export_energy_l2_va) / 10n, 1168)
    buffer5.writeBigUInt64BE(BigInt(state.energy.apparent_export_energy_l3_va) / 10n, 1176)
    buffer5.writeBigInt64BE(BigInt(state.energy.apparent_energy_net_l1_va) / 10n, 1184)
    buffer5.writeBigInt64BE(BigInt(state.energy.apparent_energy_net_l2_va) / 10n, 1192)
    buffer5.writeBigInt64BE(BigInt(state.energy.apparent_energy_net_l3_va) / 10n, 1200)

    buffer5.writeUInt32BE(Math.round(state.realtime.three_phase_system_v * 10), 5632)
    buffer5.writeUInt32BE(Math.round(state.realtime.phase_voltage_l1_v * 10), 5636)
    buffer5.writeUInt32BE(Math.round(state.realtime.phase_voltage_l2_v * 10), 5640)
    buffer5.writeUInt32BE(Math.round(state.realtime.phase_voltage_l3_v * 10), 5644)
    buffer5.writeUInt32BE(Math.round(state.realtime.line_voltage_l1_l2_v * 10), 5648)
    buffer5.writeUInt32BE(Math.round(state.realtime.line_voltage_l2_l3_v * 10), 5652)
    buffer5.writeUInt32BE(Math.round(state.realtime.three_phase_current_a * 100), 5656)
    buffer5.writeUInt32BE(Math.round(state.realtime.current_l1_a * 100), 5660)
    buffer5.writeUInt32BE(Math.round(state.realtime.current_l2_a * 100), 5664)
    buffer5.writeUInt32BE(Math.round(state.realtime.current_l3_a * 100), 5668)
    buffer5.writeUInt32BE(Math.round(state.realtime.current_n_a * 100), 5672)
    bufferc.writeInt32BE(Math.round(state.realtime.active_power_total_w), 5684)
    bufferc.writeInt32BE(Math.round(state.realtime.active_power_l1_w), 5688)
    bufferc.writeInt32BE(Math.round(state.realtime.active_power_l2_w), 5692)
    bufferc.writeInt32BE(Math.round(state.realtime.active_power_l3_w), 5696)
    bufferc.writeInt32BE(Math.round(state.realtime.reactive_power_total_var), 5700)
    bufferc.writeInt32BE(Math.round(state.realtime.reactive_power_l1_var), 5704)
    bufferc.writeInt32BE(Math.round(state.realtime.reactive_power_l2_var), 5708)
    bufferc.writeInt32BE(Math.round(state.realtime.reactive_power_l3_var), 5712)
    bufferc.writeInt32BE(Math.round(state.realtime.apparent_power_total_va), 5716)
    bufferc.writeInt32BE(Math.round(state.realtime.apparent_power_l1_va), 5720)
    bufferc.writeInt32BE(Math.round(state.realtime.apparent_power_l2_va), 5724)
    bufferc.writeInt32BE(Math.round(state.realtime.apparent_power_l3_va), 5728)
    buffer5.writeUInt16BE(Math.round(state.realtime.frequency_hz * 100), 5732)
    buffer5.writeInt16BE(Math.round(state.realtime.phase_angles_power_total_deg * 10), 5734)
    buffer5.writeInt16BE(Math.round(state.realtime.phase_angles_power_l1_deg * 10), 5736)
    buffer5.writeInt16BE(Math.round(state.realtime.phase_angles_power_l2_deg * 10), 5738)
    buffer5.writeInt16BE(Math.round(state.realtime.phase_angles_power_l3_deg * 10), 5740)
    buffer5.writeInt16BE(Math.round(state.realtime.phase_angles_voltage_l1_deg * 10), 5742)
    buffer5.writeInt16BE(Math.round(state.realtime.phase_angles_voltage_l2_deg * 10), 5744)
    buffer5.writeInt16BE(Math.round(state.realtime.phase_angles_voltage_l3_deg * 10), 5746)
    buffer5.writeInt16BE(Math.round(state.realtime.phase_angles_current_l1_deg * 10), 5748)
    buffer5.writeInt16BE(Math.round(state.realtime.phase_angles_current_l2_deg * 10), 5750)
    buffer5.writeInt16BE(Math.round(state.realtime.phase_angles_current_l3_deg * 10), 5752)
    buffer5.writeInt16BE(Math.round(state.realtime.power_factors_total * 1000), 5754)
    buffer5.writeInt16BE(Math.round(state.realtime.power_factors_l1 * 1000), 5756)
    buffer5.writeInt16BE(Math.round(state.realtime.power_factors_l2 * 1000), 5758)
    buffer5.writeInt16BE(Math.round(state.realtime.power_factors_l3 * 1000), 5760)
    buffer5.writeUInt32BE(Math.round(state.realtime.current_quadrant_total), 5762)
    buffer5.writeUInt32BE(Math.round(state.realtime.current_quadrant_l1), 5766)
    buffer5.writeUInt32BE(Math.round(state.realtime.current_quadrant_l2), 5770)
    buffer5.writeUInt32BE(Math.round(state.realtime.current_quadrant_l3), 5774)
    buffer5.writeInt16BE(Math.round(state.realtime.cosphi_displacement_factor_total * 1000), 5778)
    buffer5.writeInt16BE(Math.round(state.realtime.cosphi_displacement_factor_l1 * 1000), 5780)
    buffer5.writeInt16BE(Math.round(state.realtime.cosphi_displacement_factor_l2 * 1000), 5782)
    buffer5.writeInt16BE(Math.round(state.realtime.cosphi_displacement_factor_l3 * 1000), 5784)

    buffer5.writeUInt16BE(Math.round(state.harmonics.voltage.l1_thd_pct * 10), 6656)
    buffer5.writeUInt16BE(Math.round(state.harmonics.voltage.l2_thd_pct * 10), 6912)
    buffer5.writeUInt16BE(Math.round(state.harmonics.voltage.l3_thd_pct * 10), 7168)
    buffer5.writeUInt16BE(Math.round(state.harmonics.voltage.l1_l2_thd_pct * 10), 7424)
    buffer5.writeUInt16BE(Math.round(state.harmonics.voltage.l3_l2_thd_pct * 10), 7680)
    buffer5.writeUInt16BE(Math.round(state.harmonics.voltage.l1_l3_thd_pct * 10), 7936)
    buffer6.writeUInt16BE(Math.round(state.harmonics.current.l1_thd_pct * 10), 0)
    buffer6.writeUInt16BE(Math.round(state.harmonics.current.l2_thd_pct * 10), 256)
    buffer6.writeUInt16BE(Math.round(state.harmonics.current.l3_thd_pct * 10), 512)
    buffer6.writeUInt16BE(Math.round(state.harmonics.current.n_thd_pct * 10), 768)

    buffer5.writeUInt32BE(Math.round(state.avgminmax.avg_active_power_total_w), 6096)
    buffer5.writeUInt32BE(Math.round(state.avgminmax.max_active_power_total_w), 6216)
    buffer5.writeUInt32BE(Math.round(state.avgminmax.min_active_power_total_w), 6456)

    return state
  }

  setInitialState()

  const buffer5 = Buffer.alloc(4096 * 4)
  const buffer6 = Buffer.alloc(4096 * 4)
  const bufferc = Buffer.alloc(4096 * 4)

  function bind (connection) {
    connection.on('read-holding-registers', (request, reply) => {
      if (randomNumber() < 0.125) {
        reply(new Error('engineered error'))
        return
      }
      const address = request.request.address
      const quantity = request.request.quantity

      let bufferStart = 0
      let buffer

      if (address >= 0x5000 && address < 0x6000) {
        buffer = buffer5
        bufferStart = 0x5000
      } else if (address >= 0x6000 && address < 0x7000) {
        buffer = buffer6
        bufferStart = 0x6000
      } else if (address >= 0xc000 && address < 0xd000) {
        buffer = bufferc
        bufferStart = 0xc000
      } else {
        reply(new Error('address out of range'))
        return
      }
      const start = (address - bufferStart) * 2
      const end = start + quantity * 2
      const buf = buffer.subarray(start, end)

      reply(null, buf)
    })
  }

  const initialState = JSON.parse(JSON.stringify(state))

  return { bind, state, cleanup: cleanup.bind(null, initialState, state) }
}
