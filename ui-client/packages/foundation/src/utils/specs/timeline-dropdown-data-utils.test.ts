import { describe, expect, it } from 'vitest'

import {
  getTimelineRadioButtons,
  longTimelineRadioButtons,
  oneMinuteTimeLineRadioButton,
  shortTimelineRadioButtons,
  timelineDropdownItems,
  timelineRadioButtons,
} from '../timeline-dropdown-data-utils'

describe('timeline-dropdown-data-utils', () => {
  describe('shortTimelineRadioButtons', () => {
    it('has exactly 3 items', () => {
      expect(shortTimelineRadioButtons).toHaveLength(3)
    })

    it('contains 30 Min option', () => {
      expect(shortTimelineRadioButtons).toContainEqual({ value: '30m', label: '30 Min' })
    })

    it('contains 3 H option', () => {
      expect(shortTimelineRadioButtons).toContainEqual({ value: '3h', label: '3 H' })
    })

    it('contains 1 D option', () => {
      expect(shortTimelineRadioButtons).toContainEqual({ value: '1D', label: '1 D' })
    })

    it('has correct order', () => {
      expect(shortTimelineRadioButtons.map((b) => b.value)).toEqual(['30m', '3h', '1D'])
    })

    it('every item has value and label', () => {
      shortTimelineRadioButtons.forEach((btn) => {
        expect(btn).toHaveProperty('value')
        expect(btn).toHaveProperty('label')
      })
    })
  })

  describe('longTimelineRadioButtons', () => {
    it('has exactly 1 item', () => {
      expect(longTimelineRadioButtons).toHaveLength(1)
    })

    it('contains only the 1D option', () => {
      expect(longTimelineRadioButtons).toContainEqual({ value: '1D', label: '1D' })
    })

    it('has correct value', () => {
      expect(longTimelineRadioButtons[0].value).toBe('1D')
    })

    it('has correct label', () => {
      expect(longTimelineRadioButtons[0].label).toBe('1D')
    })
  })

  describe('timelineRadioButtons', () => {
    it('has exactly 4 items', () => {
      expect(timelineRadioButtons).toHaveLength(4)
    })

    it('starts with 5 Min option', () => {
      expect(timelineRadioButtons[0]).toEqual({ value: '5m', label: '5 Min' })
    })

    it('contains all shortTimelineRadioButtons after first item', () => {
      expect(timelineRadioButtons.slice(1)).toEqual(shortTimelineRadioButtons)
    })

    it('has correct order', () => {
      expect(timelineRadioButtons.map((b) => b.value)).toEqual(['5m', '30m', '3h', '1D'])
    })

    it('every item has value and label', () => {
      timelineRadioButtons.forEach((btn) => {
        expect(btn).toHaveProperty('value')
        expect(btn).toHaveProperty('label')
      })
    })
  })

  describe('oneMinuteTimeLineRadioButton', () => {
    it('has exactly 5 items', () => {
      expect(oneMinuteTimeLineRadioButton).toHaveLength(5)
    })

    it('starts with 1 Min option', () => {
      expect(oneMinuteTimeLineRadioButton[0]).toEqual({ value: '1m', label: '1 Min' })
    })

    it('contains all timelineRadioButtons after first item', () => {
      expect(oneMinuteTimeLineRadioButton.slice(1)).toEqual(timelineRadioButtons)
    })

    it('has correct order', () => {
      expect(oneMinuteTimeLineRadioButton.map((b) => b.value)).toEqual([
        '1m',
        '5m',
        '30m',
        '3h',
        '1D',
      ])
    })

    it('every item has value and label', () => {
      oneMinuteTimeLineRadioButton.forEach((btn) => {
        expect(btn).toHaveProperty('value')
        expect(btn).toHaveProperty('label')
      })
    })
  })

  describe('getTimelineRadioButtons', () => {
    describe('default (no flags)', () => {
      it('returns timelineRadioButtons when no flags provided', () => {
        expect(getTimelineRadioButtons({})).toEqual(timelineRadioButtons)
      })

      it('returns timelineRadioButtons when both flags are false', () => {
        expect(getTimelineRadioButtons({ isOneMinEnabled: false, isShort: false })).toEqual(
          timelineRadioButtons,
        )
      })

      it('returns timelineRadioButtons when both flags are undefined', () => {
        expect(getTimelineRadioButtons({ isOneMinEnabled: undefined, isShort: undefined })).toEqual(
          timelineRadioButtons,
        )
      })

      it('returns 4 items by default', () => {
        expect(getTimelineRadioButtons({})).toHaveLength(4)
      })
    })

    describe('isShort=true', () => {
      it('returns shortTimelineRadioButtons', () => {
        expect(getTimelineRadioButtons({ isShort: true })).toEqual(shortTimelineRadioButtons)
      })

      it('returns 3 items', () => {
        expect(getTimelineRadioButtons({ isShort: true })).toHaveLength(3)
      })

      it('does not include 5 Min option', () => {
        const result = getTimelineRadioButtons({ isShort: true })
        expect(result.map((b) => b.value)).not.toContain('5m')
      })

      it('does not include 1 Min option', () => {
        const result = getTimelineRadioButtons({ isShort: true })
        expect(result.map((b) => b.value)).not.toContain('1m')
      })

      it('isShort takes priority over isOneMinEnabled', () => {
        const result = getTimelineRadioButtons({ isShort: true, isOneMinEnabled: true })
        expect(result).toEqual(shortTimelineRadioButtons)
        expect(result.map((b) => b.value)).not.toContain('1m')
      })
    })

    describe('isOneMinEnabled=true', () => {
      it('prepends 1 Min option to timelineRadioButtons', () => {
        const result = getTimelineRadioButtons({ isOneMinEnabled: true })
        expect(result[0]).toEqual({ value: '1m', label: '1 Min' })
      })

      it('returns 5 items', () => {
        expect(getTimelineRadioButtons({ isOneMinEnabled: true })).toHaveLength(5)
      })

      it('contains all timelineRadioButtons after first item', () => {
        const result = getTimelineRadioButtons({ isOneMinEnabled: true })
        expect(result.slice(1)).toEqual(timelineRadioButtons)
      })

      it('has correct order', () => {
        const result = getTimelineRadioButtons({ isOneMinEnabled: true })
        expect(result.map((b) => b.value)).toEqual(['1m', '5m', '30m', '3h', '1D'])
      })
    })

    describe('return shape', () => {
      it('every returned item has a value string', () => {
        const result = getTimelineRadioButtons({})
        result.forEach((btn) => expect(typeof btn.value).toBe('string'))
      })

      it('every returned item has a label string', () => {
        const result = getTimelineRadioButtons({})
        result.forEach((btn) => expect(typeof btn.label).toBe('string'))
      })

      it('returns a new array (does not mutate timelineRadioButtons)', () => {
        const result = getTimelineRadioButtons({ isOneMinEnabled: true })
        expect(result).not.toBe(timelineRadioButtons)
      })
    })
  })

  describe('timelineDropdownItems', () => {
    it('has exactly 3 groups', () => {
      expect(timelineDropdownItems).toHaveLength(3)
    })

    it('every group has key, type, label and children', () => {
      timelineDropdownItems.forEach((group) => {
        expect(group).toHaveProperty('key')
        expect(group).toHaveProperty('type')
        expect(group).toHaveProperty('label')
        expect(group).toHaveProperty('children')
      })
    })

    it('every group has type="group"', () => {
      timelineDropdownItems.forEach((group) => {
        expect(group.type).toBe('group')
      })
    })

    describe('minutes group', () => {
      const group = timelineDropdownItems[0]

      it('has key "minutes"', () => {
        expect(group.key).toBe('minutes')
      })

      it('has label "Minutes"', () => {
        expect(group.label).toBe('Minutes')
      })

      it('has exactly 3 children', () => {
        expect(group.children).toHaveLength(3)
      })

      it('contains 15 minutes', () => {
        expect(group.children).toContainEqual({ key: '15min', label: '15 minutes' })
      })

      it('contains 30 minutes', () => {
        expect(group.children).toContainEqual({ key: '30min', label: '30 minutes' })
      })

      it('contains 45 minutes', () => {
        expect(group.children).toContainEqual({ key: '45min', label: '45 minutes' })
      })
    })

    describe('hours group', () => {
      const group = timelineDropdownItems[1]

      it('has key "hours"', () => {
        expect(group.key).toBe('hours')
      })

      it('has label "Hours"', () => {
        expect(group.label).toBe('Hours')
      })

      it('has exactly 3 children', () => {
        expect(group.children).toHaveLength(3)
      })

      it('contains 1 hour', () => {
        expect(group.children).toContainEqual({ key: '1h', label: '1 hour' })
      })

      it('contains 6 hours', () => {
        expect(group.children).toContainEqual({ key: '6h', label: '6 hours' })
      })

      it('contains 12 hours', () => {
        expect(group.children).toContainEqual({ key: '12h', label: '12 hours' })
      })
    })

    describe('days group', () => {
      const group = timelineDropdownItems[2]

      it('has key "days"', () => {
        expect(group.key).toBe('days')
      })

      it('has label "Days"', () => {
        expect(group.label).toBe('Days')
      })

      it('has exactly 4 children', () => {
        expect(group.children).toHaveLength(4)
      })

      it('contains 1 day', () => {
        expect(group.children).toContainEqual({ key: '1d', label: '1 day' })
      })

      it('contains 1 week', () => {
        expect(group.children).toContainEqual({ key: '7d', label: '1 week' })
      })

      it('contains 1 month', () => {
        expect(group.children).toContainEqual({ key: '30d', label: '1 month' })
      })

      it('contains 3 months', () => {
        expect(group.children).toContainEqual({ key: '90d', label: '3 months' })
      })
    })

    describe('children shape', () => {
      it('every child in every group has key and label', () => {
        timelineDropdownItems.forEach((group) => {
          group.children.forEach((child) => {
            expect(child).toHaveProperty('key')
            expect(child).toHaveProperty('label')
          })
        })
      })

      it('all child keys are unique across all groups', () => {
        const allKeys = timelineDropdownItems.flatMap((g) => g.children.map((c) => c.key))
        const uniqueKeys = new Set(allKeys)
        expect(uniqueKeys.size).toBe(allKeys.length)
      })
    })
  })
})
