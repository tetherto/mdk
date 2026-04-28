import type { PowerModeTimelineEntry } from '@tetherto/mdk-foundation-ui'

export const randomElement = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]!

export const generateTimelineData = (
  miners: string[],
  count: number,
  intervalMs: number,
  startTime: number,
  powerModes: readonly string[],
  statuses: readonly string[],
): PowerModeTimelineEntry[] => {
  const data: PowerModeTimelineEntry[] = []
  const minerStates: Record<string, { powerMode: string; status: string }> = {}

  for (const miner of miners) {
    minerStates[miner] = {
      powerMode: randomElement(powerModes),
      status: randomElement(statuses),
    }
  }

  for (let i = 0; i < count; i++) {
    const ts = startTime + i * intervalMs
    const power_mode_group_aggr: Record<string, string> = {}
    const status_group_aggr: Record<string, string> = {}

    for (const miner of miners) {
      const state = minerStates[miner]
      if (state) {
        if (Math.random() < 0.1) {
          state.powerMode = randomElement(powerModes)
        }
        if (Math.random() < 0.05) {
          state.status = randomElement(statuses)
        }

        power_mode_group_aggr[miner] = state.powerMode
        status_group_aggr[miner] = state.status
      }
    }

    data.push({
      ts,
      power_mode_group_aggr,
      status_group_aggr,
    })
  }

  return data
}
