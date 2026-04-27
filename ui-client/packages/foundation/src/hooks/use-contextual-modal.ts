import { useState } from 'react'

type UseContextualModalParams = {
  onOpen?: VoidFunction
  onClose?: VoidFunction
}

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
