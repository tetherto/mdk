import { useState } from 'react'
import type { JSX } from 'react'
import type { DateRange } from '@tetherto/mdk-react-devkit/primitives'
import {
  CURRENCY,
  DataLabel,
  DatePicker,
  DateRangePicker,
  UNITS,
} from '@tetherto/mdk-react-devkit/primitives'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

const DEMO_RANGE_START = new Date(2025, 0, 6)
const DEMO_RANGE_END = new Date(2025, 2, 15)

export const DatePickersPage = (): JSX.Element => {
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedRange, setSelectedRange] = useState<DateRange>()

  const rangeEnd = selectedRange?.to ?? null
  const rangeStart = selectedRange?.from ?? null
  const hasFullRange = Boolean(rangeStart && rangeEnd)

  return (
    <section className="demo-section">
      <DemoPageHeader title="Date Pickers" />
      <div className="demo-section__date-pickers">
        <DemoBlock
          title="DataLabel"
          description="Timezone-aware period readout for reporting toolbars. Pair with DateRangePicker output."
        >
          <div className="demo-section__data-label-stack">
            <div className="demo-section__data-label-panel">
              <DataLabel startDate={DEMO_RANGE_START} endDate={DEMO_RANGE_END} />
            </div>
            <div className="demo-section__data-label-panel">
              <DataLabel startDate={null} endDate={null} />
            </div>
            {hasFullRange ? (
              <div className="demo-section__data-label-panel">
                <DataLabel startDate={rangeStart} endDate={rangeEnd} />
              </div>
            ) : (
              <p>Select a full date range below to preview the live DataLabel.</p>
            )}
          </div>
        </DemoBlock>

        <section>
          <h3>Single Date Picker</h3>
          <div className="demo-section__showcase demo-section__showcase--start">
            <div>
              <p className="demo-section__label">Basic date picker</p>
              <DatePicker
                selected={selectedDate}
                onSelect={setSelectedDate}
                placeholder="Pick a date"
              />
              {selectedDate && (
                <p className="date-pickers-demo__selected">
                  Selected: {selectedDate.toLocaleDateString()}
                </p>
              )}
            </div>

            <div>
              <p className="demo-section__label">Disabled picker</p>
              <DatePicker
                selected={selectedDate}
                onSelect={setSelectedDate}
                placeholder="Disabled"
                disabled
              />
            </div>

            <div>
              <p className="demo-section__label">Custom format (dd MMM yyyy)</p>
              <DatePicker
                selected={selectedDate}
                onSelect={setSelectedDate}
                placeholder="Pick a date"
                dateFormat="dd MMM yyyy"
              />
            </div>
          </div>
        </section>

        <section className="demo-section__mt-2xl">
          <h3>Date Range Picker</h3>
          <div className="demo-section__showcase demo-section__showcase--start">
            <div>
              <p className="demo-section__label">With presets (Last 7/14/30/90 days)</p>
              <DateRangePicker
                selected={selectedRange}
                onSelect={setSelectedRange}
                placeholder="Select date range"
                showPresets
              />
              {hasFullRange ? (
                <div className="demo-section__data-label-panel demo-section__data-label-panel--spaced">
                  <DataLabel startDate={rangeStart} endDate={rangeEnd} />
                </div>
              ) : null}
            </div>

            <div>
              <p className="demo-section__label">Without presets</p>
              <DateRangePicker
                selected={selectedRange}
                onSelect={setSelectedRange}
                placeholder="Select date range"
                showPresets={false}
              />
            </div>

            <div>
              <p className="demo-section__label">Allow future dates</p>
              <DateRangePicker
                selected={selectedRange}
                onSelect={setSelectedRange}
                placeholder="Select date range"
                allowFutureDates
              />
            </div>
          </div>
        </section>

        <section className="demo-section__mt-2xl">
          <h3>Mining Operations Example</h3>
          <div className="date-pickers-demo__report">
            <h4 className="date-pickers-demo__report-title">Revenue Report</h4>
            <div className="date-pickers-demo__toolbar">
              <div className="date-pickers-demo__field">
                <label className="date-pickers-demo__field-label">Select Report Period</label>
                <DateRangePicker
                  selected={selectedRange}
                  onSelect={setSelectedRange}
                  placeholder="Choose date range"
                />
              </div>
              {hasFullRange ? (
                <div className="demo-section__data-label-panel">
                  <DataLabel startDate={rangeStart} endDate={rangeEnd} />
                </div>
              ) : null}
            </div>
            {hasFullRange && rangeStart && rangeEnd ? (
              <div className="date-pickers-demo__summary">
                <div className="date-pickers-demo__summary-body">
                  <div className="date-pickers-demo__summary-row">
                    <span>Duration:</span>
                    <span className="demo-section__text-success">
                      {Math.floor(
                        (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24),
                      )}{' '}
                      days
                    </span>
                  </div>
                  <div className="date-pickers-demo__summary-row">
                    <span>Est. Hashrate:</span>
                    <span className="demo-section__text-primary">1.2 {UNITS.HASHRATE_PH_S}</span>
                  </div>
                  <div className="date-pickers-demo__summary-row">
                    <span>Est. Revenue:</span>
                    <span className="demo-section__text-primary">0.45 {CURRENCY.BTC_LABEL}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  )
}
