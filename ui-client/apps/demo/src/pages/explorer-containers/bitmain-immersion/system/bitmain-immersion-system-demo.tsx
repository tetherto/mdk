import { Button, Checkbox, Input } from '@tetherto/core'
import {
  BitMainImmersionPumpStationControlBox,
  BitMainImmersionSystemStatus,
} from '@tetherto/foundation'
import type { ReactElement } from 'react'
import { useState } from 'react'
import './bitmain-immersion-system-demo.scss'

/**
 * Demo presets for BitMain Immersion System components
 */
const DEMO_PRESETS = {
  allNormal: {
    id: 'demo-all-normal',
    type: 'bitmain-immersion',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            server_on: true,
            disconnect: false,
          },
        },
        config: {},
      },
    },
  },
  disconnected: {
    id: 'demo-disconnected',
    type: 'bitmain-immersion',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            server_on: true,
            disconnect: true,
          },
        },
        config: {},
      },
    },
  },
  serverOff: {
    id: 'demo-server-off',
    type: 'bitmain-immersion',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            server_on: false,
            disconnect: false,
          },
        },
        config: {},
      },
    },
  },
  offline: {
    id: 'demo-offline',
    type: 'bitmain-immersion',
    status: 'offline',
    last: {
      snap: {
        stats: {
          container_specific: {
            server_on: false,
            disconnect: true,
          },
        },
        config: {},
      },
    },
  },
} as const

type PresetKey = keyof typeof DEMO_PRESETS

/**
 * BitMain Immersion System Demo
 *
 * Interactive demonstration of system status and pump station components
 */
export const BitMainImmersionSystemDemo = (): ReactElement => {
  // System Status controls
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('allNormal')
  const [useCustom, setUseCustom] = useState(false)
  const [serverOn, setServerOn] = useState(true)
  const [disconnect, setDisconnect] = useState(false)

  // Pump Station #1 controls
  const [pump1Title, setPump1Title] = useState('Pump Station #1')
  const [pump1Alarm, setPump1Alarm] = useState(false)
  const [pump1Ready, setPump1Ready] = useState(true)
  const [pump1Operation, setPump1Operation] = useState(true)
  const [pump1Start, setPump1Start] = useState(true)

  const customDevice = {
    id: 'demo-custom',
    type: 'bitmain-immersion',
    status: 'active',
    last: {
      snap: {
        stats: {
          container_specific: {
            server_on: serverOn,
            disconnect,
          },
        },
        config: {},
      },
    },
  }

  const currentData = useCustom ? customDevice : DEMO_PRESETS[selectedPreset]

  return (
    <div className="bitmain-immersion-system-demo">
      <div className="bitmain-immersion-system-demo__controls">
        {/* System Status Controls */}
        <div className="bitmain-immersion-system-demo__section">
          <h2>System Status Settings</h2>

          <div className="bitmain-immersion-system-demo__presets">
            <h3>Presets</h3>
            <div className="bitmain-immersion-system-demo__preset-buttons">
              {(Object.keys(DEMO_PRESETS) as PresetKey[]).map((key) => (
                <Button
                  key={key}
                  onClick={() => {
                    setSelectedPreset(key)
                    setUseCustom(false)
                  }}
                  variant={selectedPreset === key && !useCustom ? 'primary' : 'secondary'}
                >
                  {key === 'allNormal' && 'All Normal'}
                  {key === 'disconnected' && 'Disconnected'}
                  {key === 'serverOff' && 'Server Off'}
                  {key === 'offline' && 'Offline'}
                </Button>
              ))}
            </div>
          </div>

          <div className="bitmain-immersion-system-demo__custom">
            <h3>Custom System Status</h3>
            <div className="bitmain-immersion-system-demo__checkbox-group">
              <label className="bitmain-immersion-system-demo__checkbox-label">
                <Checkbox
                  checked={serverOn}
                  onCheckedChange={(checked) => {
                    setServerOn(checked === true)
                    setUseCustom(true)
                  }}
                />
                <span>Server Start Allowed</span>
              </label>
              <label className="bitmain-immersion-system-demo__checkbox-label">
                <Checkbox
                  checked={disconnect}
                  onCheckedChange={(checked) => {
                    setDisconnect(checked === true)
                    setUseCustom(true)
                  }}
                />
                <span>Disconnected</span>
              </label>
            </div>
          </div>
        </div>

        {/* Pump Station Controls */}
        <div className="bitmain-immersion-system-demo__section">
          <h2>Pump Station #1 Settings</h2>
          <div className="bitmain-immersion-system-demo__pump-controls">
            <Input
              label="Title"
              type="text"
              value={pump1Title}
              onChange={(e) => setPump1Title(e.target.value)}
              placeholder="Pump Station #1"
            />
            <div className="bitmain-immersion-system-demo__checkbox-group">
              <label className="bitmain-immersion-system-demo__checkbox-label">
                <Checkbox
                  checked={pump1Alarm}
                  onCheckedChange={(checked) => setPump1Alarm(checked === true)}
                />
                <span>Alarm/Fault</span>
              </label>
              <label className="bitmain-immersion-system-demo__checkbox-label">
                <Checkbox
                  checked={pump1Ready}
                  onCheckedChange={(checked) => setPump1Ready(checked === true)}
                />
                <span>Ready</span>
              </label>
              <label className="bitmain-immersion-system-demo__checkbox-label">
                <Checkbox
                  checked={pump1Operation}
                  onCheckedChange={(checked) => setPump1Operation(checked === true)}
                />
                <span>Operating</span>
              </label>
              <label className="bitmain-immersion-system-demo__checkbox-label">
                <Checkbox
                  checked={pump1Start}
                  onCheckedChange={(checked) => setPump1Start(checked === true)}
                />
                <span>Started</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bitmain-immersion-system-demo__preview">
        <div className="bitmain-immersion-system-demo__preview-section">
          <h3>System Status Preview</h3>
          <BitMainImmersionSystemStatus data={currentData} />
        </div>

        <div className="bitmain-immersion-system-demo__preview-section">
          <h3>Individual Pump Stations</h3>
          <div className="bitmain-immersion-system-demo__pumps-grid">
            <BitMainImmersionPumpStationControlBox
              title={pump1Title}
              alarmStatus={pump1Alarm}
              ready={pump1Ready}
              operation={pump1Operation}
              start={pump1Start}
            />
          </div>
        </div>

        <div className="bitmain-immersion-system-demo__preview-section">
          <h3>Pump Station States Examples</h3>
          <div className="bitmain-immersion-system-demo__pumps-grid">
            <BitMainImmersionPumpStationControlBox
              title="All Running"
              alarmStatus={false}
              ready={true}
              operation={true}
              start={true}
            />
            <BitMainImmersionPumpStationControlBox
              title="Ready Not Started"
              alarmStatus={false}
              ready={true}
              operation={false}
              start={false}
            />
            <BitMainImmersionPumpStationControlBox
              title="With Fault"
              alarmStatus={true}
              ready={false}
              operation={false}
              start={false}
            />
            <BitMainImmersionPumpStationControlBox title="Minimal States" alarmStatus={false} />
          </div>
        </div>
      </div>
    </div>
  )
}
