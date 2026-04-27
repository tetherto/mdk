import type { LogActivityIconProps } from './types'
import { ACTIVITY_LOG_STATUS } from './constants'

const ClockCircleOutlined = (): JSX.Element => {
  return (
    <svg
      width="1em"
      height="1em"
      focusable="false"
      aria-hidden="true"
      fill="red"
      viewBox="64 64 896 896"
      data-icon="clock-circle"
    >
      <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"></path>
      <path d="M686.7 638.6L544.1 535.5V288c0-4.4-3.6-8-8-8H488c-4.4 0-8 3.6-8 8v275.4c0 2.6 1.2 5 3.3 6.5l165.4 120.6c3.6 2.6 8.6 1.8 11.2-1.7l28.6-39c2.6-3.7 1.8-8.7-1.8-11.2z"></path>
    </svg>
  )
}

const CheckCircleFilled = (): JSX.Element => {
  return (
    <svg
      width="1em"
      height="1em"
      focusable="false"
      aria-hidden="true"
      fill="green"
      viewBox="64 64 896 896"
      data-icon="check-circle"
    >
      <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z"></path>
    </svg>
  )
}

type ActivityStatus = (typeof ACTIVITY_LOG_STATUS)[keyof typeof ACTIVITY_LOG_STATUS]

const STATUS_ICON_MAP: Record<ActivityStatus, JSX.Element> = {
  [ACTIVITY_LOG_STATUS.COMPLETED]: <CheckCircleFilled />,
  [ACTIVITY_LOG_STATUS.PENDING]: <ClockCircleOutlined />,
}

const LogActivityIcon = ({ status }: LogActivityIconProps): JSX.Element | null => {
  return (status && STATUS_ICON_MAP[status as ActivityStatus]) || null
}

LogActivityIcon.displayName = 'LogActivityIcon'

export { LogActivityIcon }
export default LogActivityIcon
