/**
 * Runnable example for Breadcrumbs.
 */
import { Breadcrumbs } from '@tetherto/mdk-react-devkit'

export const BreadcrumbsExample = () => (
  <Breadcrumbs
    showBack
    onBackClick={() => undefined}
    items={[
      { label: 'Dashboard', href: '/' },
      { label: 'Devices', onClick: () => undefined },
      { label: 'Miner #42' },
    ]}
  />
)
