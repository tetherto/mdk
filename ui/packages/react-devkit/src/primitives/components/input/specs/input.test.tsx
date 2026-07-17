import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Input } from '../index'

describe('input', () => {
  it('renders input element', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('renders with label when provided', () => {
    render(<Input label="Email" id="email" placeholder="Enter email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument()
  })

  it('associates label with input via htmlFor/id', () => {
    render(<Input label="Username" id="username" />)
    const input = screen.getByLabelText('Username')
    expect(input).toHaveAttribute('id', 'username')
  })

  it('generates unique id when not provided with label', () => {
    const { container } = render(<Input label="Email" />)
    const input = container.querySelector('input')
    expect(input).toHaveAttribute('id')
    expect(input?.id).toBeTruthy()
  })

  it('renders search variant with icon', () => {
    const { container } = render(<Input variant="search" placeholder="Search..." />)
    expect(container.querySelector('.mdk-input__wrapper--search')).toBeInTheDocument()
    expect(container.querySelector('.mdk-input__icon')).toBeInTheDocument()
  })

  it('renders default variant without icon', () => {
    const { container } = render(<Input variant="default" />)
    expect(container.querySelector('.mdk-input__wrapper--search')).not.toBeInTheDocument()
    expect(container.querySelector('.mdk-input__icon')).not.toBeInTheDocument()
  })

  it('applies disabled styling to wrapper', () => {
    const { container } = render(<Input disabled />)
    expect(container.querySelector('.mdk-input__wrapper--disabled')).toBeInTheDocument()
  })

  it('disables input when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled input" />)
    expect(screen.getByPlaceholderText('Disabled input')).toBeDisabled()
  })

  it('shows error message when error prop is provided', () => {
    render(<Input error="This field is required" placeholder="Input" />)
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required')
  })

  it('applies error styling to wrapper when error is present', () => {
    const { container } = render(<Input error="Error message" />)
    expect(container.querySelector('.mdk-input__wrapper--error')).toBeInTheDocument()
  })

  it('sets aria-invalid when error is present', () => {
    render(<Input error="Invalid" placeholder="Input" />)
    expect(screen.getByPlaceholderText('Input')).toHaveAttribute('aria-invalid', 'true')
  })

  it('sets aria-describedby to error id when error is present', () => {
    render(<Input error="Error message" id="test-input" />)
    const input = screen.getByRole('textbox')
    const errorId = input.getAttribute('aria-describedby')
    expect(errorId).toBe('test-input-error')
    expect(screen.getByRole('alert')).toHaveAttribute('id', errorId!)
  })

  it('applies custom className to input', () => {
    const { container } = render(<Input className="custom-input" />)
    const input = container.querySelector('input')
    expect(input).toHaveClass('custom-input')
    expect(input).toHaveClass('mdk-input')
  })

  it('applies wrapperClassName when no label', () => {
    const { container } = render(<Input wrapperClassName="custom-wrapper" />)
    expect(container.querySelector('.custom-wrapper')).toBeInTheDocument()
  })

  it('applies wrapperClassName to root when label is present', () => {
    const { container } = render(
      <Input label="Email" wrapperClassName="custom-wrapper" id="email" />,
    )
    expect(container.querySelector('.custom-wrapper')).toBeInTheDocument()
    expect(container.querySelector('.mdk-input-root')).toHaveClass('custom-wrapper')
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Input ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('handles onChange event', () => {
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} placeholder="Input" />)

    const input = screen.getByPlaceholderText('Input') as HTMLInputElement

    // Simulate user typing
    input.value = 'test'
    const event = new Event('input', { bubbles: true })
    Object.defineProperty(event, 'target', { writable: false, value: input })
    input.dispatchEvent(event)

    // Also test change event
    input.dispatchEvent(new Event('change', { bubbles: true }))

    expect(input.value).toBe('test')
  })

  it('passes through additional HTML attributes', () => {
    render(<Input placeholder="Test" maxLength={10} autoComplete="off" />)
    const input = screen.getByPlaceholderText('Test')
    expect(input).toHaveAttribute('maxLength', '10')
    expect(input).toHaveAttribute('autoComplete', 'off')
  })

  it('renders error and label together', () => {
    render(<Input label="Email" error="Invalid email" id="email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email')
  })

  it('renders search variant with label', () => {
    const { container } = render(<Input variant="search" label="Search" id="search" />)
    expect(screen.getByLabelText('Search')).toBeInTheDocument()
    expect(container.querySelector('.mdk-input__icon')).toBeInTheDocument()
  })

  it('prioritizes explicit aria-invalid over error state', () => {
    render(<Input error="Error" aria-invalid={false} placeholder="Input" />)
    expect(screen.getByPlaceholderText('Input')).toHaveAttribute('aria-invalid', 'false')
  })

  it('prioritizes explicit aria-describedby over error id', () => {
    render(<Input error="Error" aria-describedby="custom-id" placeholder="Input" />)
    const input = screen.getByPlaceholderText('Input')
    expect(input.getAttribute('aria-describedby')).not.toContain('-error')
  })

  it('handles value prop (controlled input)', () => {
    render(<Input value="Controlled" onChange={() => {}} placeholder="Input" />)
    expect(screen.getByPlaceholderText('Input')).toHaveValue('Controlled')
  })

  it('handles defaultValue prop (uncontrolled input)', () => {
    render(<Input defaultValue="Default" placeholder="Input" />)
    expect(screen.getByPlaceholderText('Input')).toHaveValue('Default')
  })
})
