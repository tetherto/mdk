import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ContainerWidgetCard } from "../container-widget-card"

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

const summary = [
  { label: "Hash Rate", value: "1.24 PH/s" },
  { label: "Max Temp", value: "72 °C" },
]

describe("containerWidgetCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the title and the miners summary in the body", () => {
    render(<ContainerWidgetCard title="Container A" summary={summary} />)
    expect(screen.getByText("Container A")).toBeInTheDocument()
    expect(screen.getByText("Hash Rate")).toBeInTheDocument()
    expect(screen.getByText("1.24 PH/s")).toBeInTheDocument()
  })

  it("renders the offline banner and hides the body when offline", () => {
    render(<ContainerWidgetCard title="Container A" summary={summary} isOffline />)
    expect(screen.getByText("Offline")).toBeInTheDocument()
    expect(screen.queryByText("Hash Rate")).not.toBeInTheDocument()
  })

  it("renders the error banner and hides the body on error", () => {
    render(
      <ContainerWidgetCard title="Container A" summary={summary} errorMessage="Worker unreachable" />,
    )
    expect(screen.getByText("Worker unreachable")).toBeInTheDocument()
    expect(screen.queryByText("Hash Rate")).not.toBeInTheDocument()
  })

  it("applies the flash modifier when flash is true", () => {
    const { container } = render(
      <ContainerWidgetCard title="Container A" summary={summary} flash />,
    )
    expect(container.querySelector(".mdk-container-widget-card--flash")).toBeInTheDocument()
  })

  it("fires onClick and exposes a button role when clickable", () => {
    const onClick = vi.fn()
    render(<ContainerWidgetCard title="Container A" summary={summary} onClick={onClick} />)
    fireEvent.click(screen.getByRole("button"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("renders the vendor content slot above the summary", () => {
    render(
      <ContainerWidgetCard
        title="Container A"
        summary={summary}
        vendorContent={<div data-testid="vendor">vendor</div>}
      />,
    )
    expect(screen.getByTestId("vendor")).toBeInTheDocument()
  })
})
