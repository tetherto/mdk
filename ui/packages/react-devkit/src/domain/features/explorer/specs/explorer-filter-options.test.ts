import { describe, expect, it } from "vitest"

import type { ListThingsDevice } from "@tetherto/mdk-ui-foundation"

import {
  EXPLORER_FILTER_FIELD,
  getExplorerFilterOptions,
  matchesExplorerFilters,
} from "../explorer-filter-options"

const row = (overrides: Partial<ListThingsDevice> = {}): ListThingsDevice => ({
  id: "thing-1",
  type: "container-bd-d40-m56",
  ...overrides,
})

const withStats = (stats: Record<string, unknown>, base: Partial<ListThingsDevice> = {}) =>
  row({ ...base, last: { ...base.last, snap: { stats } } })

describe("getExplorerFilterOptions", () => {
  it("gives containers Type, Status and Container Alarm", () => {
    const options = getExplorerFilterOptions("container")
    expect(options.map((o) => o.label)).toEqual(["Type", "Status", "Container Alarm"])
    expect(options[0]?.value).toBe(EXPLORER_FILTER_FIELD.TYPE)
  })

  it("gives miners Type, Status, Power mode and Miner LED", () => {
    const options = getExplorerFilterOptions("miner")
    expect(options.map((o) => o.label)).toEqual(["Type", "Status", "Power mode", "Miner LED"])
  })

  it("gives cabinets only Type", () => {
    const options = getExplorerFilterOptions("cabinet")
    expect(options.map((o) => o.label)).toEqual(["Type"])
  })

  it("labels container types with their friendly names", () => {
    const type = getExplorerFilterOptions("container")[0]
    const m56 = type?.children?.find((c) => c.value === "container-bd-d40-m56")
    expect(m56?.label).toBe("Bitdeer M56")
  })
})

describe("matchesExplorerFilters", () => {
  it("passes every row when no filters are active", () => {
    expect(matchesExplorerFilters(row(), {})).toBe(true)
  })

  it("matches by type", () => {
    expect(matchesExplorerFilters(row(), { [EXPLORER_FILTER_FIELD.TYPE]: "container-bd-d40-m56" })).toBe(true)
    expect(matchesExplorerFilters(row(), { [EXPLORER_FILTER_FIELD.TYPE]: "container-mbt-alpha" })).toBe(false)
  })

  it("treats an offline snapshot as offline status", () => {
    const offline = withStats({ status: "offline" })
    expect(matchesExplorerFilters(offline, { [EXPLORER_FILTER_FIELD.STATUS]: "offline" })).toBe(true)
    expect(matchesExplorerFilters(offline, { [EXPLORER_FILTER_FIELD.STATUS]: "running" })).toBe(false)
  })

  it("OR-matches within a category (array of values)", () => {
    const running = withStats({ status: "running" })
    expect(
      matchesExplorerFilters(running, { [EXPLORER_FILTER_FIELD.STATUS]: ["running", "stopped"] }),
    ).toBe(true)
  })

  it("derives Container Alarm from alerts when no alarm_status field", () => {
    const alarmed = row({ last: { alerts: [{ name: "x", description: "y", severity: "high", createdAt: 1 }] } })
    const calm = row({ last: { alerts: [] } })
    expect(matchesExplorerFilters(alarmed, { [EXPLORER_FILTER_FIELD.CONTAINER_ALARM]: "true" })).toBe(true)
    expect(matchesExplorerFilters(calm, { [EXPLORER_FILTER_FIELD.CONTAINER_ALARM]: "true" })).toBe(false)
    expect(matchesExplorerFilters(calm, { [EXPLORER_FILTER_FIELD.CONTAINER_ALARM]: "false" })).toBe(true)
  })

  it("requires ALL active categories to match", () => {
    const r = withStats({ status: "running" }, { type: "container-bd-d40-m56" })
    expect(
      matchesExplorerFilters(r, {
        [EXPLORER_FILTER_FIELD.TYPE]: "container-bd-d40-m56",
        [EXPLORER_FILTER_FIELD.STATUS]: "offline",
      }),
    ).toBe(false)
  })
})
