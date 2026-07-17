'use strict'

module.exports = {
  BaseMock: require('./base.mock'),
  BaseTransport: require('./transports/base.transport'),
  HttpTransport: require('./transports/http.transport'),
  ModbusTransport: require('./transports/modbus.transport'),
  TcpTransport: require('./transports/tcp.transport'),
  MqttTransport: require('./transports/mqtt.transport'),
  ContainerMock: require('./container.mock'),
  MinerMock: require('./miner.mock'),
  MinerpoolMock: require('./minerpool.mock'),
  PowerMeterMock: require('./powermeter.mock'),
  SensorMock: require('./sensor.mock')
}
