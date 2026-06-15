import { DEFAULT_SHOW_LOGO } from '../../mining-report.constants'
import { CoverLogo } from '../Icons'

import { BtcPriceIcon } from './BtcPriceIcon'

type ReportHeaderProps = Partial<{
  title: string
  subtitle: string
  priceText: string
  priceValue: string
  showLogo: boolean
}>

const ReportHeader = ({
  title,
  subtitle,
  priceText,
  priceValue,
  showLogo = DEFAULT_SHOW_LOGO,
}: ReportHeaderProps) => (
  <header className="mdk-mining-report__header">
    <div className="mdk-mining-report__header-content">
      {showLogo ? (
        <div className="mdk-mining-report__header-logo">
          <CoverLogo />
        </div>
      ) : null}
      <div className="mdk-mining-report__header-titles">
        <h1 className="mdk-mining-report__header-title">{title}</h1>
        {subtitle ? <p className="mdk-mining-report__header-subtitle">{subtitle}</p> : null}
      </div>
      {priceValue ? (
        <div className="mdk-mining-report__header-price">
          <BtcPriceIcon />
          <span className="mdk-mining-report__header-price-label">{priceText}</span>
          <span className="mdk-mining-report__header-price-value">{priceValue}</span>
        </div>
      ) : null}
    </div>
    <div className="mdk-mining-report__header-border" />
  </header>
)

export default ReportHeader
