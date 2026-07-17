/**
 * Runnable example for Popover.
 */
import { Button, Popover, PopoverContent, PopoverTrigger } from '@tetherto/mdk-react-devkit'

export const PopoverExample = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Filters</Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" showArrow showClose>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
          <strong>Filter by</strong>
          <p style={{ margin: 0 }}>Place your filter form here.</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
