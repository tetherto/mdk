/**
 * Runnable example for Mosaic.
 */
import { Mosaic } from '@tetherto/mdk-react-devkit'

export const MosaicExample = () => (
  <div className="mdk-example-col">
    <Mosaic
      template={['header header', 'sidebar content', 'footer footer']}
      gap="8px"
      rowHeight="auto"
    >
      <Mosaic.Item
        area="header"
        className="mdk-example-inline"
        style={{ background: 'var(--mdk-color-bg-card)', padding: '8px', borderRadius: '4px' }}
      >
        Header
      </Mosaic.Item>
      <Mosaic.Item
        area="sidebar"
        className="mdk-example-inline"
        style={{ background: 'var(--mdk-color-bg-card)', padding: '8px', borderRadius: '4px' }}
      >
        Sidebar
      </Mosaic.Item>
      <Mosaic.Item
        area="content"
        className="mdk-example-inline"
        style={{ background: 'var(--mdk-color-bg-card)', padding: '8px', borderRadius: '4px' }}
      >
        Content
      </Mosaic.Item>
      <Mosaic.Item
        area="footer"
        className="mdk-example-inline"
        style={{ background: 'var(--mdk-color-bg-card)', padding: '8px', borderRadius: '4px' }}
      >
        Footer
      </Mosaic.Item>
    </Mosaic>
  </div>
)
