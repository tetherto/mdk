---
id: reporting
title: Reporting & Financial Export
intent: >
  Build a reporting view that lets the operator pick a date range, see
  historical hashrate / energy consumption, and export the underlying data
  as CSV. The starting point for anything framed as "reporting", "monthly
  numbers", "billing inputs", or "data export".
domain: financial-reporting
kernelCapabilities:
  - hashrate-monitoring
  - energy-consumption
  - incident-alerts
components:
  - StatsExport
  - LineChartCard
  - HistoricalAlerts
  - DateRangePicker
hooks:
  - useFinancialDateRange
  - useEbitda
demoRoute: /reporting
---

## When to use

Pick this blueprint when the user wants historical, range-bounded views of
operational data rather than live state. Typical asks:

- "Generate the monthly hashrate report."
- "I need a CSV export of energy consumption by container."
- "Show me alerts that fired last week."

If the user wants live state, use `mining-operations-dashboard` instead and
add `StatsExport` to its header.

## Page composition

```tsx
import {
  DateRangePicker,
  HistoricalAlerts,
  LineChartCard,
  StatsExport,
} from "@tetherto/mdk-react-devkit";
import {
  useEbitda,
  useFinancialDateRange,
  useHashrateChartData,
  useSiteConsumptionChartData,
} from "@tetherto/mdk-react-adapter";

export default function ReportingPage() {
  const { range, setRange } = useFinancialDateRange();
  const { rows } = useEbitda(range);
  const hashrate = useHashrateChartData({ timeline: "1D", start: range.from, end: range.to });
  const consumption = useSiteConsumptionChartData({ timeline: "1D", start: range.from, end: range.to });

  return (
    <main>
      <header className="reporting__header">
        <DateRangePicker value={range} onChange={setRange} />
        <StatsExport rows={rows} filename={`report-${range.from}-${range.to}.csv`} />
      </header>
      <section className="reporting__charts">
        <LineChartCard title="Hash rate" data={hashrate.data} isLoading={hashrate.isLoading} />
        <LineChartCard title="Power consumption" data={consumption.data} isLoading={consumption.isLoading} />
      </section>
      <section>
        <HistoricalAlerts range={range} />
      </section>
    </main>
  );
}
```

## State / data flow

- `useFinancialDateRange` owns the canonical range used by every component on
  the page; never duplicate range state in children.
- `useEbitda` (or your own aggregator) feeds `StatsExport`; keep aggregation
  in a hook so the CSV and the on-screen chart can never disagree.
- Charts accept the range as a prop; they read from telemetry stores
  internally — no manual fetch wiring required.
- `HistoricalAlerts` is range-bounded; pass the same range object.

## Common variations

- **Per-container breakdown**: render `LineChartCard` once per container
  driven by a per-container consumption hook (extend
  `useSiteConsumptionChartData` with a `tag` filter or add a sibling hook).
- **No export**: drop `StatsExport`; the rest stand alone.
- **Quarter-over-quarter view**: hold two ranges in parent state and render
  two columns of charts.
