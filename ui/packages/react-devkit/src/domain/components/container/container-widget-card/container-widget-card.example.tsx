/**
 * Runnable example for ContainerWidgetCard.
 */
import { ContainerWidgetCard } from "@tetherto/mdk-react-devkit"

export const ContainerWidgetCardExample = () => (
  <div className="mdk-example-row">
    <ContainerWidgetCard
      title="Container A"
      power={412_000}
      powerUnit="kW"
      summary={[
        { label: "Hash Rate", value: "1.24 PH/s" },
        { label: "Max Temp", value: "72 °C" },
        { label: "Avg Temp", value: "65 °C" },
        { label: "Efficiency", value: "32.5 W/TH/s" },
      ]}
      activity={{ total: 210, online: 200, offline: 8, faulted: 2 }}
    />

    <ContainerWidgetCard title="Container B" isOffline summary={[]} />

    <ContainerWidgetCard
      title="Container C"
      errorMessage="Worker unreachable"
      summary={[]}
    />
  </div>
)
