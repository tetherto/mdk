import { useState } from 'react'
import type { DateRange } from '@tetherto/mdk-core-ui'
import { DatePicker, DateRangePicker } from '@tetherto/mdk-core-ui'

export const DatePickersPage = (): JSX.Element => {
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedRange, setSelectedRange] = useState<DateRange>()

  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Date Pickers</h2>
      <div className="demo-section__date-pickers">
        <section>
          <h3>Single Date Picker</h3>
          <div
            style={{
              display: 'flex',
              gap: '2rem',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p style={{ marginBottom: '12px', fontSize: '13px', opacity: 0.8 }}>
                Basic date picker
              </p>
              <DatePicker
                selected={selectedDate}
                onSelect={setSelectedDate}
                placeholder="Pick a date"
              />
              {selectedDate && (
                <p style={{ marginTop: '8px', fontSize: '12px' }}>
                  Selected: {selectedDate.toLocaleDateString()}
                </p>
              )}
            </div>

            <div>
              <p style={{ marginBottom: '12px', fontSize: '13px', opacity: 0.8 }}>
                Disabled picker
              </p>
              <DatePicker
                selected={selectedDate}
                onSelect={setSelectedDate}
                placeholder="Disabled"
                disabled
              />
            </div>

            <div>
              <p style={{ marginBottom: '12px', fontSize: '13px', opacity: 0.8 }}>
                Custom format (dd MMM yyyy)
              </p>
              <DatePicker
                selected={selectedDate}
                onSelect={setSelectedDate}
                placeholder="Pick a date"
                dateFormat="dd MMM yyyy"
              />
            </div>
          </div>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h3>Date Range Picker</h3>
          <div
            style={{
              display: 'flex',
              gap: '2rem',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p style={{ marginBottom: '12px', fontSize: '13px', opacity: 0.8 }}>
                With presets (Last 7/14/30/90 days)
              </p>
              <DateRangePicker
                selected={selectedRange}
                onSelect={setSelectedRange}
                placeholder="Select date range"
                showPresets
              />
              {selectedRange?.from && selectedRange?.to && (
                <p style={{ marginTop: '8px', fontSize: '12px' }}>
                  Selected: {selectedRange.from.toLocaleDateString()} -{' '}
                  {selectedRange.to.toLocaleDateString()}
                </p>
              )}
            </div>

            <div>
              <p style={{ marginBottom: '12px', fontSize: '13px', opacity: 0.8 }}>
                Without presets
              </p>
              <DateRangePicker
                selected={selectedRange}
                onSelect={setSelectedRange}
                placeholder="Select date range"
                showPresets={false}
              />
            </div>

            <div>
              <p style={{ marginBottom: '12px', fontSize: '13px', opacity: 0.8 }}>
                Allow future dates
              </p>
              <DateRangePicker
                selected={selectedRange}
                onSelect={setSelectedRange}
                placeholder="Select date range"
                allowFutureDates
              />
            </div>
          </div>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h3>Mining Operations Example</h3>
          <div
            style={{
              padding: '20px',
              background: '#0f0f0f',
              border: '1px solid #ffffff1a',
              borderRadius: '4px',
            }}
          >
            <h4 style={{ margin: '0 0 16px 0', color: '#f7931a' }}>Revenue Report</h4>
            <div
              style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '16px',
              }}
            >
              <div style={{ flex: '1', minWidth: '200px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    marginBottom: '8px',
                    opacity: 0.7,
                  }}
                >
                  Select Report Period
                </label>
                <DateRangePicker
                  selected={selectedRange}
                  onSelect={setSelectedRange}
                  placeholder="Choose date range"
                />
              </div>
            </div>
            {selectedRange?.from && selectedRange?.to && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#161514',
                  border: '1px solid #ffffff1a',
                }}
              >
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <span>Period:</span>
                    <span style={{ color: '#72f59e' }}>
                      {Math.floor(
                        (selectedRange.to.getTime() - selectedRange.from.getTime()) /
                          (1000 * 60 * 60 * 24),
                      )}{' '}
                      days
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <span>Est. Hashrate:</span>
                    <span style={{ color: '#f7931a' }}>1.2 PH/s</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Est. Revenue:</span>
                    <span style={{ color: '#f7931a' }}>0.45 BTC</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
