import type { KeyboardEvent } from 'react'

export type KeyboardActivationEvent = Pick<KeyboardEvent, 'key' | 'preventDefault'>

export const isEnterOrSpaceKey = (key: string): boolean => key === 'Enter' || key === ' '

export const runOnEnterOrSpace = (event: KeyboardActivationEvent, action: VoidFunction): void => {
  if (!isEnterOrSpaceKey(event.key)) {
    return
  }

  event.preventDefault()
  action()
}
