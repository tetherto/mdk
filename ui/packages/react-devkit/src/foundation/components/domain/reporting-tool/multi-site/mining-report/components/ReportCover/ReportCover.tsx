import { Spinner } from '@core'
import _capitalize from 'lodash/capitalize'

import { CoverLogo } from '../Icons'

import { BackgroundImage } from './BackgroundImage'

type ReportCoverProps = {
  title: string
  subtitle?: string
  isFront?: boolean
  showLogo?: boolean
  isLoading?: boolean
}

const ReportCover = ({
  title,
  subtitle,
  isFront = true,
  showLogo = true,
  isLoading = false,
}: ReportCoverProps) => (
  <div className="mdk-mining-report__cover">
    <BackgroundImage />

    <div
      className={
        isFront
          ? 'mdk-mining-report__cover-panel mdk-mining-report__cover-panel--front'
          : 'mdk-mining-report__cover-panel mdk-mining-report__cover-panel--back'
      }
    >
      {showLogo && (
        <div className="mdk-mining-report__cover-logo">
          <CoverLogo />
        </div>
      )}

      {isLoading ? (
        <div className="mdk-mining-report__cover-loading">
          <Spinner />
        </div>
      ) : (
        <div
          className={
            isFront
              ? 'mdk-mining-report__cover-content'
              : 'mdk-mining-report__cover-content mdk-mining-report__cover-content--centered'
          }
        >
          <h1 className="mdk-mining-report__cover-title">{_capitalize(title)}</h1>
          {subtitle ? <h4 className="mdk-mining-report__cover-subtitle">{subtitle}</h4> : null}
        </div>
      )}
    </div>
  </div>
)

export default ReportCover
