/**
 * Runnable example for the ContainerWidgets feature.
 */
import { ContainerWidgets } from "@tetherto/mdk-react-devkit"
import type { ContainerWidgetItem } from "@tetherto/mdk-react-devkit"

const containers: ContainerWidgetItem[] = [
  {
    id: "container-a",
    title: "Container A",
    power: 412_000,
    powerUnit: "kW",
    summary: [
      { label: "Hash Rate", value: "1.24 PH/s" },
      { label: "Max Temp", value: "72 °C" },
      { label: "Avg Temp", value: "65 °C" },
    ],
    activity: { total: 210, online: 200, offline: 10 },
  },
  {
    id: "container-b",
    title: "Container B",
    isOffline: true,
    summary: [],
  },
]

export const ContainerWidgetsExample = () => (
  <ContainerWidgets containers={containers} />
)
