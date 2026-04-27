import type { CascaderOption, CascaderValue } from '@mdk/core'
import { Card, Cascader } from '@mdk/core'
import * as React from 'react'
import { DemoPageHeader } from '../components/demo-page-header'

export const CascaderExample = (): JSX.Element => {
  const [singleValue, setSingleValue] = React.useState<CascaderValue>(['china', 'beijing'])

  const locationOptions: CascaderOption[] = [
    {
      value: 'china',
      label: 'China',
      children: [
        { value: 'beijing', label: 'Beijing' },
        { value: 'shanghai', label: 'Shanghai' },
        { value: 'guangzhou', label: 'Guangzhou' },
        { value: 'shenzhen', label: 'Shenzhen' },
      ],
    },
    {
      value: 'usa',
      label: 'United States',
      children: [
        { value: 'newyork', label: 'New York' },
        { value: 'california', label: 'California' },
        { value: 'texas', label: 'Texas' },
        { value: 'florida', label: 'Florida' },
      ],
    },
    {
      value: 'uk',
      label: 'United Kingdom',
      children: [
        { value: 'london', label: 'London' },
        { value: 'manchester', label: 'Manchester' },
        { value: 'birmingham', label: 'Birmingham' },
        { value: 'liverpool', label: 'Liverpool' },
      ],
    },
    {
      value: 'germany',
      label: 'Germany',
      children: [
        { value: 'berlin', label: 'Berlin' },
        { value: 'munich', label: 'Munich' },
        { value: 'hamburg', label: 'Hamburg' },
        { value: 'frankfurt', label: 'Frankfurt' },
      ],
    },
  ]

  const categoryOptions: CascaderOption[] = [
    {
      value: 'electronics',
      label: 'Electronics',
      children: [
        { value: 'phones', label: 'Smartphones' },
        { value: 'laptops', label: 'Laptops' },
        { value: 'tablets', label: 'Tablets' },
        { value: 'accessories', label: 'Accessories' },
        { value: 'cameras', label: 'Cameras' },
      ],
    },
    {
      value: 'home',
      label: 'Home & Garden',
      children: [
        { value: 'furniture', label: 'Furniture' },
        { value: 'decor', label: 'Home Decor' },
        { value: 'kitchen', label: 'Kitchen' },
        { value: 'bedding', label: 'Bedding' },
      ],
    },
    {
      value: 'sports',
      label: 'Sports & Outdoors',
      children: [
        { value: 'fitness', label: 'Fitness Equipment' },
        { value: 'outdoor', label: 'Outdoor Gear' },
        { value: 'bikes', label: 'Bicycles' },
        { value: 'camping', label: 'Camping' },
      ],
    },
  ]

  const [filterValue, setFilterValue] = React.useState<CascaderValue[]>([
    ['severity', 'critical'],
    ['status', 'active'],
  ])

  const filterOptions: CascaderOption[] = [
    {
      value: 'severity',
      label: 'Severity Level',
      children: [
        { value: 'critical', label: 'Critical' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
        { value: 'info', label: 'Info' },
      ],
    },
    {
      value: 'status',
      label: 'Status',
      children: [
        { value: 'active', label: 'Active' },
        { value: 'pending', label: 'Pending' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'closed', label: 'Closed' },
        { value: 'archived', label: 'Archived' },
      ],
    },
    {
      value: 'priority',
      label: 'Priority',
      children: [
        { value: 'urgent', label: 'Urgent' },
        { value: 'high', label: 'High' },
        { value: 'normal', label: 'Normal' },
        { value: 'low', label: 'Low' },
      ],
    },
    {
      value: 'type',
      label: 'Alert Type',
      children: [
        { value: 'security', label: 'Security' },
        { value: 'performance', label: 'Performance' },
        { value: 'system', label: 'System' },
        { value: 'application', label: 'Application' },
      ],
    },
  ]

  const [statusValue, setStatusValue] = React.useState<CascaderValue[]>([])

  const statusOptions: CascaderOption[] = [
    {
      value: 'active',
      label: 'Active Status',
      children: [
        { value: 'online', label: 'Online' },
        { value: 'busy', label: 'Busy' },
        { value: 'away', label: 'Away' },
      ],
    },
    {
      value: 'inactive',
      label: 'Inactive Status',
      children: [
        { value: 'offline', label: 'Offline' },
        { value: 'maintenance', label: 'Maintenance (Coming Soon)', disabled: true },
        { value: 'suspended', label: 'Suspended (Unavailable)', disabled: true },
      ],
    },
  ]

  const [emptyValue, setEmptyValue] = React.useState<CascaderValue[]>([])
  const [disabledValue] = React.useState<CascaderValue>(['china', 'beijing'])

  return (
    <section className="demo-section">
      <DemoPageHeader title="Cascader" />
      <div className="examples-container">
        {/* ============================================================ */}
        {/* Example 1: Single Select */}
        {/* ============================================================ */}
        <Card className="cascader-section">
          <div>
            <h2>1. Single Select - Location Picker</h2>
            <span>Single</span>
          </div>
          <p>
            Basic single selection with radio buttons. Select a country from the left panel, then
            choose a city from the right panel. The selected value is stored as a path array.
          </p>

          <div style={{ width: '30%' }}>
            <Cascader
              options={locationOptions}
              value={singleValue}
              onChange={(val) => setSingleValue(val as CascaderValue)}
              placeholder="Select location..."
            />

            <div>
              <strong>Selected Value:</strong>
              <pre>{JSON.stringify(singleValue, null, 2)}</pre>
              <div className="example-output-explanation">
                Path: {singleValue[0]} → {singleValue[1]}
              </div>
            </div>
          </div>
        </Card>

        {/* ============================================================ */}
        {/* Example 2: Alert Filters */}
        {/* ============================================================ */}
        <Card className="cascader-section">
          <div>
            <h2>2. Alert Filters (Real-world Use Case)</h2>
            <span className="example-badge example-badge--featured">Featured</span>
          </div>
          <p>
            Production-ready filtering system for alerts and notifications. Filter by severity,
            status, priority, and type. Perfect for dashboards and monitoring systems.
          </p>

          <div style={{ width: '30%' }}>
            <Cascader
              options={filterOptions}
              value={filterValue}
              onChange={(val) => setFilterValue(val as CascaderValue[])}
              multiple
              placeholder="Filter alerts..."
            />

            <div>
              <strong>Active Filters ({filterValue.length}):</strong>
              <div className="filter-summary">
                {filterValue.map((item, idx) => {
                  const category = filterOptions.find((f) => f.value === item[0])
                  const option = category?.children?.find((o) => o.value === item[1])
                  return (
                    <div key={idx} className="filter-chip">
                      <span className="filter-chip-category">{category?.label}:</span>
                      <span className="filter-chip-value">{option?.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* ============================================================ */}
        {/* Example 3: Disabled Options */}
        {/* ============================================================ */}
        <Card className="cascader-section">
          <div>
            <h2>3. With Disabled Options</h2>
            <span>Features</span>
          </div>
          <p>
            Some options can be disabled to prevent selection. Useful for showing unavailable or
            coming soon features.
          </p>

          <div style={{ width: '30%' }}>
            <Cascader
              options={statusOptions}
              value={statusValue}
              onChange={(val) => setStatusValue(val as CascaderValue[])}
              multiple
              placeholder="Select status..."
            />
          </div>
        </Card>

        {/* ============================================================ */}
        {/* Example 4: Empty State */}
        {/* ============================================================ */}
        <Card className="cascader-section">
          <div>
            <h2>4. Empty State & Search</h2>
            <span>UX</span>
          </div>
          <p>
            Start with no selections and use search to filter. Shows "No results found" when search
            doesn't match any options.
          </p>

          <div style={{ width: '30%' }}>
            <Cascader
              options={categoryOptions}
              value={emptyValue}
              onChange={(val) => setEmptyValue(val as CascaderValue[])}
              multiple
              placeholder="Try searching for 'laptop' or 'furniture'..."
            />
          </div>
        </Card>

        {/* ============================================================ */}
        {/* Example 5: Disabled State */}
        {/* ============================================================ */}
        <Card className="cascader-section">
          <div>
            <h2>5. Disabled Cascader</h2>
            <span>State</span>
          </div>
          <p>
            The entire cascader can be disabled, preventing any interaction while showing the
            current selection.
          </p>

          <div>
            <Cascader
              options={locationOptions}
              value={disabledValue}
              onChange={() => {}}
              disabled
              placeholder="This is disabled..."
            />

            <div>
              <strong>Status:</strong> Disabled - No interaction possible
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
