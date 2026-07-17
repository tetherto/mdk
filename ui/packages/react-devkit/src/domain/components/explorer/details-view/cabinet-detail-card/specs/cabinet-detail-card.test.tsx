// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { CabinetReadingRow } from "../../../../../features/explorer/use-cabinet-detail"
import { CabinetDetailCard } from "../cabinet-detail-card"

vi.mock("../../../../alarm/alarm-contents/alarm-contents", () => ({
  AlarmContents: vi.fn(({ alarmsData }) => (
    <div data-testid="alarm-contents" data-count={(alarmsData ?? []).length} />
  )),
}))

const powerRow: CabinetReadingRow = {
  id: "pm1",
  label: "DEMO X1 A",
  value: "12.5",
  unit: "kW",
  isOffline: false,
}

const tempRow: CabinetReadingRow = {
  id: "ts1",
  label: "Temperature Sensor b",
  value: "42",
  unit: "°C",
  color: "rgb(255,0,0)",
  isOffline: true,
}

const baseProps = {
  title: "LV Cabinet 1",
  powerMeters: [] as CabinetReadingRow[],
  tempSensors: [] as CabinetReadingRow[],
  alarmsDataItems: [],
}

describe("CabinetDetailCard", () => {
  it("shows the selected cabinet title and the three section boxes", () => {
    render(<CabinetDetailCard {...baseProps} />)
    expect(screen.getByText("Selected: LV Cabinet 1")).toBeInTheDocument()
    expect(screen.getByText("Powermeter readings")).toBeInTheDocument()
    expect(screen.getByText("LV cabinet warnings")).toBeInTheDocument()
  })

  it("renders powermeter reading rows", () => {
    render(<CabinetDetailCard {...baseProps} powerMeters={[powerRow]} />)
    expect(screen.getByText("DEMO X1 A")).toBeInTheDocument()
    expect(screen.getByText("12.5")).toBeInTheDocument()
    expect(screen.getByText("kW")).toBeInTheDocument()
  })

  it("shows an empty state when there are no powermeters", () => {
    render(<CabinetDetailCard {...baseProps} />)
    expect(screen.getByText("No powermeter readings")).toBeInTheDocument()
  })

  it("renders the temp-sensor box with the root sensor and colours the value", () => {
    render(
      <CabinetDetailCard
        {...baseProps}
        rootTempSensor={{
          id: "root",
          label: "Cabinet Temp Sensor",
          value: "50",
          unit: "°C",
          isOffline: false,
        }}
        tempSensors={[tempRow]}
      />,
    )
    expect(screen.getByText("Temp sensor readings")).toBeInTheDocument()
    expect(screen.getByText("Cabinet Temp Sensor")).toBeInTheDocument()
    const value = screen.getByText("42")
    expect(value).toHaveStyle({ color: "rgb(255,0,0)" })
  })

  it("hides the temp-sensor box when there are no temperature readings", () => {
    render(<CabinetDetailCard {...baseProps} />)
    expect(screen.queryByText("Temp sensor readings")).not.toBeInTheDocument()
  })

  it("passes the warning timeline items to the alarms box", () => {
    render(
      <CabinetDetailCard
        {...baseProps}
        alarmsDataItems={[{ id: "a" }, { id: "b" }] as never}
      />,
    )
    expect(screen.getByTestId("alarm-contents")).toHaveAttribute("data-count", "2")
  })
})
