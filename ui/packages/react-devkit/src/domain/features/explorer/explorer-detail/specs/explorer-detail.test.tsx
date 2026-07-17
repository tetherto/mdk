// @vitest-environment jsdom
import { devicesStore } from "@tetherto/mdk-ui-foundation"
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Device } from "@domain/types"
import { DEVICE_EXPLORER_DEVICE_TYPE } from "@domain/components/device-explorer/types"
import { ExplorerDetail } from "../explorer-detail"

vi.mock("@domain/components/explorer/details-view", () => ({
  BatchContainerControlsCard: vi.fn(({ isBatch }) => (
    <div data-testid="batch-card" data-is-batch={String(isBatch)} />
  )),
  ContainerControlsCard: vi.fn(() => <div data-testid="container-controls-card" />),
  StatsGroupCard: vi.fn(() => <div data-testid="stats-group-card" />),
  MinerControlsCard: vi.fn(() => <div data-testid="miner-controls-card" />),
  MinerInfoCard: vi.fn(() => <div data-testid="miner-info-card" />),
  MinerChipsCard: vi.fn(() => <div data-testid="miner-chips-card" />),
  CabinetDetailCard: vi.fn(({ title }) => <div data-testid="cabinet-detail-card" data-title={title} />),
}))

vi.mock("../../../../components/alarm/alarm-contents/alarm-contents", () => ({
  AlarmContents: vi.fn(() => <div data-testid="alarm-contents" />),
}))

vi.mock("../../../../components/container/content-box/content-box", () => ({
  ContentBox: vi.fn(({ title, children }) => (
    <div data-testid="content-box" data-title={title}>
      {children}
    </div>
  )),
}))

vi.mock("../../use-device-alarms", () => ({
  useDeviceAlarms: vi.fn(() => ({ alarmsDataItems: [], alarmsCount: 0 })),
}))

const useMinerDetailMock = vi.fn(() => ({
  miners: [] as Device[],
  headMiner: undefined as Device | undefined,
  infoItems: [],
  chipsData: undefined,
}))

vi.mock("../../use-miner-detail", () => ({
  useMinerDetail: () => useMinerDetailMock(),
}))

const useCabinetDetailMock = vi.fn(() => ({
  hasSelection: false,
  title: "",
  powerMeters: [],
  tempSensors: [],
  alarmsDataItems: [],
  isLoading: false,
}))

vi.mock("../../use-cabinet-detail", () => ({
  useCabinetDetail: () => useCabinetDetailMock(),
}))

const makeContainer = (overrides: Partial<Device> = {}): Device =>
  ({
    id: "container-1",
    type: "container-bd-d40-m56",
    info: { container: "bitdeer-1a" },
    ...overrides,
  }) as Device

const makeMiner = (overrides: Partial<Device> = {}): Device =>
  ({
    id: "miner-1",
    type: "miner-bd",
    info: { container: "bitdeer-1a" },
    ...overrides,
  }) as Device

const seedContainers = (containers: Device[]) => {
  devicesStore.getState().setResetSelections()
  containers.forEach((device) => devicesStore.getState().selectContainer(device as never))
}

