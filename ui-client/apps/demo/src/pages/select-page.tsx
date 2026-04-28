import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@tetherto/core'

export const SelectPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Select</h2>
      <div className="demo-section__select-grid">
        <section>
          <h3>Basic</h3>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Actions</SelectLabel>
                <SelectItem value="move-miner">Move Miner</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
                <SelectItem value="inventory-logs">Inventory Logs</SelectItem>
                <SelectItem value="go-to-explorer">Go To Explorer</SelectItem>
                <SelectItem value="add-comment">Add Comment</SelectItem>
                <SelectItem value="delete-miner">Delete Miner</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </section>

        <section>
          <h3>With placeholder</h3>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Choose a status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Status</SelectLabel>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </section>

        <section>
          <h3>With disabled items</h3>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Actions</SelectLabel>
                <SelectItem value="move-miner">Move Miner</SelectItem>
                <SelectItem value="repair" disabled>
                  Repair (unavailable)
                </SelectItem>
                <SelectItem value="go-to-explorer" disabled>
                  Go To Explorer (unavailable)
                </SelectItem>
                <SelectItem value="add-comment">Add Comment</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </section>

        <section>
          <h3>Grouped with separator</h3>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Choose an action" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Primary</SelectLabel>
                <SelectItem value="move-miner">Move Miner</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
                <SelectItem value="add-comment">Add Comment</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Danger Zone</SelectLabel>
                <SelectItem value="delete-miner">Delete Miner</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </section>

        <section>
          <h3>With default value</h3>
          <Select defaultValue="apple">
            <SelectTrigger>
              <SelectValue placeholder="Pick a fruit" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Fruits</SelectLabel>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
                <SelectItem value="orange">Orange</SelectItem>
                <SelectItem value="grape">Grape</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </section>
      </div>
    </section>
  )
}
