/**
 * Runnable example for Select.
 */
import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tetherto/mdk-react-devkit'

export const SelectExample = () => {
  const [value, setValue] = useState<string>()
  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger style={{ width: 240 }}>
        <SelectValue placeholder="Select a container" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cont-A">Container A</SelectItem>
        <SelectItem value="cont-B">Container B</SelectItem>
        <SelectItem value="cont-C">Container C</SelectItem>
      </SelectContent>
    </Select>
  )
}
