import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ContainerWidgets } from "../container-widgets"
import type { ContainerWidgetItem } from "../container-widgets"

vi.mock("@tetherto/mdk-react-adapter", async () => {
  const actual = await vi.importActual<typeof import("@tetherto/mdk-react-adapter")>(
    "@tetherto/mdk-react-adapter",
  )
  return {
    ...actual,
    useTimezoneFormatter: vi.fn(() => ({
      getFormattedDate: vi.fn((date) => date || "2024-01-15 10:30:00"),
    })),
  }
})

const containers: ContainerWidgetItem[] = [
  { id: "a", title: "Container A", summary: [{ label: "Hash Rate", value: "1.24 PH/s" }] },
  { id: "b", title: "Container B", summary: [] },
]

describe("containerWidgets", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders one card per container", () => {
    render(<ContainerWidgets containers={containers} />)
    expect(screen.getByText("Container A")).toBeInTheDocument()
    expect(screen.getByText("Container B")).toBeInTheDocument()
  })

  it("renders a section title only when one is provided", () => {
    const { rerender } = render(<ContainerWidgets containers={containers} />)
    expect(screen.queryByText("Containers")).not.toBeInTheDocument()

    rerender(<ContainerWidgets containers={containers} title="Containers" />)
    expect(screen.getByText("Containers")).toBeInTheDocument()
  })

  it("renders an empty state when there are no containers", () => {
    render(<ContainerWidgets containers={[]} />)
    expect(screen.getByText("No containers")).toBeInTheDocument()
    expect(screen.queryByText("Container A")).not.toBeInTheDocument()
  })

  it("renders an error state in place of the grid", () => {
    render(<ContainerWidgets containers={containers} errorMessage="boom" />)
    expect(screen.getByText("boom")).toBeInTheDocument()
    expect(screen.queryByText("Container A")).not.toBeInTheDocument()
  })

  it("routes the container id on card click", () => {
    const onContainerClick = vi.fn()
    render(<ContainerWidgets containers={containers} onContainerClick={onContainerClick} />)
    fireEvent.click(screen.getByText("Container A"))
    expect(onContainerClick).toHaveBeenCalledWith("a")
  })
})
