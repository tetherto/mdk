import type { LogRowProps } from './types'
import LogDot from './log-dot'
import LogItem from './log-item'

const LogRow = ({ style, log, onLogClicked, type }: LogRowProps): JSX.Element => (
  <div className="mdk-logs-card__row-container" style={{ ...style }}>
    <LogDot status={log.status} type={type} />
    <LogItem data={log} onLogClicked={onLogClicked} />
  </div>
)

LogRow.displayName = 'LogRow'

export { LogRow }
export default LogRow
