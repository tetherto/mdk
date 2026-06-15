import { describe, expect, it } from 'vitest'
import { OS_TYPES } from '@/hooks/use-platform'
import { getControlSectionsTooltips } from '../keyboard-shortcut-utils'

describe('getControlSectionsTooltips', () => {
  describe('return shape', () => {
    it('returns an array', () => {
      expect(Array.isArray(getControlSectionsTooltips(OS_TYPES.MAC))).toBe(true)
    })

    it('returns 5 tooltips', () => {
      expect(getControlSectionsTooltips(OS_TYPES.Windows)).toHaveLength(5)
    })

    it('each entry has a label and desc string', () => {
      getControlSectionsTooltips(OS_TYPES.MAC).forEach(({ label, desc }) => {
        expect(typeof label).toBe('string')
        expect(typeof desc).toBe('string')
        expect(label.length).toBeGreaterThan(0)
        expect(desc.length).toBeGreaterThan(0)
      })
    })
  })

  describe('modifier key — macOS', () => {
    const tooltips = getControlSectionsTooltips(OS_TYPES.MAC)

    it('uses Cmd in the rack bar tooltip', () => {
      const rackBar = tooltips.find((t) => t.label === 'Click on the Rack bar')
      expect(rackBar?.desc).toContain('Cmd')
      expect(rackBar?.desc).not.toContain('Ctrl')
    })

    it('uses Cmd in the scroll zoom tooltip label', () => {
      const scroll = tooltips.find((t) => t.label.includes('Scroll Up/Down'))
      expect(scroll?.label).toContain('Cmd')
      expect(scroll?.label).not.toContain('Ctrl')
    })
  })

  describe('modifier key — non-macOS', () => {
    it.each([OS_TYPES.Windows, OS_TYPES.Linux, OS_TYPES.Android, 'unknown'])(
      'uses Ctrl for platform "%s"',
      (platform) => {
        const tooltips = getControlSectionsTooltips(platform)
        const rackBar = tooltips.find((t) => t.label === 'Click on the Rack bar')
        expect(rackBar?.desc).toContain('Ctrl')
        expect(rackBar?.desc).not.toContain('Cmd')
      },
    )
  })

  describe('platform-independent tooltips', () => {
    it('drag select tooltip is unchanged across platforms', () => {
      const mac = getControlSectionsTooltips(OS_TYPES.MAC)
      const win = getControlSectionsTooltips(OS_TYPES.Windows)
      const drag = (t: ReturnType<typeof getControlSectionsTooltips>) =>
        t.find((x) => x.label === 'Drag select')
      expect(drag(mac)).toEqual(drag(win))
    })

    it('scroll move tooltip is unchanged across platforms', () => {
      const mac = getControlSectionsTooltips(OS_TYPES.MAC)
      const win = getControlSectionsTooltips(OS_TYPES.Windows)
      const scroll = (t: ReturnType<typeof getControlSectionsTooltips>) =>
        t.find((x) => x.label === 'Scroll Up/Down')
      expect(scroll(mac)).toEqual(scroll(win))
    })

    it('shift+click tooltip is unchanged across platforms', () => {
      const mac = getControlSectionsTooltips(OS_TYPES.MAC)
      const win = getControlSectionsTooltips(OS_TYPES.Windows)
      const shift = (t: ReturnType<typeof getControlSectionsTooltips>) =>
        t.find((x) => x.label === 'Shift+Click')
      expect(shift(mac)).toEqual(shift(win))
    })
  })
})
