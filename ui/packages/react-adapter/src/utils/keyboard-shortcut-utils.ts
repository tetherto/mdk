import { OS_TYPES } from '../hooks/use-platform'

export type ControlTooltip = {
  label: string
  desc: string
}

export const getControlSectionsTooltips = (platform: string): ControlTooltip[] => {
  const modifierKey = platform === OS_TYPES.MAC ? 'Cmd' : 'Ctrl'

  return [
    {
      label: 'Drag select',
      desc: 'Select multiple miners.',
    },
    {
      label: 'Click on the Rack bar',
      desc: `Select all miners therein (${modifierKey}+Click to deselect them).`,
    },
    {
      label: 'Shift+Click',
      desc: 'Select (multiple) individual miners.',
    },
    {
      label: `${modifierKey}+Scroll Up/Down`,
      desc: 'Zoom In/Out.',
    },
    {
      label: 'Scroll Up/Down',
      desc: 'Move Up/Down PDU Layout view.',
    },
  ]
}
