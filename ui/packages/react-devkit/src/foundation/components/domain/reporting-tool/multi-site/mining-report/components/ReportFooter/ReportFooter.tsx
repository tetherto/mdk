import { DEFAULT_TIMEZONE } from '../../mining-report.constants'

type ReportFooterProps = {
  timezone?: string
}

const ReportFooter = ({ timezone = DEFAULT_TIMEZONE }: ReportFooterProps) => (
  <footer className="mdk-mining-report__footer">
    <div className="mdk-mining-report__footer-border" />
    <div className="mdk-mining-report__footer-content">
      <span>Timezone: {timezone}</span>
      <span>Confidential - Internal Use Only</span>
    </div>
  </footer>
)

export default ReportFooter
