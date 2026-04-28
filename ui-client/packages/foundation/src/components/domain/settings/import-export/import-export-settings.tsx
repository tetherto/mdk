import { UploadIcon } from '@radix-ui/react-icons'
import { useRef, useState } from 'react'
import { Button, Dialog, DialogContent, DialogFooter, ExportIcon } from '@tetherto/mdk-core-ui'

import type { SettingsExportData } from '../../../../types/settings.types'

import './import-export-settings.scss'

export type ImportExportSettingsProps = {
  onExport: VoidFunction
  onImport: (data: SettingsExportData) => void
  onParseFile?: (file: File) => Promise<SettingsExportData>
  isExporting?: boolean
  isImporting?: boolean
  className?: string
}

export const ImportExportSettings = ({
  onExport,
  onImport,
  onParseFile,
  isExporting = false,
  isImporting = false,
  className,
}: ImportExportSettingsProps) => {
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingData, setPendingData] = useState<SettingsExportData | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !onParseFile) return
    setUploading(true)
    try {
      const data = await onParseFile(selectedFile)
      setPendingData(data)
      setImportModalOpen(false)
      setConfirmOpen(true)
    } catch {
      // Parse error handled by consumer
    } finally {
      setUploading(false)
    }
  }

  const handleConfirmImport = () => {
    if (pendingData) {
      onImport(pendingData)
    }
    setConfirmOpen(false)
    setPendingData(null)
    setSelectedFile(null)
  }

  const handleCancelImport = () => {
    setConfirmOpen(false)
    setPendingData(null)
  }

  return (
    <div className={`mdk-settings-import-export ${className || ''}`}>
      <p className="mdk-settings-import-export__description">
        Save or restore all OS-level configuration in JSON format. Export your current settings to
        back them up, or import a previously saved configuration.
      </p>

      <div className="mdk-settings-import-export__actions">
        <Button
          variant="primary"
          icon={<ExportIcon width={18} height={18} />}
          onClick={onExport}
          loading={isExporting}
          disabled={isImporting}
        >
          Export JSON
        </Button>
        <Button
          variant="secondary"
          icon={<UploadIcon width={18} height={18} />}
          onClick={() => setImportModalOpen(true)}
          loading={isImporting}
          disabled={isExporting}
        >
          Import JSON
        </Button>
      </div>

      <p className="mdk-settings-import-export__warning">
        Warning: Importing settings will overwrite your current configuration. Make sure to export
        your current settings before importing.
      </p>

      <Dialog
        open={importModalOpen}
        onOpenChange={(isOpen) => !isOpen && setImportModalOpen(false)}
      >
        <DialogContent
          title="Import OS Settings"
          closable
          onClose={() => setImportModalOpen(false)}
        >
          <div className="mdk-settings-import-export__upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              onChange={handleFileSelect}
              className="mdk-settings-import-export__file-input"
            />
            <p className="mdk-settings-import-export__upload-text">
              {selectedFile ? selectedFile.name : 'Choose a file or drag & drop it here'}
            </p>
            <p className="mdk-settings-import-export__upload-hint">Accepted formats: .json, .csv</p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setImportModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} loading={uploading} disabled={!selectedFile}>
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={(isOpen) => !isOpen && handleCancelImport()}>
        <DialogContent title="Confirm Settings Import" closable onClose={handleCancelImport}>
          <p>
            Are you sure you want to import these settings? This will overwrite your current
            configuration.
          </p>
          {pendingData && (
            <div>
              <p>
                <strong>Settings to import:</strong>
              </p>
              <ul>
                {pendingData.headerControls && <li>Header Controls</li>}
                {pendingData.featureFlags && <li>Feature Flags</li>}
                {pendingData.timestamp && (
                  <li>Exported: {new Date(pendingData.timestamp).toLocaleString()}</li>
                )}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={handleCancelImport}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmImport}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
