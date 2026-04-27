import type { LogItemProps } from './types'
import { RightNavigateIcon } from '../icons'

const LogItem = ({ data, onLogClicked }: LogItemProps): JSX.Element => {
  const { title, subtitle, body, uuid } = data

  const handleClick = (): void => {
    onLogClicked?.(uuid)
  }

  const bodyItems = body?.split('|') ?? []

  return (
    <div className="mdk-logs-card__container">
      <div className="mdk-logs-card__log-inner-container" onClick={handleClick}>
        <div className="mdk-logs-card__data-container">
          <div className="mdk-logs-card__header-container">
            <div className="mdk-logs-card__title-text">{title}</div>
          </div>

          <div className="mdk-logs-card__subtitle-text" title={subtitle}>
            {subtitle}
          </div>

          <div className="mdk-logs-card__body-text">
            {bodyItems.map((item, index) => (
              <div key={`${uuid}-${index}`}>{item}</div>
            ))}
          </div>
        </div>

        {onLogClicked && (
          <div className="mdk-logs-card__icon-wrapper">
            <RightNavigateIcon />
          </div>
        )}
      </div>
    </div>
  )
}

LogItem.displayName = 'LogItem'

export { LogItem }
export default LogItem
