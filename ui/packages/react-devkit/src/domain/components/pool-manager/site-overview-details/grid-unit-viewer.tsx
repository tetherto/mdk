import type { ComponentProps, ReactNode } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'

export type GridUnitViewerProps = ComponentProps<typeof TransformWrapper> & {
  wrapperClass?: string
  contentClass?: string
  children?: ReactNode
}

// Engine-bound leaf for GridUnit. Isolated in its own module so the
// react-zoom-pan-pinch runtime (~808K installed) is code-split into a lazy
// chunk and only loaded when the rack viewer actually renders (see `grid-unit.tsx`).
const GridUnitViewer = ({
  wrapperClass,
  contentClass,
  children,
  ...wrapper
}: GridUnitViewerProps): React.JSX.Element => (
  <TransformWrapper {...wrapper}>
    <TransformComponent wrapperClass={wrapperClass} contentClass={contentClass}>
      {children}
    </TransformComponent>
  </TransformWrapper>
)
GridUnitViewer.displayName = 'GridUnitViewer'

export default GridUnitViewer
