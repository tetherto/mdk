import { render, screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it } from "vitest"

import { Heatmap } from "../index"

const data = [
  [{ value: 20 }, { value: 45 }],
  [{ value: 70 }, { value: null }],
]

describe("heatmap", () => {
  it("renders an accessible grid with one cell per matrix entry", () => {
    const { container } = render(<Heatmap data={data} ariaLabel="Temps" />)
    expect(screen.getByRole("img", { name: "Temps" })).toBeInTheDocument()
    expect(container.querySelectorAll(".mdk-heatmap__cell")).toHaveLength(4)
  })

  it("renders values when showValues is on and leaves null cells empty", () => {
    render(<Heatmap data={data} showValues />)
    expect(screen.getByText("20")).toBeInTheDocument()
    expect(screen.getByText("70")).toBeInTheDocument()
    // The null cell renders no value text.
    expect(screen.queryByText("null")).not.toBeInTheDocument()
  })

  it("prefers a cell label over its numeric value", () => {
    render(<Heatmap data={[[{ value: 42, label: "hot" }]]} showValues />)
    expect(screen.getByText("hot")).toBeInTheDocument()
    expect(screen.queryByText("42")).not.toBeInTheDocument()
  })

  it("colours cells from the gradient and null cells with the empty colour", () => {
    const { container } = render(<Heatmap data={data} emptyColor="#111111" />)
    const cells = container.querySelectorAll<HTMLElement>(".mdk-heatmap__cell")
    // Low value → first (cold) stop.
    expect(cells[0]?.style.backgroundColor).toBeTruthy()
    // Null cell → empty colour.
    expect(cells[3]?.style.backgroundColor).toBe("#111111")
  })

  it("uses renderCell to override cell content", () => {
    render(
      <Heatmap
        data={data}
        renderCell={(cell, ctx) => <span data-testid="custom">{`${ctx.row}:${cell.value}`}</span>}
      />,
    )
    expect(screen.getAllByTestId("custom")).toHaveLength(4)
    expect(screen.getByText("0:20")).toBeInTheDocument()
  })

  it("forwards ref to the root element", () => {
    const ref = createRef<HTMLDivElement>()
    render(<Heatmap ref={ref} data={data} />)
    expect(ref.current).toBeInstanceOf(HTMLElement)
    expect(ref.current).toHaveClass("mdk-heatmap")
  })
})
