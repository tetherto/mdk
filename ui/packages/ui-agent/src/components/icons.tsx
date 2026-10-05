/**
 * The glyphs the Co-pilot needs that the devkit icon set does not carry.
 *
 * Built with the devkit's `createIcon` factory so they take the same `size` /
 * `color` props and inherit `currentColor` like every other icon in the system.
 */

import { createIcon } from '@tetherto/mdk-react-devkit/primitives'

/**
 * The launcher glyph: a round speech bubble whose tail points to the
 * bottom-right corner.
 *
 * Geometry fitted to the design's 22×22 `Chat` instance rather than eyeballed —
 * the ring fills the box (center 11, r 10.2) and the tail is a wedge between two
 * points on the arc, tipped at the corner. Drawn as a single arc-plus-wedge path
 * so the stroke stays continuous through the join.
 *
 * Rendered at 48px against the Figma export this matches ~98% of pixels; the
 * residue is the hollow Figma leaves between the bubble's underside and the
 * tail, which is below one pixel at this size.
 */
export const ChatIcon = createIcon({
  displayName: 'ChatIcon',
  viewBox: '0 0 22 22',
  defaultWidth: 22,
  defaultHeight: 22,
  path: ({ color }) => (
    <path
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      d="M19.83 16.1A10.2 10.2 0 1 0 14.15 20.7L21 21Z"
    />
  ),
})

export const SendIcon = createIcon({
  displayName: 'SendIcon',
  viewBox: '0 0 18 18',
  defaultWidth: 18,
  defaultHeight: 18,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      d="M16.5 1.5 8.25 9.75M16.5 1.5l-5.25 15-3-6.75-6.75-3 15-5.25Z"
    />
  ),
})

/**
 * New conversation: a square-cornered message box with a center-bottom tail and
 * a plus inside.
 *
 * Squared off, not rounded — the design's box runs the full 16px width with hard
 * corners, and the tail drops from the middle of the bottom edge rather than
 * from a corner.
 */
export const MessagePlusIcon = createIcon({
  displayName: 'MessagePlusIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <g stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1">
      <path d="M0.75 0.75H15.25V12.05H9.1L7.6 15.1L6.1 12.05H0.75Z" />
      <path d="M7.6 4.2V9.2M5.1 6.7H10.1" />
    </g>
  ),
})

/**
 * Conversations: two squares, each with a rule to its right — a list whose
 * bullets are boxes, not the plain stack of lines this originally drew.
 */
export const ListLayoutIcon = createIcon({
  displayName: 'ListLayoutIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <g stroke={color} fill="none" strokeLinecap="square" strokeWidth="1.1">
      <path d="M0.55 1.55H4.45V5.45H0.55Z" />
      <path d="M0.55 10.55H4.45V14.45H0.55Z" />
      <path d="M7.1 3.5H15.45M7.1 12.5H15.45" />
    </g>
  ),
})

export const CloseIcon = createIcon({
  displayName: 'CloseIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeWidth="1.2"
      d="M4.6 4.6 11.4 11.4M11.4 4.6 4.6 11.4"
    />
  ),
})

export const InfoIcon = createIcon({
  displayName: 'InfoIcon',
  viewBox: '0 0 12 12',
  defaultWidth: 12,
  defaultHeight: 12,
  path: ({ color }) => (
    <g stroke={color} fill="none" strokeLinecap="round" strokeWidth="1.1">
      <circle cx="6" cy="6" r="5" />
      <path d="M6 5.2v3.1M6 3.6h.005" />
    </g>
  ),
})

export const TrashIcon = createIcon({
  displayName: 'TrashIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <g stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1">
      <path d="M2.5 4.2h11M6.2 4.2V2.6h3.6v1.6" />
      <path d="M3.9 4.2 4.6 13.4h6.8l0.7-9.2" />
      <path d="M6.6 6.8v4M9.4 6.8v4" />
    </g>
  ),
})

export const BackIcon = createIcon({
  displayName: 'BackIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
      d="M10 3 5 8l5 5"
    />
  ),
})

/** The filled square a running turn is stopped with, matching the send button's box. */
export const StopIcon = createIcon({
  displayName: 'StopIcon',
  viewBox: '0 0 18 18',
  defaultWidth: 18,
  defaultHeight: 18,
  path: ({ color }) => <rect x="4" y="4" width="10" height="10" rx="1" fill={color} stroke="none" />,
})

export const TickIcon = createIcon({
  displayName: 'TickIcon',
  viewBox: '0 0 12 12',
  defaultWidth: 12,
  defaultHeight: 12,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="m2 6.4 2.6 2.6L10 3.5"
    />
  ),
})

export const WarningIcon = createIcon({
  displayName: 'WarningIcon',
  viewBox: '0 0 12 12',
  defaultWidth: 12,
  defaultHeight: 12,
  path: ({ color }) => (
    <g stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3">
      <path d="M6 1.5 11 10.5H1L6 1.5Z" />
      <path d="M6 5v2.2M6 9h.005" />
    </g>
  ),
})
