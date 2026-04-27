import type { ToastPosition, ToastVariant } from '@mdk/core'
import { Button, Toast, TOAST_POSITIONS, Toaster } from '@mdk/core'
import { useNotification } from '@mdk/foundation'
import { useState } from 'react'

type ToastItem = {
  id: string
  variant: ToastVariant
  title: string
  description: string | undefined
}

const TOAST_DURATION = 5000

const TOAST_DEMO_CONFIGS: Array<{
  variant: ToastVariant
  buttonVariant: 'primary' | 'secondary' | 'danger' | 'tertiary'
  buttonText: string
  title: string
  description?: string
}> = [
  {
    variant: 'success',
    buttonVariant: 'primary',
    buttonText: 'Show Success Toast',
    title: 'Success!',
    description: 'Your action was completed successfully.',
  },
  {
    variant: 'error',
    buttonVariant: 'danger',
    buttonText: 'Show Error Toast',
    title: 'Error!',
    description: 'Something went wrong. Please try again.',
  },
  {
    variant: 'warning',
    buttonVariant: 'secondary',
    buttonText: 'Show Warning Toast',
    title: 'Warning!',
    description: 'Please review before proceeding.',
  },
  {
    variant: 'info',
    buttonVariant: 'secondary',
    buttonText: 'Show Info Toast',
    title: 'Info',
    description: 'Here is some helpful information.',
  },
  {
    variant: 'info',
    buttonVariant: 'secondary',
    buttonText: 'Show Toast (No Description)',
    title: 'Title Only',
  },
  {
    variant: 'info',
    buttonVariant: 'secondary',
    buttonText: 'Long Text and Description',
    title: 'Long title Long title Long title Long title Long title',
    description:
      'Long description Long description Long description Long description Long description',
  },
]

const HOOK_DEMO_CONFIGS: Array<{
  buttonVariant: 'primary' | 'secondary' | 'danger' | 'tertiary'
  buttonText: string
  hookMethod: 'notifySuccess' | 'notifyError' | 'notifyWarning' | 'notifyInfo'
  title: string
  description?: string
}> = [
  {
    hookMethod: 'notifySuccess',
    buttonVariant: 'primary',
    buttonText: 'Hook: Success',
    title: 'Success via Hook!',
    description: 'This toast was triggered using useNotification hook.',
  },
  {
    hookMethod: 'notifyError',
    buttonVariant: 'danger',
    buttonText: 'Hook: Error',
    title: 'Error via Hook!',
    description: 'This error toast was triggered using the hook.',
  },
  {
    hookMethod: 'notifyWarning',
    buttonVariant: 'secondary',
    buttonText: 'Hook: Warning',
    title: 'Warning via Hook!',
    description: 'This warning toast was triggered using the hook.',
  },
  {
    hookMethod: 'notifyInfo',
    buttonVariant: 'secondary',
    buttonText: 'Hook: Info',
    title: 'Info via Hook!',
    description: 'This info toast was triggered using the hook.',
  },
  {
    hookMethod: 'notifyInfo',
    buttonVariant: 'secondary',
    buttonText: 'Hook: No Description',
    title: 'Title Only (Hook)',
  },
]

export const ToastPage = (): JSX.Element => {
  const { notifySuccess, notifyError, notifyWarning, notifyInfo } = useNotification()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [toastPosition, setToastPosition] = useState<ToastPosition>('top-right')

  const showToast = (
    variant: ToastVariant,
    title: string,
    description: string | undefined = undefined,
  ): void => {
    const id = `${Date.now()}-${Math.random()}`
    const newToast: ToastItem = { id, variant, title, description }
    setToasts((prevToasts) => [...prevToasts, newToast])
  }

  const removeToast = (id: string): void => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }

  const handleHookDemo = (
    method: 'notifySuccess' | 'notifyError' | 'notifyWarning' | 'notifyInfo',
    title: string,
    description?: string,
  ): void => {
    const hookMethods = {
      notifySuccess,
      notifyError,
      notifyWarning,
      notifyInfo,
    }
    hookMethods[method](title, description, { position: toastPosition })
  }

  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Toast</h2>
      <p className="demo-section__description">
        Toast notifications appear in the corner of the screen. Select a position, then click a
        button to trigger a toast. Toasts auto-dismiss after {TOAST_DURATION / 1000} seconds or can
        be closed manually.
      </p>

      <div className="demo-section__toast-controls">
        <h3>Step 1: Select Position</h3>
        <p className="demo-section__hint">Choose where toasts will appear on the screen</p>
        <div className="demo-section__toast-positions">
          {TOAST_POSITIONS.map((pos) => (
            <Button
              key={pos}
              variant={toastPosition === pos ? 'primary' : 'secondary'}
              onClick={() => setToastPosition(pos)}
            >
              {pos}
            </Button>
          ))}
        </div>
      </div>

      <div className="demo-section__toast-controls">
        <h3>Step 2: Trigger a Toast (Component Method)</h3>
        <p className="demo-section__hint">Click any button below to show a toast notification</p>
        <div className="demo-section__toast-buttons">
          {TOAST_DEMO_CONFIGS.map((config) => (
            <Button
              key={config.buttonText}
              variant={config.buttonVariant}
              onClick={() => showToast(config.variant, config.title, config.description)}
            >
              {config.buttonText}
            </Button>
          ))}
        </div>
      </div>

      <div className="demo-section__toast-controls">
        <h3>Step 3: Trigger a Toast (useNotification Hook)</h3>
        <p className="demo-section__hint">
          Click any button below to show a toast using the <code>useNotification()</code> hook
        </p>
        <div className="demo-section__toast-buttons">
          {HOOK_DEMO_CONFIGS.map((config) => (
            <Button
              key={config.buttonText}
              variant={config.buttonVariant}
              onClick={() => handleHookDemo(config.hookMethod, config.title, config.description)}
            >
              {config.buttonText}
            </Button>
          ))}
        </div>
      </div>

      <Toaster duration={TOAST_DURATION} position={toastPosition}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            variant={toast.variant}
            title={toast.title}
            {...(toast.description && { description: toast.description })}
            onOpenChange={(open) => {
              if (!open) removeToast(toast.id)
            }}
          />
        ))}
      </Toaster>
    </section>
  )
}
