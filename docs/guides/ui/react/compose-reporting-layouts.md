---
title: Compose reporting layouts
description: Compose the timeframe week selector from the shared building blocks the reporting surfaces use.
docs@tether_slug: guides/ui/react/compose-reporting-layouts
---

## Overview

This page shows how to build a week selector from the timeframe building blocks in `@tetherto/mdk-react-devkit/domain`.

> [!IMPORTANT]
> The devkit ships no prebuilt reporting composites (`Cost`, `Ebitda`, `EnergyBalance`, `HashBalance`, `Hashrate`,
> `EnergyReport`, `OperationalDashboard`, `SubsidyFee`). What it ships for reporting is the shared timeframe building blocks
> on this page, plus `TimeframeControls`, `ReportTimeFrameSelector` and the `useFinancialDateRange` hook.

The building blocks take plain props (a week list, or a timezone plus year and month) and do no fetching, so you wire your
own data layer (RTK Query, TanStack, fixtures) around them.

## Shared building blocks

These power the week selector inside [`TimeframeControls`][timeframe-controls], shared across the financial reporting
surfaces.

| Component | Description |
| --- | --- |
| [`TimeframeWeekFlatContent`][flat] | Flat week list for the week selector |
| [`TimeframeWeekTreeContent`][tree] | Year-month-week tree for the week selector |

### `TimeframeWeekFlatContent`

Flat list of selectable week items for the `TimeframeControls` week selector.

```tsx
import { TimeframeWeekFlatContent } from '@tetherto/mdk-react-devkit/domain'
```

Takes `visibleWeeks`, the week list `weeksOfMonth(year, month, timezone)` returns. `month` is 0-based (0 is January).

### `TimeframeWeekTreeContent`

Hierarchical year to month to week tree for the `TimeframeControls` week selector.

```tsx
import { TimeframeWeekTreeContent } from '@tetherto/mdk-react-devkit/domain'
```

Takes `timezone`, `selectedYear` and `selectedMonth` (0-based), and builds the weeks itself. It lists the last three years,
with the selected year and month expanded.

## Compose a week selector

Both building blocks render `SelectItem` options, so they go inside the devkit's `Select` > `SelectContent`, as they do in
[`TimeframeControls`][timeframe-controls]. With the flat list, the selected value is the week's start time in milliseconds,
as a string:

```tsx
import { useState } from 'react'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@tetherto/mdk-react-devkit/primitives'
import { TimeframeWeekFlatContent, weeksOfMonth } from '@tetherto/mdk-react-devkit/domain'

type WeekPickerProps = { year: number; month: number; timezone: string }

export const WeekPicker = ({ year, month, timezone }: WeekPickerProps) => {
  const [weekStart, setWeekStart] = useState<string>()

  return (
    <Select value={weekStart} onValueChange={setWeekStart}>
      <SelectTrigger aria-label="Week">
        <SelectValue placeholder="Week" />
      </SelectTrigger>
      <SelectContent>
        <TimeframeWeekFlatContent visibleWeeks={weeksOfMonth(year, month, timezone)} />
      </SelectContent>
    </Select>
  )
}
```

For the tree, swap the content. Its option values are `year|month|start` tokens; decode one with `parseWeekTreeToken`, also
exported from `/domain`, which returns `{ year, month, startTs }`:

```tsx
<SelectContent>
  <TimeframeWeekTreeContent timezone={timezone} selectedYear={year} selectedMonth={month} />
</SelectContent>
```

## Next steps

- [Filter components][timeframe-controls]: the full `TimeframeControls` picker and every week-content prop

[timeframe-controls]: ../../../../ui/packages/react-devkit/src/domain/components/timeframe/timeframe-controls/USAGE.md
<!-- docs@tether.io: timeframe-controls → reference/ui/components/filters#timeframecontrols -->

[flat]: #timeframeweekflatcontent
[tree]: #timeframeweektreecontent
