// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTION_TYPES } from '../../../../../../constants/actions'
import { POSITION_CHANGE_DIALOG_FLOWS } from '../../../../../../constants/dialog'
import { useStaticMinerIpAssignment } from '../../../../../../hooks/use-static-miner-ip-assignment'
import { AddReplaceMinerDialogContent } from '../add-replace-miner-dialog-content'

import { useMinerDuplicateValidation } from '../../../../../../hooks/use-miner-duplicate-validation'
import { actionsSlice } from '../../../../../../state'
import { buildAddReplaceMinerParams, isActionExists } from '../helper'

const mockDispatch = vi.fn()
const mockNotifyInfo = vi.fn()
const mockNotifyError = vi.fn()

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: vi.fn((selector: any) => selector({ actions: { pendingSubmissions: [] } })),
}))

vi.mock('../../../../../../hooks', () => ({
  useNotification: () => ({ notifyInfo: mockNotifyInfo, notifyError: mockNotifyError }),
}))

vi.mock('../../../../../../state', () => ({
  actionsSlice: {
    actions: {
      setAddPendingSubmissionAction: vi.fn((payload) => ({ type: 'SET_PENDING', payload })),
    },
    selectors: {
      selectPendingSubmissions: (state: any) => state.actions?.pendingSubmissions ?? [],
    },
  },
}))

vi.mock('../../../../../../utils/container-utils', () => ({
  getDeviceContainerPosText: vi.fn(() => 'CON-BBR-01 / A1'),
}))

vi.mock('../helper', () => ({
  buildAddReplaceMinerParams: vi.fn(() => [{ id: 'built-params' }]),
  isActionExists: vi.fn(() => false),
}))

vi.mock('../../../../../../hooks/use-miner-duplicate-validation', () => ({
  useMinerDuplicateValidation: vi.fn(() => ({
    checkDuplicate: vi.fn().mockResolvedValue(false),
    duplicateError: false,
    isDuplicateCheckLoading: false,
    setDuplicateError: vi.fn(),
  })),
}))

vi.mock('../../../../../../hooks/use-static-miner-ip-assignment', () => ({
  useStaticMinerIpAssignment: vi.fn(() => ({
    isStaticIpAssignment: false,
    minerIp: '',
  })),
}))

vi.mock(
  '../../position-change-dialog/rack-id-selection-dropdown/rack-id-selection-dropdown',
  () => ({
    RackIdSelectionDropdown: ({ value, handleChange, status }: any) => (
      <select
        data-testid="rack-id-dropdown"
        data-status={status}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      >
        <option value="">Select rack</option>
        <option value="rack-001">rack-001</option>
        <option value="rack-002">rack-002</option>
      </select>
    ),
  }),
)

vi.mock('../../position-change-dialog/static-miner-ip-assigment/static-miner-ip-assigment', () => ({
  StaticMinerIpAssigment: ({ minerIp, setMinerIp }: any) => (
    <input
      data-testid="static-ip-input"
      value={minerIp}
      onChange={(e) => setMinerIp(e.target.value)}
    />
  ),
}))

const { setAddPendingSubmissionAction } = actionsSlice.actions

type DialogFlowType =
  | (typeof POSITION_CHANGE_DIALOG_FLOWS)[keyof typeof POSITION_CHANGE_DIALOG_FLOWS]
  | undefined

const defaultProps: {
  selectedEditSocket?: any
  onCancel: VoidFunction
  currentDialogFlow?: DialogFlowType
  isDirectToMaintenanceMode: boolean
  minersType: string
} = {
  selectedEditSocket: undefined,
  onCancel: vi.fn(),
  currentDialogFlow: undefined,
  isDirectToMaintenanceMode: false,
  minersType: '',
}

const renderComponent = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<AddReplaceMinerDialogContent {...defaultProps} {...overrides} />)

const changeInput = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } })

const clickSubmit = (label: RegExp = /add miner/i) =>
  fireEvent.click(screen.getByRole('button', { name: label }))

