import type { ReactNode } from 'react'

import { DEFAULT_IS_COVER, DEFAULT_SHOW_LOGO, DEFAULT_TIMEZONE } from '../../mining-report.constants'
import '../../mining-report.scss'
import ReportFooter from '../ReportFooter/ReportFooter'
import ReportHeader from '../ReportHeader/ReportHeader'

type ReportPageProps = {
  children: ReactNode
  title?: string
  subtitle?: string
  priceText?: string
  priceValue?: string
  showLogo?: boolean
  isCover?: boolean
  timezone?: string
}

const ReportPage = ({
  children,
  title,
  subtitle,
  priceText,
  priceValue,
  showLogo = DEFAULT_SHOW_LOGO,
  isCover = DEFAULT_IS_COVER,
  timezone = DEFAULT_TIMEZONE,
}: ReportPageProps) => (
  <div className="mdk-mining-report__page-wrapper" data-report-page>
    <div className="mdk-mining-report__page-content">
      {title && (
        <ReportHeader
          title={title}
          subtitle={subtitle}
          priceText={priceText}
          priceValue={priceValue}
          showLogo={showLogo}
        />
      )}
      {children}

      {!isCover && <ReportFooter timezone={timezone} />}
    </div>
  </div>
)

export default ReportPage
