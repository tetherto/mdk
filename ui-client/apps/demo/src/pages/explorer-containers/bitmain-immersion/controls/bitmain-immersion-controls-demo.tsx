import { Checkbox, Input } from '@mdk/core'
import { BitMainControlsTab, BitMainImmersionUnitControlBox } from '@mdk/foundation'
import type { ReactElement } from 'react'
import { useState } from 'react'
import './bitmain-immersion-controls-demo.scss'

/**
 * Demo presets for BitMain Immersion Controls
 */
const DEMO_PRESET = {
  id: 'demo-normal',
  type: 'bitmain-immersion',
  status: 'active',
  last: {
    snap: {
      stats: {
        container_specific: {
          container_fan: true,
          fan_fault: false,
          tank_a_level: 100,
          tank_b_level: 95,
          tank_c_level: 90,
          tank_d_level: 85,
          latitude: '37.7749',
          latitude_direction: 'N',
          longitude: '122.4194',
          longitude_direction: 'W',
        },
      },
      config: {},
    },
  },
} as const

/**
 * BitMain Immersion Controls Demo
 *
 * Interactive demonstration of BitMain Immersion control components
 */
export const BitMainImmersionControlsDemo = (): ReactElement => {
  // Preset selection
  const [useCustom, setUseCustom] = useState(false)

  // Fan controls
  const [containerFan, setContainerFan] = useState(true)
  const [fanFault, setFanFault] = useState(false)

  // Tank levels
  const [tankA, setTankA] = useState('100')
  const [tankB, setTankB] = useState('95')
  const [tankC, setTankC] = useState('90')
  const [tankD, setTankD] = useState('85')

  // GPS
  const [latitude, setLatitude] = useState('37.7749')
  const [latDirection, setLatDirection] = useState('N')
  const [longitude, setLongitude] = useState('122.4194')
  const [longDirection, setLongDirection] = useState('W')

  // Unit Control Box controls
  const [unitTitle, setUnitTitle] = useState('Cooling Unit #1')
  const [unitAlarm, setUnitAlarm] = useState(false)
  const [unitRunning, setUnitRunning] = useState(true)
  const [unitFrequency, setUnitFrequency] = useState('50')
  const [isDryCooler, setIsDryCooler] = useState(false)
  const [showFreqLeft, setShowFreqLeft] = useState(false)
  const [useSecondary, setUseSecondary] = useState(false)

  const customDevice = {
    id: 'demo-custom',
    type: 'bitmain-immersion',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            container_fan: containerFan,
            fan_fault: fanFault,
            tank_a_level: Number(tankA) || 0,
            tank_b_level: Number(tankB) || 0,
            tank_c_level: Number(tankC) || 0,
            tank_d_level: Number(tankD) || 0,
            latitude,
            latitude_direction: latDirection,
            longitude,
            longitude_direction: longDirection,
          },
        },
        config: {},
      },
    },
  }

  const currentData = useCustom ? customDevice : DEMO_PRESET

  return (
    <div className="bitmain-immersion-controls-demo">
      <div className="bitmain-immersion-controls-demo__controls">
        {/* Controls Tab Settings */}
        <div className="bitmain-immersion-controls-demo__section">
          <h2>Controls Tab Settings</h2>

          <div className="bitmain-immersion-controls-demo__custom">
            <h3>Fan Status</h3>
            <div className="bitmain-immersion-controls-demo__fan-controls">
              <label className="bitmain-immersion-controls-demo__checkbox-label">
                <Checkbox
                  checked={containerFan}
                  onCheckedChange={(checked) => {
                    setContainerFan(checked === true)
                    setUseCustom(true)
                  }}
                />
                <span>Container Fan Running</span>
              </label>
              <label className="bitmain-immersion-controls-demo__checkbox-label">
                <Checkbox
                  checked={fanFault}
                  onCheckedChange={(checked) => {
                    setFanFault(checked === true)
                    setUseCustom(true)
                  }}
                />
                <span>Fan Fault</span>
              </label>
            </div>

            <h3 style={{ marginTop: '2rem' }}>Tank Levels (cm)</h3>
            <div className="bitmain-immersion-controls-demo__grid">
              <Input
                label="Tank A"
                type="number"
                value={tankA}
                onChange={(e) => {
                  setTankA(e.target.value)
                  setUseCustom(true)
                }}
                placeholder="100"
              />
              <Input
                label="Tank B"
                type="number"
                value={tankB}
                onChange={(e) => {
                  setTankB(e.target.value)
                  setUseCustom(true)
                }}
                placeholder="95"
              />
              <Input
                label="Tank C"
                type="number"
                value={tankC}
                onChange={(e) => {
                  setTankC(e.target.value)
                  setUseCustom(true)
                }}
                placeholder="90"
              />
              <Input
                label="Tank D"
                type="number"
                value={tankD}
                onChange={(e) => {
                  setTankD(e.target.value)
                  setUseCustom(true)
                }}
                placeholder="85"
              />
            </div>

            <h3 style={{ marginTop: '2rem' }}>GPS Location</h3>
            <div className="bitmain-immersion-controls-demo__gps-grid">
              <Input
                label="Latitude"
                type="text"
                value={latitude}
                onChange={(e) => {
                  setLatitude(e.target.value)
                  setUseCustom(true)
                }}
                placeholder="37.7749"
              />
              <Input
                label="Lat Dir"
                type="text"
                value={latDirection}
                onChange={(e) => {
                  setLatDirection(e.target.value)
                  setUseCustom(true)
                }}
                placeholder="N"
                maxLength={1}
              />
              <Input
                label="Longitude"
                type="text"
                value={longitude}
                onChange={(e) => {
                  setLongitude(e.target.value)
                  setUseCustom(true)
                }}
                placeholder="122.4194"
              />
              <Input
                label="Long Dir"
                type="text"
                value={longDirection}
                onChange={(e) => {
                  setLongDirection(e.target.value)
                  setUseCustom(true)
                }}
                placeholder="W"
                maxLength={1}
              />
            </div>
          </div>
        </div>

        {/* Unit Control Box Settings */}
        <div className="bitmain-immersion-controls-demo__section">
          <h2>Unit Control Box Settings</h2>

          <div className="bitmain-immersion-controls-demo__unit-controls">
            <Input
              label="Unit Title"
              type="text"
              value={unitTitle}
              onChange={(e) => setUnitTitle(e.target.value)}
              placeholder="Cooling Unit #1"
            />

            <Input
              label="Frequency (Hz)"
              type="number"
              value={unitFrequency}
              onChange={(e) => setUnitFrequency(e.target.value)}
              placeholder="50"
            />

            <div className="bitmain-immersion-controls-demo__checkbox-group">
              <label className="bitmain-immersion-controls-demo__checkbox-label">
                <Checkbox
                  checked={unitAlarm}
                  onCheckedChange={(checked) => setUnitAlarm(checked === true)}
                />
                <span>Alarm/Fault Status</span>
              </label>

              <label className="bitmain-immersion-controls-demo__checkbox-label">
                <Checkbox
                  checked={unitRunning}
                  onCheckedChange={(checked) => setUnitRunning(checked === true)}
                />
                <span>Unit Running</span>
              </label>

              <label className="bitmain-immersion-controls-demo__checkbox-label">
                <Checkbox
                  checked={isDryCooler}
                  onCheckedChange={(checked) => setIsDryCooler(checked === true)}
                />
                <span>Is Dry Cooler</span>
              </label>

              <label className="bitmain-immersion-controls-demo__checkbox-label">
                <Checkbox
                  checked={showFreqLeft}
                  onCheckedChange={(checked) => setShowFreqLeft(checked === true)}
                />
                <span>Show Frequency in Left Column</span>
              </label>

              <label className="bitmain-immersion-controls-demo__checkbox-label">
                <Checkbox
                  checked={useSecondary}
                  onCheckedChange={(checked) => setUseSecondary(checked === true)}
                />
                <span>Secondary Variant (No Border)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bitmain-immersion-controls-demo__preview">
        <div className="bitmain-immersion-controls-demo__preview-section">
          <h3>Controls Tab Preview</h3>
          <BitMainControlsTab data={currentData} />
        </div>

        <div className="bitmain-immersion-controls-demo__preview-section">
          <h3>Unit Control Box Preview</h3>
          <BitMainImmersionUnitControlBox
            title={unitTitle}
            alarmStatus={unitAlarm}
            frequency={Number(unitFrequency) || undefined}
            isDryCooler={isDryCooler}
            running={unitRunning}
            showFrequencyInLeftColumn={showFreqLeft}
            secondary={useSecondary}
          />
        </div>

        <div className="bitmain-immersion-controls-demo__preview-section">
          <h3>Multiple Units Example</h3>
          <div className="bitmain-immersion-controls-demo__units-grid">
            <BitMainImmersionUnitControlBox
              title="Primary Pump"
              alarmStatus={false}
              frequency={50}
              running={true}
            />
            <BitMainImmersionUnitControlBox
              title="Secondary Pump"
              alarmStatus={false}
              frequency={45}
              running={true}
            />
            <BitMainImmersionUnitControlBox
              title="Cooling Tower Fan"
              alarmStatus={true}
              running={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
