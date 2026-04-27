import { Label, Switch } from '@mdk/core'
import { DemoPageHeader } from '../../../components/demo-page-header'
import { Socket } from '@mdk/foundation'
import type { ReactElement } from 'react'
import * as React from 'react'
import './socket-demo.scss'

/**
 * Socket Demo
 *
 * Covers every rendering branch in the Socket component:
 * status states, heatmap modes, cooling, edit flow, power modes
 */

const makeMiner = (overrides: Record<string, any> = {}) => ({
  id: 'miner-1',
  snap: {
    stats: { hashrate_mhs: { t_5m: 110 }, status: 'mining' },
    config: { power_mode: 'normal', led_status: false },
  },
  temperature: { chip: 72, board: 65, pcb: 60 },
  last: {
    snap: {
      stats: { hashrate_mhs: { t_5m: 110 }, status: 'mining' },
      config: { power_mode: 'normal' },
    },
    alerts: [],
  },
  ...overrides,
})

const minerMining = makeMiner()

const minerSleeping = makeMiner({
  snap: {
    stats: { hashrate_mhs: { t_5m: 0 }, status: 'sleeping' },
    config: { power_mode: 'sleep' },
  },
})

const minerConnecting = makeMiner({
  snap: undefined,
  last: { snap: undefined, err: undefined },
})

const minerError = makeMiner({
  snap: {
    stats: { hashrate_mhs: { t_5m: 0 }, status: 'error', errors: [] },
    config: { power_mode: 'normal' },
  },
  last: {
    alerts: [
      {
        name: 'Fan Failure',
        description: 'fan failure',
        severity: 'critical',
        createdAt: 1774953213195,
      },
    ],
  },
})

const minerOffline = makeMiner({
  snap: {
    stats: { hashrate_mhs: { t_5m: 0 }, status: 'offline', errors: [] },
    config: { power_mode: 'normal' },
  },
})

const minerErrorMining = makeMiner({
  snap: {
    stats: {
      hashrate_mhs: { t_5m: 85 },
      status: 'error',
      are_all_errors_minor: true,
      errors: [{ msg: 'Hashboard 2 overheating', level: 'minor', timestamp: '1774953213195' }],
    },
    config: { power_mode: 'normal' },
  },
})

const minerHighPower = makeMiner({
  snap: {
    stats: { hashrate_mhs: { t_5m: 130 }, status: 'mining' },
    config: { power_mode: 'high' },
  },
})

const minerLowPower = makeMiner({
  snap: { stats: { hashrate_mhs: { t_5m: 60 }, status: 'mining' }, config: { power_mode: 'low' } },
})

const pdu = { pdu: 1 }

type DemoSectionProps = {
  title: string
  children: React.ReactNode
}

const DemoSection = ({ title, children }: DemoSectionProps) => (
  <div className="socket-demo__section">
    <h3>{title}</h3>
    <div className="socket-demo__grid">{children}</div>
  </div>
)

type LabeledSocketProps = {
  label: string
  children: React.ReactNode
}

const LabeledSocket = ({ label, children }: LabeledSocketProps) => (
  <div className="socket-demo__labeled">
    {children}
    <span className="socket-demo__label">{label}</span>
  </div>
)

