import type { ContainerStats } from '@mdk/foundation'
import type { ReactElement } from 'react'
import { MinerChip } from './miner-chip/miner-chip'
import './miner-chips-card.scss'

type MinerChipsCardProps = {
  data: ContainerStats
}

export const MinerChipsCard = ({ data }: MinerChipsCardProps) => {
  const getMinerChips = (): ReactElement[] =>
    (data?.frequency_mhz?.chips ?? [])
      .map((chip) => {
        const tempData = data?.temperature_c?.chips?.find(({ index }) => index === chip.index)

        if (
          tempData?.max === undefined ||
          tempData?.min === undefined ||
          tempData?.avg === undefined
        ) {
          return null
        }

        return (
          <MinerChip
            key={chip.index}
            index={chip.index}
            frequency={{ current: chip.current }}
            temperature={{
              max: tempData.max,
              min: tempData.min,
              avg: tempData.avg,
            }}
          />
        )
      })
      .filter((chip) => chip !== null)

  const chips = getMinerChips()

  return (
    <>
      {chips.length > 0 && (
        <div className="mdk-miner-chips-card">
          <span className="mdk-miner-chips-card__label">Chips</span>
          <div className="mdk-miner-chips-card__chips">{chips}</div>
        </div>
      )}
    </>
  )
}
