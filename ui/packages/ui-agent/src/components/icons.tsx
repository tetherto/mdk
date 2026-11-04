/**
 * The glyphs the Co-pilot needs that the devkit icon set does not carry.
 *
 * Built with the devkit's `createIcon` factory so they take the same `size` /
 * `color` props and inherit `currentColor` like every other icon in the system.
 */

import { createIcon } from '@tetherto/mdk-react-devkit/primitives'

/**
 * The header set shares one grid.
 *
 * `size` only scales the `svg` box — it says nothing about how much of that box
 * the drawing fills. The header renders New conversation, Conversations and
 * Close side by side at 16px, so a glyph that inks less of its viewBox than its
 * neighbour reads as a smaller icon however equal the `size` props are. That is
 * what shipped: Close spanned 6.8 of its 16px box against New conversation's
 * 14.5, with stroke widths of 1.1, 1.2 and 1.4 between them.
 *
 * So every header glyph is drawn on a 16×16 viewBox, inked inside the same
 * 14px live area — 1 to 15 on both axes — at {@link GLYPH_STROKE}. A chevron
 * cannot fill a square, so BackIcon matches on height and centres on width;
 * everything else fills the area outright.
 */
const GLYPH_STROKE = '1.2'

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
 * Squared off, not rounded — the design's box has hard corners, and the tail
 * drops from the middle of the bottom edge rather than from a corner. Scaled to
 * the shared live area: box 1 → 15 across, tail tip on the baseline at y 15.
 */
export const MessagePlusIcon = createIcon({
  displayName: 'MessagePlusIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <g
      stroke={color}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={GLYPH_STROKE}
    >
      <path d="M1 1H15V11.9H9L8 15L7 11.9H1Z" />
      <path d="M8 4V8.9M5.55 6.45H10.45" />
    </g>
  ),
})

/**
 * Conversations: two squares, each with a rule to its right — a list whose
 * bullets are boxes, not the plain stack of lines this originally drew.
 *
 * The rules sit on each square's centre line, and the pair spans the full live
 * area top to bottom so the glyph weighs the same as its neighbours.
 */
export const ListLayoutIcon = createIcon({
  displayName: 'ListLayoutIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <g
      stroke={color}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={GLYPH_STROKE}
    >
      <path d="M1 1H4.9V4.9H1Z" />
      <path d="M1 11.1H4.9V15H1Z" />
      <path d="M7.2 2.95H15M7.2 13.05H15" />
    </g>
  ),
})

/** Close: the live area's two diagonals, corner to corner. */
export const CloseIcon = createIcon({
  displayName: 'CloseIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <path
      stroke={color}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={GLYPH_STROKE}
      d="M1 1 15 15M15 1 1 15"
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

/**
 * Back: a 45° chevron, full live-area height.
 *
 * A chevron cannot fill a square, so this matches the set on height (1 → 15)
 * and centres its 7px width rather than stretching to meet the edges.
 */
export const BackIcon = createIcon({
  displayName: 'BackIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <path
      stroke={color}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={GLYPH_STROKE}
      d="M11.5 1 4.5 8l7 7"
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
