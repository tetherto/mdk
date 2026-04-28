import { TrashIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { Button, EmptyState, Input, Switch } from '@tetherto/core'

import './feature-flags-settings.scss'

export type FeatureFlagsSettingsProps = {
  featureFlags: Record<string, boolean>
  isEditingEnabled: boolean
  isLoading?: boolean
  isSaving?: boolean
  onSave: (flags: Record<string, boolean>) => void
  className?: string
}

export const FeatureFlagsSettings = ({
  featureFlags,
  isEditingEnabled,
  isLoading = false,
  isSaving = false,
  onSave,
  className,
}: FeatureFlagsSettingsProps) => {
  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>(featureFlags)
  const [newFlagInput, setNewFlagInput] = useState('')

  if (!isEditingEnabled) {
    return <EmptyState description="Update feature flags not enabled" />
  }

  const handleToggle = (flag: string, checked: boolean) => {
    setLocalFlags((prev) => ({ ...prev, [flag]: checked }))
  }

  const handleAddFlag = () => {
    if (!newFlagInput) return
    const newFlags = newFlagInput
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)
      .reduce((acc, flag) => ({ ...acc, [flag]: false }), localFlags)
    setLocalFlags(newFlags)
    setNewFlagInput('')
  }

  const handleDelete = (flag: string) => {
    const { [flag]: _, ...rest } = localFlags
    setLocalFlags(rest)
  }

  const handleSave = () => {
    onSave(localFlags)
  }

  const flagKeys = Object.keys(localFlags)

  return (
    <div className={`mdk-settings-feature-flags ${className || ''}`}>
      <div className="mdk-settings-feature-flags__add-row">
        <Input
          placeholder="Add new feature flag, Use comma separated values for multiple flags"
          value={newFlagInput}
          onChange={(e) => setNewFlagInput(e.target.value)}
          className="mdk-settings-feature-flags__input"
        />
        <Button variant="secondary" disabled={!newFlagInput} onClick={handleAddFlag}>
          <span className="mdk-settings-feature-flags__add-btn-text">Add flag</span>
        </Button>
      </div>

      <div className="mdk-settings-feature-flags__toggles">
        {flagKeys.map((flag) => (
          <div key={flag} className="mdk-settings-feature-flags__flag-item">
            <span className="mdk-settings-feature-flags__flag-name">{flag}</span>
            <Switch
              color="primary"
              checked={Boolean(localFlags[flag])}
              onCheckedChange={(checked) => handleToggle(flag, checked)}
            />
            <button
              type="button"
              className="mdk-settings-feature-flags__flag-delete"
              onClick={() => handleDelete(flag)}
              aria-label={`Delete ${flag}`}
            >
              <TrashIcon width={18} height={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="mdk-settings-feature-flags__save">
        <Button variant="primary" disabled={isSaving || isLoading} onClick={handleSave}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
