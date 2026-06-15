import { useState } from 'react'

type UseContextualModalParams = {
  onOpen?: VoidFunction
  onClose?: VoidFunction
}

/**
 * Headless open/close state for a modal that needs to remember the subject
 * it was opened against (the row being edited, the device being inspected,
 * etc.).
 *
 * Returns `modalOpen`, `subject`, and the `handleOpen`/`handleClose`
 * callbacks so callers don't have to wire two `useState`s by hand.
 *
 * @category utility
 */
export const useContextualModal = <T = unknown>({
  onOpen,
  onClose,
}: UseContextualModalParams = {}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [subject, setSubject] = useState<T | null>(null)

  const handleOpen = (sub: T | null) => {
    if (sub) {
      setSubject(sub)
    }
    setModalOpen(true)
    onOpen?.()
  }

  const handleClose = () => {
    setSubject(null)
    setModalOpen(false)
    onClose?.()
  }

  return {
    modalOpen,
    handleClose,
    handleOpen,
    subject,
    setSubject,
  }
}
