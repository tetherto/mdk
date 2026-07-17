import type { JSX } from 'react'

import { DemoBlock } from '../../components/demo-block'
import { DemoPageHeader } from '../../components/demo-page-header'

const CODE_INSTALL = `npm install \\
  @tetherto/mdk-react-devkit \\
  @tetherto/mdk-react-adapter \\
  @tetherto/mdk-ui-foundation`

const CODE_PROVIDER = `// main.tsx
import { MdkProvider } from '@tetherto/mdk-react-adapter'
import '@tetherto/mdk-react-devkit/styles.css'
// Only needed if you use mining-domain (foundation) components.
// Skip it for a core-primitives-only app to ship ~70 KB less CSS.
import '@tetherto/mdk-react-devkit/styles-domain.css'

ReactDOM.createRoot(rootElement).render(
  <MdkProvider apiBaseUrl="https://gateway.example.com">
    <App />
  </MdkProvider>,
)`

const CODE_HOOKS = `import { useActions, useAuth, useDevices } from '@tetherto/mdk-react-adapter'

const Toolbar = () => {
  const { permissions } = useAuth()
  const { selectedDevices } = useDevices()
  const { setAddPendingSubmissionAction } = useActions()
  // ...
}`

const CODE_STORE_DIRECT = `import { actionsStore, devicesStore } from '@tetherto/mdk-ui-foundation'

// Outside React (utilities, sagas, etc.) you can read/write directly:
devicesStore.getState().setSelectedDevices([])
actionsStore.getState().setAddPendingSubmissionAction({ /* … */ })`

const CODE_THEMING = `/* app.css — imported AFTER @tetherto/mdk-react-devkit/styles.css */
:root {
  --mdk-color-primary: #5b8cff;
  --mdk-radius: 6px;
}

@layer app {
  .mdk-button--variant-primary { letter-spacing: 0.04em; }
}`

export const GettingStartedPage = (): JSX.Element => {
  return (
    <div>
      <DemoPageHeader
        title="Getting Started"
        description="Three packages, one provider, zero Redux. This page walks through the
          minimum integration of the MDK UI toolkit into a React application."
      />

      <DemoBlock
        title="Package map"
        description="The toolkit is split into three publishable packages. Only @tetherto/mdk-ui-foundation is framework-agnostic — the adapter and devkit are React-specific. A future React Native or Web Components binding would sit beside mdk-react-adapter and reuse the same headless core."
      >
        <ul>
          <li>
            <code>@tetherto/mdk-ui-foundation</code> — headless state (Zustand vanilla stores), a TanStack
            QueryClient factory, telemetry primitives and the command state machine. No React.
          </li>
          <li>
            <code>@tetherto/mdk-react-adapter</code> — React bindings:
            <code> &lt;MdkProvider&gt;</code>, store hooks (<code>useAuth</code>,{' '}
            <code>useDevices</code>, <code>useNotifications</code>, <code>useTimezone</code>,{' '}
            <code>useActions</code>) and re-exports of <code>useQuery</code> /{' '}
            <code>useMutation</code>.
          </li>
          <li>
            <code>@tetherto/mdk-react-devkit</code> — the React UI library: <code>./core</code>{' '}
            primitives and <code>./foundation</code> mining-domain components, hooks and styles.
          </li>
        </ul>
      </DemoBlock>

      <DemoBlock title="Install">
        <pre>
          <code>{CODE_INSTALL}</code>
        </pre>
      </DemoBlock>

      <DemoBlock
        title="Wrap your app in MdkProvider"
        description="MdkProvider sets up the TanStack QueryClient and the API base URL context. It is required for the foundation hooks/components to work."
      >
        <pre>
          <code>{CODE_PROVIDER}</code>
        </pre>
      </DemoBlock>

      <DemoBlock
        title="Use the adapter hooks inside React"
        description="Each hook subscribes the component to the relevant Zustand store and re-renders only when the selected slice changes."
      >
        <pre>
          <code>{CODE_HOOKS}</code>
        </pre>
      </DemoBlock>

      <DemoBlock
        title="Or read / write stores directly outside React"
        description="The vanilla stores expose getState()/setState() so utility code, side-effect handlers and tests can interact with the same source of truth."
      >
        <pre>
          <code>{CODE_STORE_DIRECT}</code>
        </pre>
      </DemoBlock>

      <DemoBlock
        title="Theme via design tokens and @layer mdk"
        description="The compiled stylesheet declares @layer base, mdk, app — so unlayered or @layer app styles in your application always win against devkit component styles."
      >
        <pre>
          <code>{CODE_THEMING}</code>
        </pre>
        <p>
          See <strong>Theming</strong> for a live demo and the <code>docs/STYLING.md</code> guide
          for the full reference.
        </p>
      </DemoBlock>
    </div>
  )
}
