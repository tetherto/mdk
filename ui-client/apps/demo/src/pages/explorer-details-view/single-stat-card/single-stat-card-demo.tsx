import { COLOR } from '@tetherto/mdk-core-ui'
import { DemoPageHeader } from '../../../components/demo-page-header'
import { SingleStatCard } from '@tetherto/mdk-foundation-ui'
import type { ReactElement } from 'react'
import './single-stat-card-demo.scss'

/**
 * Single Stat Card Demo
 *
 * Interactive demonstration of SingleStatCard component with various configurations
 */
export const SingleStatCardDemo = (): ReactElement => {
  return (
    <div className="single-stat-card-demo">
      <DemoPageHeader
        title="Single Stat Card"
        description="Versatile statistics display with animations and multiple variants"
      />

      <div className="single-stat-card-demo__examples">
        <h2>Variant Examples</h2>

        <div className="single-stat-card-demo__section">
          <h3>Primary Variant</h3>
          <div className="single-stat-card-demo__grid">
            <SingleStatCard name="Hashrate" value={95.5} unit="TH/s" variant="primary" />
            <SingleStatCard name="Power" value={1500} unit="W" variant="primary" />
            <SingleStatCard name="Efficiency" value={92} unit="%" variant="primary" />
            <SingleStatCard name="Uptime" value={99.8} unit="%" variant="primary" />
          </div>
        </div>

        <div className="single-stat-card-demo__section">
          <h3>Secondary Variant</h3>
          <div className="single-stat-card-demo__grid">
            <SingleStatCard
              name="Inlet Temp"
              subtitle="Water"
              value={28}
              unit="°C"
              variant="secondary"
            />
            <SingleStatCard
              name="Outlet Temp"
              subtitle="Water"
              value={42}
              unit="°C"
              variant="secondary"
            />
            <SingleStatCard
              name="Ambient"
              subtitle="Air"
              value={24}
              unit="°C"
              variant="secondary"
            />
            <SingleStatCard name="Delta" subtitle="Diff" value={14} unit="°C" variant="secondary" />
          </div>
        </div>

        <div className="single-stat-card-demo__section">
          <h3>Tertiary Variant with Colors</h3>
          <div className="single-stat-card-demo__grid">
            <SingleStatCard name="Status" value="Online" variant="tertiary" color={COLOR.GREEN} />
            <SingleStatCard
              name="Alert"
              value="Warning"
              variant="tertiary"
              color={COLOR.COLD_ORANGE}
            />
            <SingleStatCard
              name="Critical"
              value="High Temp"
              variant="tertiary"
              color={COLOR.BRICK_RED}
            />
            <SingleStatCard name="Info" value="Normal" variant="tertiary" color={COLOR.BLUE} />
          </div>
        </div>

        <div className="single-stat-card-demo__section">
          <h3>Flash Animations</h3>
          <div className="single-stat-card-demo__grid">
            <SingleStatCard name="Warning" value={38} unit="°C" flash color={COLOR.COLD_ORANGE} />
            <SingleStatCard
              name="Critical"
              value={45}
              unit="°C"
              superflash
              color={COLOR.BRICK_RED}
            />
            <SingleStatCard
              name="Alarm"
              value="HIGH"
              flash
              variant="tertiary"
              color={COLOR.BRICK_RED}
            />
            <SingleStatCard
              name="Emergency"
              value="STOP"
              superflash
              color={COLOR.RED}
              variant="tertiary"
            />
          </div>
        </div>

        <div className="single-stat-card-demo__section">
          <h3>Row Layout</h3>
          <div className="single-stat-card-demo__grid">
            <SingleStatCard name="Temp" value={42} unit="°C" row />
            <SingleStatCard name="Power" value={1500} unit="W" row variant="secondary" />
            <SingleStatCard
              name="Status"
              value="Active"
              row
              variant="tertiary"
              color={COLOR.GREEN}
            />
          </div>
        </div>

        <div className="single-stat-card-demo__section">
          <h3>Long Values</h3>
          <div className="single-stat-card-demo__grid">
            <SingleStatCard name="Serial" value="ABC123456789" />
            <SingleStatCard name="ID" value="CONTAINER-MICROBT-001" variant="secondary" />
            <SingleStatCard name="Message" value="System Operating Normally" variant="secondary" />
          </div>
        </div>

        <div className="single-stat-card-demo__section">
          <h3>With Subtitles</h3>
          <div className="single-stat-card-demo__grid">
            <SingleStatCard
              name="Inlet"
              subtitle="Water In"
              value={28}
              unit="°C"
              variant="secondary"
            />
            <SingleStatCard
              name="Outlet"
              subtitle="Water Out"
              value={42}
              unit="°C"
              variant="secondary"
            />
            <SingleStatCard
              name="Flow"
              subtitle="Rate"
              value={150}
              unit="L/min"
              variant="secondary"
            />
            <SingleStatCard
              name="Pressure"
              subtitle="PSI"
              value={45}
              unit="PSI"
              variant="secondary"
            />
          </div>
        </div>

        <div className="single-stat-card-demo__section">
          <h3>Custom Tooltips</h3>
          <div className="single-stat-card-demo__grid">
            <SingleStatCard
              name="Temp"
              value={42}
              unit="°C"
              tooltipText="Ambient Temperature Reading"
            />
            <SingleStatCard
              name="Power"
              value={1500}
              unit="W"
              tooltipText="Total Power Consumption"
              variant="secondary"
            />
            <SingleStatCard
              name="Status"
              value="OK"
              tooltipText="System Health Status"
              variant="tertiary"
              color={COLOR.GREEN}
            />
          </div>
        </div>

        <div className="single-stat-card-demo__section">
          <h3>Null/Empty Values</h3>
          <div className="single-stat-card-demo__grid">
            <SingleStatCard name="No Data" value={null} />
            <SingleStatCard name="Undefined" value={undefined} variant="secondary" />
            <SingleStatCard name="Empty String" value="" variant="tertiary" color={COLOR.GREY} />
          </div>
        </div>

        <div className="single-stat-card-demo__section">
          <h3>Numeric Ranges</h3>
          <div className="single-stat-card-demo__grid">
            <SingleStatCard name="Zero" value={0} unit="%" />
            <SingleStatCard name="Decimal" value={99.95} unit="%" variant="secondary" />
            <SingleStatCard name="Large" value={999999} unit="ops" variant="secondary" />
            <SingleStatCard name="Negative" value={-15} unit="°C" variant="secondary" />
          </div>
        </div>
      </div>
    </div>
  )
}
