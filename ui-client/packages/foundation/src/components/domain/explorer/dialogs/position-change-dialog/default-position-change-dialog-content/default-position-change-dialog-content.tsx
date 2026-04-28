import { Button } from '@tetherto/mdk-core-ui'

import { POSITION_CHANGE_DIALOG_FLOWS } from '../../../../../../constants/dialog'
import './default-position-change-dialog-content.scss'

type DefaultPositionChangeDialogContentProps = {
  setCurrentDialogFlow: (flow: string) => void
  onChangePositionClicked?: VoidFunction
}

export const DefaultPositionChangeDialogContent = ({
  setCurrentDialogFlow,
  onChangePositionClicked,
}: DefaultPositionChangeDialogContentProps) => {
  return (
    <div className="mdk-position-change-menu">
      <Button
        className="mdk-position-change-menu__button"
        onClick={() => {
          setCurrentDialogFlow(POSITION_CHANGE_DIALOG_FLOWS.CONTAINER_SELECTION)
          onChangePositionClicked?.()
        }}
      >
        Change Position
      </Button>

      <Button
        className="mdk-position-change-menu__button"
        onClick={() => setCurrentDialogFlow(POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE)}
      >
        Maintenance
      </Button>

      <Button
        className="mdk-position-change-menu__button"
        onClick={() => {
          setCurrentDialogFlow(POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO)
        }}
      >
        Change Miner info
      </Button>
    </div>
  )
}