const fillValidForm = () => {
  fireEvent.change(screen.getByTestId('rack-id-dropdown'), { target: { value: 'rack-001' } })

  changeInput(document.querySelector('input[name="shortCode"]')!, 'M-SNOW-01')
  changeInput(document.querySelector('input[name="serialNumber"]')!, 'SN-VALID-001')
  changeInput(document.querySelector('input[name="macAddress"]')!, 'AABBCCDDEEFF')
  changeInput(document.querySelector('input[name="username"]')!, 'admin')
  changeInput(document.querySelector('input[name="password"]')!, 'secret')
}
describe('AddReplaceMinerDialogContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useMinerDuplicateValidation as ReturnType<typeof vi.fn>).mockReturnValue({
      checkDuplicate: vi.fn().mockResolvedValue(false),
      duplicateError: false,
      isDuplicateCheckLoading: false,
      setDuplicateError: vi.fn(),
    })
    ;(useStaticMinerIpAssignment as ReturnType<typeof vi.fn>).mockReturnValue({
      isStaticIpAssignment: false,
      minerIp: '',
    })
  })

  describe('initial render', () => {
    it('renders all base fields', () => {
      renderComponent()
      expect(screen.getByLabelText(/short code/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/serial number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/mac address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument()
    })

    it('renders miner type dropdown when no currentDialogFlow', () => {
      renderComponent()
      expect(screen.getByTestId('rack-id-dropdown')).toBeInTheDocument()
    })

    it('hides miner type dropdown when currentDialogFlow is set', () => {
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO })
      expect(screen.queryByTestId('rack-id-dropdown')).not.toBeInTheDocument()
    })

    it('renders username/password fields when not CHANGE_INFO flow', () => {
      renderComponent()
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    it('hides username/password fields in CHANGE_INFO flow', () => {
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO })
      expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
    })

    it('shows "Add Miner" button by default', () => {
      renderComponent()
      expect(screen.getByRole('button', { name: /add miner/i })).toBeInTheDocument()
    })

    it('shows "Change Miner Info" button in CHANGE_INFO flow', () => {
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO })
      expect(screen.getByRole('button', { name: /change miner info/i })).toBeInTheDocument()
    })

    it('shows "Replace Miner" button in REPLACE_MINER flow', () => {
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.REPLACE_MINER })
      expect(screen.getByRole('button', { name: /replace miner/i })).toBeInTheDocument()
    })
  })

  describe('pre-filled values from selectedEditSocket', () => {
    const socket = {
      miner: {
        info: { serialNum: 'SN-12345', macAddress: 'AA:BB:CC:DD:EE:FF' },
        code: 'M-SNOW-01',
        tags: ['Production'],
        rack: 'rack-001',
      },
      containerInfo: { rack: 'rack-001' },
    }

    it('fills short code from selectedEditSocket', () => {
      renderComponent({ selectedEditSocket: socket })
      expect(screen.getByLabelText(/short code/i)).toHaveValue('M-SNOW-01')
    })
  })

  describe('short code auto-fill on rack change', () => {
    it('auto-fills short code when rack-001 is selected', async () => {
      renderComponent()
      fireEvent.change(screen.getByTestId('rack-id-dropdown'), { target: { value: 'rack-001' } })
      await waitFor(() => {
        expect(screen.getByLabelText(/short code/i)).toHaveValue('M-SNOW-01')
      })
    })

    it('auto-fills short code when rack-002 is selected', async () => {
      renderComponent()
      fireEvent.change(screen.getByTestId('rack-id-dropdown'), { target: { value: 'rack-002' } })
      await waitFor(() => {
        expect(screen.getByLabelText(/short code/i)).toHaveValue('M-ICE-02')
      })
    })

    it('does NOT auto-fill short code in CHANGE_INFO flow', () => {
      renderComponent({
        currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO,
        selectedEditSocket: {
          miner: { info: {}, code: 'ORIGINAL', tags: [] },
          containerInfo: { rack: 'rack-001' },
        },
      })
      expect(screen.queryByTestId('rack-id-dropdown')).not.toBeInTheDocument()
      expect(screen.getByLabelText(/short code/i)).toHaveValue('ORIGINAL')
    })
  })

  describe('form validation', () => {
    it('shows error when serial number is empty on submit', async () => {
      renderComponent()
      clickSubmit()
      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument()
      })
    })

    it('shows error when miner type is not selected on submit', async () => {
      renderComponent()
      changeInput(screen.getByLabelText(/serial number/i), 'SN-001')
      changeInput(screen.getByLabelText(/mac address/i), 'AABBCCDDEEFF')
      changeInput(screen.getByLabelText(/short code/i), 'M-001')
      changeInput(screen.getByLabelText(/username/i), 'admin')
      changeInput(screen.getByLabelText(/password/i), 'secret')
      clickSubmit()
      await waitFor(() => {
        expect(screen.getByText(/miner type is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('successful form submission', () => {
    it('calls onCancel after successful submission', async () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fillValidForm()
      clickSubmit()
      await waitFor(() => expect(onCancel).toHaveBeenCalledOnce())
    })

    it('dispatches setAddPendingSubmissionAction with REGISTER_THING for add flow', async () => {
      renderComponent()
      fillValidForm()
      clickSubmit()
      await waitFor(() => {
        expect(setAddPendingSubmissionAction).toHaveBeenCalledWith(
          expect.objectContaining({ action: ACTION_TYPES.REGISTER_THING }),
        )
      })
    })

    it('calls buildAddReplaceMinerParams on submit', async () => {
      renderComponent()
      fillValidForm()
      clickSubmit()
      await waitFor(() => {
        expect(buildAddReplaceMinerParams).toHaveBeenCalled()
      })
    })

    it('calls notifyInfo after successful submission', async () => {
      renderComponent()
      fillValidForm()
      clickSubmit()
      await waitFor(() => {
        expect(mockNotifyInfo).toHaveBeenCalledWith('Action added', expect.any(String))
      })
    })

    it('resets form after successful submission', async () => {
      renderComponent()
      fillValidForm()
      clickSubmit()
      await waitFor(() => {
        expect(screen.getByLabelText(/serial number/i)).toHaveValue('')
      })
    })
  })

  describe('duplicate detection', () => {
    it('does NOT call onCancel when duplicate detected', async () => {
      const onCancel = vi.fn()
      ;(useMinerDuplicateValidation as ReturnType<typeof vi.fn>).mockReturnValue({
        checkDuplicate: vi.fn().mockResolvedValue(true),
        duplicateError: true,
        isDuplicateCheckLoading: false,
        setDuplicateError: vi.fn(),
      })
      renderComponent({ onCancel })
      fillValidForm()
      clickSubmit()
      await waitFor(() => {
        expect(onCancel).not.toHaveBeenCalled()
      })
    })

    it('shows duplicate error message when duplicate is detected', () => {
      ;(useMinerDuplicateValidation as ReturnType<typeof vi.fn>).mockReturnValue({
        checkDuplicate: vi.fn().mockResolvedValue(true),
        duplicateError: true,
        isDuplicateCheckLoading: false,
        setDuplicateError: vi.fn(),
      })
      renderComponent()
      expect(screen.getByText(/serial number.*mac address/i)).toBeInTheDocument()
    })
  })

  describe('action already exists', () => {
    it('calls notifyError and does not dispatch when action already exists', async () => {
      vi.mocked(isActionExists).mockReturnValue(true)

      renderComponent()
      fillValidForm()

      clickSubmit()

      await waitFor(() => {
        expect(mockNotifyError).toHaveBeenCalledWith('Action already exists', expect.any(String))
      })
      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('static IP assignment', () => {
    beforeEach(() => {
      ;(useStaticMinerIpAssignment as ReturnType<typeof vi.fn>).mockReturnValue({
        isStaticIpAssignment: true,
        minerIp: '192.168.1.100',
      })
    })

    it('renders static IP input when isStaticIpAssignment is true (add flow)', () => {
      renderComponent()
      expect(screen.getByTestId('static-ip-input')).toBeInTheDocument()
    })

    it('does NOT render static IP input when isDirectToMaintenanceMode is true', () => {
      renderComponent({ isDirectToMaintenanceMode: true })
      expect(screen.queryByTestId('static-ip-input')).not.toBeInTheDocument()
    })

    it('does NOT render static IP input in CHANGE_INFO flow when forceSetIp is false', () => {
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO })
      expect(screen.queryByTestId('static-ip-input')).not.toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('disables submit button when isDuplicateCheckLoading is true', () => {
      ;(useMinerDuplicateValidation as ReturnType<typeof vi.fn>).mockReturnValue({
        checkDuplicate: vi.fn().mockResolvedValue(false),
        duplicateError: false,
        isDuplicateCheckLoading: true, // This triggers the loading state
        setDuplicateError: vi.fn(),
      })

      renderComponent()

      const submitBtn = screen.getByRole('button', { name: 'Add Miner' })
      expect(submitBtn).toBeDisabled()
    })
  })
})
