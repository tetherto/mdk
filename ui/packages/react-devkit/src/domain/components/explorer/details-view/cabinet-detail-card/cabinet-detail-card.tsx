import { EmptyState, OfflineIcon, Spinner } from "@primitives"

import type { TimelineItemData } from "../../../alarm/alarm-row/alarm-row"
import { AlarmContents } from "../../../alarm/alarm-contents/alarm-contents"
import { ContentBox } from "../../../container/content-box/content-box"
import type { CabinetReadingRow } from "../../../../features/explorer/use-cabinet-detail"
import "./cabinet-detail-card.scss"

const OFFLINE_ICON_SIZE = 16

export type CabinetDetailCardProps = {
  /** Cabinet display title (`LV Cabinet 1` / transformer title). */
  title: string
  /** Non-root powermeter reading rows. */
  powerMeters: CabinetReadingRow[]
  /** The cabinet-root temperature reading, when present. */
  rootTempSensor?: CabinetReadingRow
  /** Non-root temperature sensor reading rows. */
  tempSensors: CabinetReadingRow[]
  /** Active-warnings timeline items. */
  alarmsDataItems: TimelineItemData[]
  /** Router navigate used by warning rows to deep-link into the alert. */
  onNavigate?: (path: string) => void
  /** Shows a spinner while the cabinet snapshot is loading. */
  isLoading?: boolean
}

const ReadingRow = ({ row }: { row: CabinetReadingRow }) => (
  <div className="mdk-cabinet-detail-card__row">
    <span className="mdk-cabinet-detail-card__label">
      {row.label}
      {row.isOffline && <OfflineIcon width={OFFLINE_ICON_SIZE} height={OFFLINE_ICON_SIZE} />}
    </span>
    <span className="mdk-cabinet-detail-card__value" style={row.color ? { color: row.color } : undefined}>
      {row.value}
    </span>
    <span className="mdk-cabinet-detail-card__unit">{row.unit}</span>
  </div>
)

/**
 * Read-only LV cabinet detail: powermeter readings, the root plus per-position
 * temperature readings (severity-coloured, with an offline marker), and the
 * active-warnings timeline. Presentational — shape the rows with
 * {@link useCabinetDetail}.
 *
 * @category cards
 * @domain device-management
 * @tier advanced
 */
export const CabinetDetailCard = ({
  title,
  powerMeters,
  rootTempSensor,
  tempSensors,
  alarmsDataItems,
  onNavigate = () => {},
  isLoading = false,
}: CabinetDetailCardProps) => {
  const hasTempReadings = Boolean(rootTempSensor) || tempSensors.length > 0

  return (
    <div className="mdk-cabinet-detail-card">
      <div className="mdk-cabinet-detail-card__title">Selected: {title}</div>
      {isLoading && <Spinner />}

      <ContentBox title="Powermeter readings">
        {powerMeters.length > 0 ? (
          powerMeters.map((row) => <ReadingRow key={row.id} row={row} />)
        ) : (
          <EmptyState description="No powermeter readings" size="sm" />
        )}
      </ContentBox>

      {hasTempReadings && (
        <ContentBox title="Temp sensor readings">
          {rootTempSensor && <ReadingRow row={rootTempSensor} />}
          {tempSensors.map((row) => (
            <ReadingRow key={row.id} row={row} />
          ))}
        </ContentBox>
      )}

      <ContentBox title="LV cabinet warnings">
        <AlarmContents alarmsData={alarmsDataItems} onNavigate={onNavigate} />
      </ContentBox>
    </div>
  )
}