describe("ExplorerDetail", () => {
  beforeEach(() => {
    devicesStore.getState().setResetSelections()
    useMinerDetailMock.mockReturnValue({
      miners: [],
      headMiner: undefined,
      infoItems: [],
      chipsData: undefined,
    })
    useCabinetDetailMock.mockReturnValue({
      hasSelection: false,
      title: "",
      powerMeters: [],
      tempSensors: [],
      alarmsDataItems: [],
      isLoading: false,
    })
  })
  afterEach(() => devicesStore.getState().setResetSelections())

  it("renders nothing for the cabinet tab when no cabinet is selected", () => {
    const { container } = render(<ExplorerDetail deviceType={DEVICE_EXPLORER_DEVICE_TYPE.CABINET} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders the cabinet detail card when a cabinet is selected", () => {
    useCabinetDetailMock.mockReturnValue({
      hasSelection: true,
      title: "LV Cabinet 1",
      powerMeters: [],
      tempSensors: [],
      alarmsDataItems: [],
      isLoading: false,
    })
    render(<ExplorerDetail deviceType={DEVICE_EXPLORER_DEVICE_TYPE.CABINET} />)
    expect(screen.getByTestId("cabinet-detail-card")).toHaveAttribute("data-title", "LV Cabinet 1")
  })

  it("renders the batch controls + container controls for the container tab", () => {
    seedContainers([makeContainer()])
    render(<ExplorerDetail deviceType={DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER} />)
    expect(screen.getByTestId("batch-card")).toBeInTheDocument()
    expect(screen.getByTestId("container-controls-card")).toBeInTheDocument()
  })

  it("flags batch mode only when more than one container is selected", () => {
    seedContainers([makeContainer({ id: "c1" }), makeContainer({ id: "c2" })])
    render(<ExplorerDetail deviceType={DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER} />)
    expect(screen.getByTestId("batch-card")).toHaveAttribute("data-is-batch", "true")
  })

  it("is not batch for a single container", () => {
    seedContainers([makeContainer()])
    render(<ExplorerDetail deviceType={DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER} />)
    expect(screen.getByTestId("batch-card")).toHaveAttribute("data-is-batch", "false")
  })

  it("shows the stats card only when the selection has connected miners", () => {
    seedContainers([makeContainer()])
    devicesStore.getState().setSelectedSockets({
      "bitdeer-1a": {
        sockets: [
          {
            containerId: "container-1",
            minerId: "miner-1",
            pduIndex: 0,
            socketIndex: 0,
            miner: { id: "miner-1" },
          },
        ],
      },
    })
    render(<ExplorerDetail deviceType={DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER} />)
    expect(screen.getByTestId("stats-group-card")).toBeInTheDocument()
  })

  it("hides the stats card when no sockets are selected", () => {
    seedContainers([makeContainer()])
    render(<ExplorerDetail deviceType={DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER} />)
    expect(screen.queryByTestId("stats-group-card")).not.toBeInTheDocument()
  })

  it("renders nothing for the miner tab when no miner is selected", () => {
    const { container } = render(<ExplorerDetail deviceType={DEVICE_EXPLORER_DEVICE_TYPE.MINER} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders the miner controls, stats, and alarms box for a selected miner", () => {
    useMinerDetailMock.mockReturnValue({
      miners: [makeMiner()],
      headMiner: makeMiner(),
      infoItems: [{ title: "Code", value: "abc" }],
      chipsData: undefined,
    })
    render(<ExplorerDetail deviceType={DEVICE_EXPLORER_DEVICE_TYPE.MINER} />)
    expect(screen.getByTestId("miner-controls-card")).toBeInTheDocument()
    expect(screen.getByTestId("stats-group-card")).toBeInTheDocument()
    expect(screen.getByTestId("miner-info-card")).toBeInTheDocument()
    expect(screen.getByTestId("content-box")).toHaveAttribute("data-title", "Active Alarms")
    expect(screen.getByTestId("alarm-contents")).toBeInTheDocument()
  })

  it("renders the chips card only when the head miner has chip stats", () => {
    useMinerDetailMock.mockReturnValue({
      miners: [makeMiner()],
      headMiner: makeMiner(),
      infoItems: [],
      chipsData: { frequency_mhz: { chips: [] } } as never,
    })
    render(<ExplorerDetail deviceType={DEVICE_EXPLORER_DEVICE_TYPE.MINER} />)
    expect(screen.getByTestId("miner-chips-card")).toBeInTheDocument()
  })

  it("hides the info and chips cards in a multi-miner (batch) selection", () => {
    useMinerDetailMock.mockReturnValue({
      miners: [makeMiner({ id: "m1" }), makeMiner({ id: "m2" })],
      headMiner: makeMiner({ id: "m1" }),
      infoItems: [{ title: "Code", value: "abc" }],
      chipsData: { frequency_mhz: { chips: [] } } as never,
    })
    render(<ExplorerDetail deviceType={DEVICE_EXPLORER_DEVICE_TYPE.MINER} />)
    expect(screen.getByTestId("miner-controls-card")).toBeInTheDocument()
    expect(screen.queryByTestId("miner-info-card")).not.toBeInTheDocument()
    expect(screen.queryByTestId("miner-chips-card")).not.toBeInTheDocument()
  })
})
