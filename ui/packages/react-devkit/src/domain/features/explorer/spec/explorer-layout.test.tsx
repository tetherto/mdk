import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ExplorerLayout } from "../explorer-layout"

describe("explorerLayout", () => {
  it("renders the title and the list content", () => {
    render(<ExplorerLayout title="Explorer" list={<div>my-list</div>} />)
    expect(screen.getByText("Explorer")).toBeInTheDocument()
    expect(screen.getByText("my-list")).toBeInTheDocument()
  })

  it("hides the detail column when nothing is selected", () => {
    render(
      <ExplorerLayout list={<div>list</div>} detail={<div>my-detail</div>} hasSelection={false} />,
    )
    expect(screen.queryByText("my-detail")).not.toBeInTheDocument()
  })

  it("shows the detail column when a row is selected", () => {
    const { container } = render(
      <ExplorerLayout list={<div>list</div>} detail={<div>my-detail</div>} hasSelection />,
    )
    expect(screen.getByText("my-detail")).toBeInTheDocument()
    expect(container.querySelector(".mdk-explorer-layout__row--split")).toBeInTheDocument()
  })

  it("renders header actions when provided", () => {
    render(
      <ExplorerLayout
        list={<div>list</div>}
        headerActions={<button type="button">Export</button>}
      />,
    )
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument()
  })
})
