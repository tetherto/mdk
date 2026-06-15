/**
 * Runnable example for ErrorCard.
 */
import { ErrorCard } from '@tetherto/mdk-react-devkit'

export const ErrorCardExample = () => (
  <div className="mdk-example-row" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {/* Default card variant */}
    <ErrorCard error="Connection timed out. Please try again." />

    {/* Card variant with custom title */}
    <ErrorCard
      title="Authentication Error"
      error="Invalid credentials. Please check your username and password."
    />

    {/* Multi-line error */}
    <ErrorCard
      title="Validation Errors"
      error={
        "Field 'name' is required\nField 'email' must be a valid address\nField 'password' must be at least 8 characters"
      }
    />

    {/* Inline variant */}
    <ErrorCard
      variant="inline"
      title="Warning"
      error="Some miners are reporting high temperatures."
    />
  </div>
)
