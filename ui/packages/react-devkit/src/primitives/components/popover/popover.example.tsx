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
        <div className="mdk-example-col mdk-example-col--gap-sm mdk-example-min-width">
          <strong>Filter by</strong>
          <p className="mdk-example-flush">Place your filter form here.</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
