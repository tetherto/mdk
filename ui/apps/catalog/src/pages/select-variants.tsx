import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tetherto/mdk-react-devkit/primitives'

import type { JSX } from 'react'

const OPTIONS = [
  { value: 'option-1', label: 'Option 1' },
  { value: 'option-2', label: 'Option 2' },
  { value: 'option-3', label: 'Option 3' },
  { value: 'option-4', label: 'Option 4' },
]

type SelectorRowProps = {
  disabled?: boolean
}

const SelectorRow = ({ disabled = false }: SelectorRowProps) => (
  <>
    <h2 className="demo-section__title">{disabled ? 'Sizes — disabled' : 'Sizes'}</h2>
    <div className="demo-section__select-grid demo-section__select-grid--3-col demo-section__select-grid--gap-xl">
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

    <h2 className="demo-section__title demo-section__mt-xl">
      {disabled ? 'Colors — disabled' : 'Colors'}
    </h2>
    <div className="demo-section__select-grid demo-section__select-grid--4-col demo-section__select-grid--gap-xl">
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

/** Trigger sizes and the colored variant, enabled and disabled; rendered on the Select page. */
export const SelectVariants = (): JSX.Element => (
  <>
    <div className="demo-section__mt-xl">
      <SelectorRow />
    </div>
    <div className="demo-section__mt-xl">
      <SelectorRow disabled />
    </div>
  </>
)
