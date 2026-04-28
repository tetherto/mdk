import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tetherto/mdk-core-ui'

const OPTIONS = [
  { value: 'option-1', label: 'Option 1' },
  { value: 'option-2', label: 'Option 2' },
  { value: 'option-3', label: 'Option 3' },
  { value: 'option-4', label: 'Option 4' },
]

type SelectorRowProps = {
  title: string
  disabled?: boolean
}

const SelectorRow = ({ title, disabled = false }: SelectorRowProps) => (
  <>
    <h2 className="demo-section__title">{title}</h2>
    <div
      className="demo-section__select-grid"
      style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}
    >
      <section>
        <h3>Big Selector</h3>
        <Select disabled={disabled}>
          <SelectTrigger size="lg">
            <SelectValue placeholder="Big Selector" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </section>

      <section>
        <h3>Medium Selector</h3>
        <Select disabled={disabled}>
          <SelectTrigger size="md">
            <SelectValue placeholder="Medium Selector" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </section>

      <section>
        <h3>Small Selector</h3>
        <Select disabled={disabled}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Small Selector" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </section>
    </div>

    <h2 className="demo-section__title" style={{ marginTop: 24 }}>
      {title.replace('Selectors', 'Colored Selectors')}
    </h2>
    <div
      className="demo-section__select-grid"
      style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}
    >
      <section>
        <h3>Colored (Orange)</h3>
        <Select disabled={disabled}>
          <SelectTrigger size="md" variant="colored">
            <SelectValue placeholder="Orange Selector" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </section>

      <section>
        <h3>Colored (Green)</h3>
        <Select disabled={disabled}>
          <SelectTrigger size="md" variant="colored" color="#72F59E">
            <SelectValue placeholder="Green Selector" />
          </SelectTrigger>
          <SelectContent color="#72F59E">
            <SelectGroup>
              {OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </section>

      <section>
        <h3>Colored (Blue)</h3>
        <Select disabled={disabled}>
          <SelectTrigger size="md" variant="colored" color="#5E9EFF">
            <SelectValue placeholder="Blue Selector" />
          </SelectTrigger>
          <SelectContent color="#5E9EFF">
            <SelectGroup>
              {OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </section>

      <section>
        <h3>Colored (Red)</h3>
        <Select disabled={disabled}>
          <SelectTrigger size="md" variant="colored" color="#FF6B6B">
            <SelectValue placeholder="Red Selector" />
          </SelectTrigger>
          <SelectContent color="#FF6B6B">
            <SelectGroup>
              {OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </section>
    </div>
  </>
)

export const SelectorPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <SelectorRow title="Selectors - Default" />
      <div style={{ marginTop: 24 }}>
        <SelectorRow title="Selectors - Disabled" disabled />
      </div>
    </section>
  )
}
