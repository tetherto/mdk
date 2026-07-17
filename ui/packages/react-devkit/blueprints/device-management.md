---
id: device-management
title: Device Management
intent: >
  Browse, filter, and inspect individual miners / containers across a site
  or fleet, with per-device telemetry, power-mode timelines, and quick
  actions. The starting point for "I want to manage my miners" or
  "show me what each device is doing".
domain: device-management
kernelCapabilities:
  - device-management
  - device-telemetry
components:
  - DeviceExplorer
  - PowerModeTimelineChart
  - TimelineChart
  - WidgetTopRow
hooks:
  - useContainerThresholds
demoRoute: /device-explorer
---

## When to use

Pick this blueprint when the focus is the device list itself: filtering by
state, drilling into a single miner, or seeing how device power mode evolved
over time. If the user wants a high-level operator dashboard, prefer
`mining-operations-dashboard` and embed `DeviceExplorer` as one section of it.

## Page composition

```tsx
import {
  DeviceExplorer,
  PowerModeTimelineChart,
  TimelineChart,
  WidgetTopRow,
} from "@tetherto/mdk-react-devkit";
import { useContainerThresholds } from "@tetherto/mdk-react-devkit";
import { useGetAvailableDevices } from "@tetherto/mdk-react-adapter";
import { useState } from "react";

export default function DeviceManagementPage() {
  const { devices } = useGetAvailableDevices();
  const { thresholds } = useContainerThresholds();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = devices.find((d) => d.id === selectedId);

  return (
    <main>
      <WidgetTopRow title="Devices" total={devices.length} />
      <DeviceExplorer
        devices={devices}
        onRowClick={(d) => setSelectedId(d.id)}
      />
      {selected && (
        <aside className="device-detail">
          <PowerModeTimelineChart deviceId={selected.id} thresholds={thresholds} />
          <TimelineChart deviceId={selected.id} />
        </aside>
      )}
    </main>
  );
}
```

## State / data flow

- `useGetAvailableDevices` (from `@tetherto/mdk-react-adapter`) is the only
  place that should derive the device list; everything downstream is
  prop-driven.
- Selection state is local to the page — keep it in `useState` unless the
  detail view needs to deep-link.
- `useContainerThresholds` provides the bands rendered by
  `PowerModeTimelineChart`; never inline thresholds.

## Common variations

- **Inline detail**: render the detail panel below the table instead of in
  an aside.
- **Bulk actions**: wrap the explorer's selection in a custom toolbar; the
  table already supports multi-select.
- **Search**: pass a filtered `devices` array; `DeviceExplorer` itself is
  presentational.
