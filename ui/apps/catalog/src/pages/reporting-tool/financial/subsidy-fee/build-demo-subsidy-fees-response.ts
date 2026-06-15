import type {
  SubsidyFeesLogEntry,
  SubsidyFeesResponse,
} from '@tetherto/mdk-react-devkit/foundation'

const BTC_SATS = 100_000_000

/**
 * Deterministic demo payload for the Subsidy / Fee reporting page (demo app only).
 */
export const buildDemoSubsidyFeesResponse = (): SubsidyFeesResponse => {
  const log: SubsidyFeesLogEntry[] = []
  const anchor = new Date()

  for (let i = 0; i < 400; i++) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - i, 12, 0, 0, 0)
    const cycle = i % 8
    const blockReward = Math.round(3.125 * BTC_SATS)
    const blockTotalFees = Math.round((0.09 + cycle * 0.006) * BTC_SATS)

    log.push({
      ts: d.getTime(),
      blockReward,
      blockTotalFees,
      avgFeesSatsVByte: 0.24 + cycle * 0.01,
    })
  }

  const totalBlockReward = log.reduce((sum, entry) => sum + entry.blockReward, 0)
  const totalBlockTotalFees = log.reduce((sum, entry) => sum + entry.blockTotalFees, 0)

  return {
    log,
    summary: {
      totalBlockReward,
      totalBlockTotalFees,
      avgBlockReward: log.length ? totalBlockReward / log.length : null,
      avgBlockTotalFees: log.length ? totalBlockTotalFees / log.length : null,
    },
  }
}
