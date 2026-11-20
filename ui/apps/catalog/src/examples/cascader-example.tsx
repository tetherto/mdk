import type { CascaderOption, CascaderValue } from '@tetherto/mdk-react-devkit/primitives'
import { Card, Cascader } from '@tetherto/mdk-react-devkit/primitives'
import { DemoPageHeader } from '../components/demo-page-header'

import { useState } from 'react'
import type { JSX } from 'react'

export const CascaderExample = (): JSX.Element => {
  const [singleValue, setSingleValue] = useState<CascaderValue>(['site-a', 'container-a1'])

  const locationOptions: CascaderOption[] = [
    {
      value: 'site-a',
      label: 'Site A',
      children: [
        { value: 'container-a1', label: 'Container A1' },
        { value: 'container-a2', label: 'Container A2' },
        { value: 'container-a3', label: 'Container A3' },
        { value: 'container-a4', label: 'Container A4' },
      ],
    },
    {
      value: 'site-b',
      label: 'Site B',
      children: [
        { value: 'container-b1', label: 'Container B1' },
        { value: 'container-b2', label: 'Container B2' },
        { value: 'container-b3', label: 'Container B3' },
        { value: 'container-b4', label: 'Container B4' },
      ],
    },
    {
      value: 'site-c',
      label: 'Site C',
      children: [
        { value: 'container-c1', label: 'Container C1' },
        { value: 'container-c2', label: 'Container C2' },
        { value: 'container-c3', label: 'Container C3' },
        { value: 'container-c4', label: 'Container C4' },
      ],
    },
    {
      value: 'site-d',
      label: 'Site D',
      children: [
        { value: 'container-d1', label: 'Container D1' },
        { value: 'container-d2', label: 'Container D2' },
        { value: 'container-d3', label: 'Container D3' },
        { value: 'container-d4', label: 'Container D4' },
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

  const [filterValue, setFilterValue] = useState<CascaderValue[]>([
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

  const [statusValue, setStatusValue] = useState<CascaderValue[]>([])

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

  const [emptyValue, setEmptyValue] = useState<CascaderValue[]>([])
  const [disabledValue] = useState<CascaderValue>(['site-a', 'container-a1'])

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
            Basic single selection with radio buttons. Select a site from the left panel, then
            choose a container from the right panel. The selected value is stored as a path array.
          </p>

          <div className="cascader-section__field">
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

          <div className="cascader-section__field">
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

          <div className="cascader-section__field">
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

          <div className="cascader-section__field">
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
