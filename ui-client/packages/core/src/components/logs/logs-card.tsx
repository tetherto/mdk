import { EMPTY_MESSAGE_INCIDENTS, INITIAL_SKELETON_ROWS, SKELETON_HEIGHT } from './constants'
import LogRow from './log-row'
import type { LogsCardProps } from './types'
import { cn } from '../../utils'
import { LabeledCard } from '../labeled-card'
import { Pagination } from '../pagination'
import { SkeletonBlock } from '../skeleton'
import { EmptyState } from '../empty-state'

const LogsCard = ({
  type,
  label,
  pagination,
  onLogClicked,
  logsData = [],
  isDark = false,
  isLoading = false,
  skeletonRows = INITIAL_SKELETON_ROWS,
  emptyMessage = EMPTY_MESSAGE_INCIDENTS,
}: LogsCardProps): JSX.Element => {
  const isEmpty = !logsData.length
  const isPaginationHidden = pagination?.current === 1 || isEmpty

  const renderSkeleton = (): JSX.Element => (
    <div className="mdk-logs-card__skeleton-row">
      {Array.from({ length: skeletonRows }).map((_, index) => (
        <SkeletonBlock key={index} height={SKELETON_HEIGHT} />
      ))}
    </div>
  )

  const renderEmptyState = (): JSX.Element => (
    <div className="mdk-logs-card__empty">
      <EmptyState description={emptyMessage} />
    </div>
  )

  const renderRows = (): JSX.Element[] =>
    logsData.map((log, index) => (
      <LogRow log={log} type={type || ''} key={log?.uuid ?? index} onLogClicked={onLogClicked} />
    ))

  return (
    <LabeledCard label={label} isDark={isDark}>
      {isLoading ? (
        renderSkeleton()
      ) : (
        <div className="mdk-logs-card__inner-container">
          <div
            className={cn(
              'mdk-logs-card__list-container',
              isEmpty && 'mdk-logs-card__list-container--empty',
            )}
          >
            {isPaginationHidden ? renderEmptyState() : renderRows()}
          </div>
          {pagination && !isPaginationHidden && (
            <Pagination
              total={pagination.total}
              current={pagination.current}
              pageSize={pagination.pageSize}
              className="mdk-logs-card__pagination"
              onChange={pagination.handlePaginationChange}
            />
          )}
        </div>
      )}
    </LabeledCard>
  )
}

LogsCard.displayName = 'LogsCard'

export { LogsCard }
export default LogsCard