export const SocketDemo = (): ReactElement => {
  const [enableSocket, setEnableSocket] = React.useState(true)

  return (
    <div className="socket-demo">
      <DemoPageHeader
        title="Socket"
        description="All socket states, heatmap modes, cooling and edit flow variants"
      />

      <div className="socket-demo__switch">
        <Label htmlFor="enableSocket">Enable socket</Label>
        <Switch
          id="enableSocket"
          color="primary"
          defaultChecked={enableSocket}
          onCheckedChange={setEnableSocket}
        />
      </div>
      <div className="socket-demo__examples">
        <DemoSection title="Miner Status States">
          <LabeledSocket label="Mining">
            <Socket
              socket={1}
              enabled={enableSocket}
              power_w={3250}
              current_a={14.5}
              miner={minerMining}
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="Sleeping">
            <Socket
              socket={2}
              enabled={enableSocket}
              power_w={1200}
              current_a={5.2}
              miner={minerSleeping}
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="Connecting">
            <Socket
              socket={3}
              enabled={enableSocket}
              power_w={null}
              current_a={null}
              miner={minerConnecting}
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="Offline">
            <Socket
              socket={3}
              enabled={enableSocket}
              power_w={null}
              current_a={null}
              miner={minerOffline}
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="Error">
            <Socket
              socket={4}
              enabled={enableSocket}
              power_w={0}
              current_a={0}
              miner={minerError}
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="Error Mining">
            <Socket
              socket={5}
              enabled={enableSocket}
              power_w={2800}
              current_a={12.1}
              miner={minerErrorMining}
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="Disconnected">
            <Socket socket={6} enabled={enableSocket} miner={null} pdu={pdu} />
          </LabeledSocket>
          <LabeledSocket label="Disabled">
            <Socket socket={7} enabled={enableSocket} miner={null} pdu={pdu} />
          </LabeledSocket>
        </DemoSection>

        <DemoSection title="Selected & Click Disabled">
          <LabeledSocket label="Default">
            <Socket
              socket={1}
              enabled={enableSocket}
              power_w={3250}
              current_a={14.5}
              miner={minerMining}
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="Selected">
            <Socket
              socket={2}
              enabled={enableSocket}
              power_w={3250}
              current_a={14.5}
              miner={minerMining}
              selected
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="Click disabled">
            <Socket
              socket={3}
              enabled={enableSocket}
              power_w={3250}
              current_a={14.5}
              miner={minerMining}
              clickDisabled
              pdu={pdu}
            />
          </LabeledSocket>
        </DemoSection>

        <DemoSection title="Power Mode Border Colors">
          <LabeledSocket label="Normal">
            <Socket
              socket={1}
              enabled={enableSocket}
              power_w={3250}
              current_a={14.5}
              miner={minerMining}
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="High">
            <Socket
              socket={2}
              enabled={enableSocket}
              power_w={3800}
              current_a={16.5}
              miner={minerHighPower}
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="Low">
            <Socket
              socket={3}
              enabled={enableSocket}
              power_w={1800}
              current_a={7.8}
              miner={minerLowPower}
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="Sleep">
            <Socket
              socket={4}
              enabled={enableSocket}
              power_w={1200}
              current_a={5.2}
              miner={minerSleeping}
              pdu={pdu}
            />
          </LabeledSocket>
        </DemoSection>

        <DemoSection title="Edit Flow">
          <LabeledSocket label="Empty + edit">
            <Socket socket={1} enabled={enableSocket} miner={null} isEditFlow pdu={pdu} />
          </LabeledSocket>
          <LabeledSocket label="Empty, no edit">
            <Socket socket={2} enabled={enableSocket} miner={null} pdu={pdu} />
          </LabeledSocket>
          <LabeledSocket label="Occupied + edit">
            <Socket
              socket={3}
              enabled={enableSocket}
              power_w={3250}
              current_a={14.5}
              miner={minerMining}
              isEditFlow
              pdu={pdu}
            />
          </LabeledSocket>
        </DemoSection>

        <DemoSection title="Cooling Fan">
          <LabeledSocket label="Cooling on">
            <Socket
              socket={1}
              enabled={enableSocket}
              cooling={true}
              miner={minerMining}
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="Cooling off">
            <Socket
              socket={2}
              enabled={enableSocket}
              cooling={false}
              miner={minerMining}
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="No cooling prop">
            <Socket
              socket={3}
              enabled={enableSocket}
              cooling={undefined}
              miner={minerMining}
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="Empty + cooling on">
            <Socket socket={4} enabled={enableSocket} cooling={true} miner={null} pdu={pdu} />
          </LabeledSocket>
        </DemoSection>

        <DemoSection title="Heatmap — Chip Temperature">
          {[30, 45, 58, 68, 78, 88, 96].map((temp, i) => (
            <LabeledSocket key={temp} label={`${temp}°C`}>
              <Socket
                socket={i + 1}
                enabled={enableSocket}
                miner={makeMiner({ temperature: { chip: temp } })}
                heatmap={{
                  isHeatmapMode: true,
                  mode: 'chip',
                  ranges: { chip: { min: 30, max: 100 } },
                }}
                pdu={pdu}
              />
            </LabeledSocket>
          ))}
        </DemoSection>

        <DemoSection title="Heatmap — Board Temperature">
          {[35, 50, 62, 70, 80, 90].map((temp, i) => (
            <LabeledSocket key={temp} label={`${temp}°C`}>
              <Socket
                socket={i + 1}
                enabled={enableSocket}
                miner={makeMiner({ temperature: { board: temp } })}
                heatmap={{
                  isHeatmapMode: true,
                  mode: 'board',
                  ranges: { board: { min: 30, max: 100 } },
                }}
                pdu={pdu}
              />
            </LabeledSocket>
          ))}
        </DemoSection>

        <DemoSection title="Heatmap — Hashrate">
          {[0, 30, 60, 90, 110, 130, 150].map((hr, i) => (
            <LabeledSocket key={hr} label={`${hr} TH`}>
              <Socket
                socket={i + 1}
                enabled={enableSocket}
                miner={makeMiner({
                  snap: {
                    stats: { hashrate_mhs: { t_5m: hr }, status: 'mining' },
                    config: { power_mode: 'normal' },
                  },
                })}
                heatmap={{
                  isHeatmapMode: true,
                  mode: 'hashrate',
                  ranges: { hashrate: { min: 0, max: 150 } },
                }}
                pdu={pdu}
              />
            </LabeledSocket>
          ))}
        </DemoSection>

        <DemoSection title="Heatmap — No Miner / Error">
          <LabeledSocket label="Disconnected">
            <Socket
              socket={1}
              enabled={enableSocket}
              miner={null}
              heatmap={{
                isHeatmapMode: true,
                mode: 'chip',
                ranges: { chip: { min: 30, max: 100 } },
              }}
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="Error">
            <Socket
              socket={2}
              enabled={enableSocket}
              miner={{ ...minerMining, error: true }}
              heatmap={{
                isHeatmapMode: true,
                mode: 'chip',
                ranges: { chip: { min: 30, max: 100 } },
              }}
              pdu={pdu}
            />
          </LabeledSocket>
        </DemoSection>

        <DemoSection title="Empty Power Dashed">
          <LabeledSocket label="Dashed (0W)">
            <Socket
              socket={1}
              enabled={enableSocket}
              power_w={0}
              current_a={0}
              miner={minerMining}
              isEmptyPowerDashed
              pdu={pdu}
            />
          </LabeledSocket>
          <LabeledSocket label="No flag (0W)">
            <Socket
              socket={2}
              enabled={enableSocket}
              power_w={0}
              current_a={0}
              miner={minerMining}
              pdu={pdu}
            />
          </LabeledSocket>
        </DemoSection>
      </div>
    </div>
  )
}
