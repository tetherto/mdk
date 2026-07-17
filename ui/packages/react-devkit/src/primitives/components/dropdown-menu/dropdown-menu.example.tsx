/**
 * Runnable example for DropdownMenu.
 */
import { Button, DropdownMenu } from '@tetherto/mdk-react-devkit'

export const DropdownMenuExample = () => (
  <div className="mdk-example-row">
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary">Actions</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>Device</DropdownMenu.Label>
        <DropdownMenu.Item>View Details</DropdownMenu.Item>
        <DropdownMenu.Item>Edit Configuration</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item>Reboot</DropdownMenu.Item>
        <DropdownMenu.Item disabled>Factory Reset</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>

    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary">Searchable</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content size="md">
        <DropdownMenu.Searchable
          items={[
            { label: 'Foundry EU' },
            { label: 'AntPool' },
            { label: 'F2Pool' },
            { label: 'SlushPool', disabled: true },
          ]}
          placeholder="Search pools..."
        />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
)
