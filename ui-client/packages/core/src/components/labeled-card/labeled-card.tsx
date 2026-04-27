import * as React from 'react'
import _isString from 'lodash/isString'
import _includes from 'lodash/includes'
import _get from 'lodash/get'
import _compact from 'lodash/compact'

import { cn } from '../../utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'

export type LabeledCardNavigateOptions = Partial<{
  href: string
  target: string
}>

export type LabeledCardProps = Partial<{
  isDark: boolean
  className: string
  hasNoWrap: boolean
  isRelative: boolean
  isFullWidth: boolean
  hasNoMargin: boolean
  hasNoBorder: boolean
  isFullHeight: boolean
  isScrollable: boolean
  label: React.ReactNode
  children: React.ReactNode
  getNavigateOptions: (label: string) => LabeledCardNavigateOptions
}>

const BASE_CLASS = 'mdk-labeled-card'

export const LabeledCard = React.forwardRef<HTMLDivElement, LabeledCardProps>((props, ref) => {
  const {
    label,
    isDark,
    children,
    className,
    hasNoWrap,
    isRelative,
    hasNoBorder,
    hasNoMargin,
    isFullWidth,
    isFullHeight,
    isScrollable,
    getNavigateOptions,
  } = props

  const labelText = _isString(label) ? label : ''
  const navOptions = getNavigateOptions?.(labelText)

  const containerClasses = cn(
    BASE_CLASS,
    _compact([
      isFullWidth && `${BASE_CLASS}--full-width`,
      isFullHeight && `${BASE_CLASS}--full-height`,
      isDark && `${BASE_CLASS}--dark`,
      hasNoWrap && `${BASE_CLASS}--no-wrap`,
      hasNoMargin && `${BASE_CLASS}--no-margin`,
      hasNoBorder && `${BASE_CLASS}--no-border`,
      isScrollable && `${BASE_CLASS}--scrollable`,
      isRelative && `${BASE_CLASS}--relative`,
    ]),
    className,
  )

  const hasErrorTooltip = _isString(label) && _includes(label, 'Miners with error')

  const titleElement = <div className={`${BASE_CLASS}__title`}>{label}</div>

  const titleWithTooltip = hasErrorTooltip ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{titleElement}</TooltipTrigger>
        <TooltipContent>
          This does not include minor errors not affecting the miner's hash rate
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    titleElement
  )

  const href = _get(navOptions, 'href')
  const target = _get(navOptions, 'target')

  const content = href ? (
    <a href={href} target={target} className={`${BASE_CLASS}__link`}>
      {titleWithTooltip}
    </a>
  ) : (
    titleWithTooltip
  )

  return (
    <div ref={ref} className={containerClasses}>
      <div className={`${BASE_CLASS}__header`}>{content}</div>
      <div className={`${BASE_CLASS}__body`}>{children}</div>
    </div>
  )
})

LabeledCard.displayName = 'LabeledCard'
