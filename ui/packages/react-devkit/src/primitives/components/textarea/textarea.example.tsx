/**
 * Runnable example for TextArea.
 */
import { TextArea } from '@tetherto/mdk-react-devkit'

export const TextAreaExample = () => (
  <div className="mdk-example-col">
    <TextArea
      id="notes"
      label="Device Notes"
      placeholder="Add notes about this miner..."
      rows={4}
    />

    <TextArea
      id="config"
      label="Custom Configuration"
      placeholder="Paste raw config JSON..."
      rows={6}
    />

    <TextArea
      id="error-ta"
      label="Pool URL"
      placeholder="stratum+tcp://..."
      error="Invalid stratum URL format."
    />

    <TextArea
      id="disabled-ta"
      label="Read-only Log"
      defaultValue="2025-05-18 12:34:56 — Pool connected successfully."
      disabled
      rows={3}
    />
  </div>
)
