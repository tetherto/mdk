# SiteReports

Site reports index with a weekly / monthly / yearly duration toggle and a sortable table of published report windows. Wire `onViewReport` to navigate to your report viewer (for example `MiningReport` or `MiningReportCover`).

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `className` | `string` | no | — | Root wrapper class. |
| `pageTitle` | `string` | no | `'Reports'` | Heading above the table. |
| `siteName` | `string` | no | — | Optional site label under the title. |
| `duration` | `ReportDuration` | no | — | Controlled duration tab value. |
| `defaultDuration` | `ReportDuration` | no | `weekly` | Initial duration when uncontrolled. |
| `onDurationChange` | `(duration: ReportDuration) => void` | no | — | Fired when the user changes duration. |
| `reports` | `SiteReportRecord[]` | no | generated | Override demo/API rows; otherwise built from `referenceDate`. |
| `referenceDate` | `Date` | no | today | Anchor date for generated windows. |
| `onViewReport` | `(record, context) => void` | no | — | View Report action; disables the button when omitted. |

## Minimal example

```tsx
import { SiteReports } from "@tetherto/mdk-react-devkit";

<SiteReports
  siteName="Uruguay"
  onViewReport={(record, { duration }) => {
    console.log(duration, record.from, record.to);
  }}
/>
```

## Notes

- Export helpers: `buildSiteReportRecords`, `formatSiteReportPeriod`, `formatSiteReportPublishedAt`.
- Pair with `MiningReport` for the full PDF-style report body after the user picks a row.
