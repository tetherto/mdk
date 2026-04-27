import { Badge, Card, Indicator, Mosaic, Typography } from '@mdk/core'
import './mosaic-page.scss'

export const MosaicPageDemo = (): JSX.Element => {
  return (
    <div className="mosaic-demo">
      <h2 className="demo-section__title mosaic-demo__title">Mosaic</h2>

      <Mosaic
        template={[
          ['header', 'header', 'header', 'header'],
          ['hashrate', 'hashrate', 'temperature', 'power'],
          ['workers', 'workers', 'chart', 'chart'],
          ['workers', 'workers', 'chart', 'chart'],
          ['alerts', 'alerts', 'earnings', 'earnings'],
        ]}
        columns="1fr 1fr 1fr 1fr"
        rowHeight="150px"
        gap="16px"
      >
        <Mosaic.Item area="header" className="mosaic-demo__header">
          <Typography variant="heading3" color="primary">
            Mining Dashboard
          </Typography>
          <div className="mosaic-demo__header-stats">
            <Typography size="xs" color="muted">
              Active Miners: 156
            </Typography>
            <Typography size="xs" color="muted">
              Pool Status: Online
            </Typography>
          </div>
        </Mosaic.Item>

        <Mosaic.Item area="hashrate" className="mosaic-demo__metric-card">
          <h3>Total Hashrate</h3>
          <p className="mosaic-demo__metric-value">1,540 TH/s</p>
          <p className="mosaic-demo__metric-change">+2.3% from yesterday</p>
        </Mosaic.Item>

        <Mosaic.Item area="temperature" className="mosaic-demo__metric-card">
          <h3>Avg Temperature</h3>
          <p className="mosaic-demo__metric-value">65°C</p>
          <Indicator color="green">Normal</Indicator>
        </Mosaic.Item>

        <Mosaic.Item area="power" className="mosaic-demo__metric-card">
          <h3>Power Consumption</h3>
          <Typography className="mosaic-demo__metric-value">234 kW</Typography>
          <Typography size="xs" color="muted">
            $28.08/hour
          </Typography>
        </Mosaic.Item>

        <Mosaic.Item area="workers" className="mosaic-demo__metric-card">
          <h3>Active Workers</h3>
          <ul className="mosaic-demo__workers-list">
            <li className="mosaic-demo__workers-header">
              <span className="mosaic-demo__workers-col--name">Worker</span>
              <span className="mosaic-demo__workers-col--hashrate">Hashrate</span>
              <span className="mosaic-demo__workers-col--status">Status</span>
            </li>
            {[
              { name: 'Miner-001', hashrate: '10.2 TH/s', status: 'online' },
              { name: 'Miner-002', hashrate: '9.8 TH/s', status: 'online' },
              { name: 'Miner-003', hashrate: '10.5 TH/s', status: 'online' },
              { name: 'Miner-004', hashrate: '0.0 TH/s', status: 'offline' },
              { name: 'Miner-005', hashrate: '10.1 TH/s', status: 'online' },
            ].map((worker) => (
              <li key={worker.name} className="mosaic-demo__workers-row">
                <span className="mosaic-demo__workers-col--name">{worker.name}</span>
                <span className="mosaic-demo__workers-col--hashrate">{worker.hashrate}</span>
                <span className="mosaic-demo__workers-col--status">
                  <Badge color={worker.status === 'online' ? 'success' : 'error'} dot></Badge>
                </span>
              </li>
            ))}
          </ul>
        </Mosaic.Item>

        <Mosaic.Item area="chart" className="mosaic-demo__metric-card">
          <h3>Hashrate History (24h)</h3>
          <div className="mosaic-demo__chart-container">
            <svg width="100%" height="200" viewBox="0 0 400 200" className="mosaic-demo__chart-svg">
              <polyline
                points="0,150 50,120 100,130 150,100 200,110 250,90 300,80 350,70 400,60"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
              />
            </svg>
          </div>
        </Mosaic.Item>

        <Mosaic.Item
          area="alerts"
          className="mosaic-demo__metric-card mosaic-demo__metric-card--scrollable"
        >
          <h3>Recent Alerts</h3>
          <div className="mosaic-demo__alerts-container">
            <Card className="mosaic-demo__alert-card">
              <strong className="mosaic-demo__alert-title">High Temperature</strong>
              <p className="mosaic-demo__alert-description">Miner-012 reached 78°C</p>
              <span className="mosaic-demo__alert-time">2 min ago</span>
            </Card>
            <Card className="mosaic-demo__alert-card">
              <strong className="mosaic-demo__alert-title">Worker Offline</strong>
              <p className="mosaic-demo__alert-description">Miner-004 is not responding</p>
              <span className="mosaic-demo__alert-time">15 min ago</span>
            </Card>
            <Card className="mosaic-demo__alert-card mosaic-demo__alert-card--last">
              <strong className="mosaic-demo__alert-title">Pool Switch</strong>
              <p className="mosaic-demo__alert-description">Switched to backup pool</p>
              <span className="mosaic-demo__alert-time">1 hour ago</span>
            </Card>
          </div>
        </Mosaic.Item>

        <Mosaic.Item
          area="earnings"
          className="mosaic-demo__metric-card mosaic-demo__metric-card--scrollable"
        >
          <h3>Earnings</h3>
          <div className="mosaic-demo__earnings-grid">
            <div className="mosaic-demo__earnings-item">
              <p className="mosaic-demo__earnings-label">Today</p>
              <p className="mosaic-demo__earnings-value">$673.45</p>
            </div>
            <div className="mosaic-demo__earnings-item">
              <p className="mosaic-demo__earnings-label">This Week</p>
              <p className="mosaic-demo__earnings-value">$4,714.15</p>
            </div>
            <div className="mosaic-demo__earnings-item">
              <p className="mosaic-demo__earnings-label">This Month</p>
              <p className="mosaic-demo__earnings-value">$20,187.60</p>
            </div>
            <div className="mosaic-demo__earnings-item">
              <p className="mosaic-demo__earnings-label">All Time</p>
              <p className="mosaic-demo__earnings-value">$156,432.90</p>
            </div>
          </div>
        </Mosaic.Item>
      </Mosaic>
    </div>
  )
}
