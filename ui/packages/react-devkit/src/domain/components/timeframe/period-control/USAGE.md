# PeriodControl

Reporting-period control: a rolling preset (last 24 hours to year to date) or a custom day range, the buckets the page aggregates into, and Reset. It renders the state `usePeriod` (`@tetherto/mdk-react-adapter`) keeps in the URL, so a report can be linked to and survives a reload.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `state` | Required | `PeriodState` | - | The period to show and change, from `usePeriod` |
| `timezone` | Required | `string` | - | The site's timezone, in which custom ranges are whole days |
| `className` | Optional | `string` | - | Additional class for the root element |
| `showGranularity` | Optional | `boolean` | `true` | Show the bucket toggle. Hide it on a page that shows one figure per period |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { usePeriod } from "@tetherto/mdk-react-adapter";
import { PeriodControl } from "@tetherto/mdk-react-devkit";
import { useSearchParams } from "react-router";

const period = usePeriod(useSearchParams(), timezone, { preset: "30d" });

<PeriodControl state={period} timezone={timezone} />
```

Ask the backend for `period.query` (`{ start, end, granularity }`), and put it in the query key so a change refetches.

## Notes

- Custom ranges are whole days in `timezone`, the site's, not the browser's
- A bucket that does not fit the range (hourly over a year, monthly over a day) is disabled, with a tooltip saying why, and `period.query.granularity` falls back to one that fits
- The date range picker offers the last 7, 14, 30 and 90 days, as whole days in `timezone` ending today. Applying one
  the Period select also has (7, 30, 90) sets that rolling preset, so both controls agree. Last 14 days sets a custom
  range.
- A rolling preset counted in days (7, 30, 90 days, 12 months) shows in the picker as that many whole days ending
  today, so "Last 7 days" reads as 7 days selected
- Hide the bucket toggle with `showGranularity={false}` on a page that shows one figure per period
- Reset is disabled while the URL holds no period
