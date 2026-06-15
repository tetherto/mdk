import { ClockIcon } from '@radix-ui/react-icons'
import { AppHeader, Button, MdkWordmark, SignOutIcon } from '@tetherto/mdk-react-devkit/core'
import {
  AlarmsBellButton,
  HeaderConsumptionBox,
  HeaderEfficiencyBox,
  HeaderHashrateBox,
  HeaderMinersBox,
  HeaderStatsBar,
  ProfileMenu,
} from '@tetherto/mdk-react-devkit/foundation'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'
import { useDemoToast } from '../utils/use-demo-toast'

export const AppHeaderPage = (): JSX.Element => {
  const { showToast, ToasterSlot } = useDemoToast()

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="App Header"
        description="Top-bar shell with four slots: logo, start, middle (stats), and actions. Owns no domain — consumers compose any content into the slots."
      />

      <DemoBlock
        title="Full dashboard composition"
        description="Brand wordmark on the left, the Mining OS stats strip in the middle, action tiles on the right. This is exactly how the live mdk-ui-shell App.tsx wires its header."
      >
        <AppHeader
          sticky={false}
          logo={<MdkWordmark size="md" />}
          actions={
            <>
              <AlarmsBellButton counts={{ critical: 12, high: 23, medium: 4 }} />
              <ProfileMenu
                user={
                  <>
                    <span className="mdk-profile-menu__user-email">you@example.com</span>
                    <span className="mdk-profile-menu__user-role">Admin</span>
                  </>
                }
                items={[
                  {
                    label: 'Change Timezone',
                    icon: <ClockIcon />,
                    description: 'Current: Europe/Podgorica',
                    onSelect: () => showToast('Open timezone picker'),
                  },
                  {
                    label: 'Sign Out',
                    icon: <SignOutIcon />,
                    danger: true,
                    onSelect: () => showToast('Signed out', { variant: 'success' }),
                  },
                ]}
              />
            </>
          }
        >
          <HeaderStatsBar>
            <HeaderMinersBox
              total={2806}
              online={602}
              error={43}
              offline={204}
              mosTotal={216}
              poolTotal={205}
              poolOnline={334}
              poolMismatch={64}
            />
            <HeaderHashrateBox mosPhs={78.275} poolPhs={78.275} />
            <HeaderConsumptionBox valueMw={22.489} />
            <HeaderEfficiencyBox valueWthS={34.52} />
          </HeaderStatsBar>
        </AppHeader>
      </DemoBlock>

      <DemoBlock
        title="Logo + actions only"
        description="When the middle slot is empty, the wordmark and actions sit at the bar's ends."
      >
        <AppHeader
          sticky={false}
          logo={<MdkWordmark size="md" />}
          actions={
            <>
              <Button variant="secondary">Help</Button>
              <Button variant="primary">New</Button>
            </>
          }
        />
      </DemoBlock>

      <DemoBlock
        title="Middle slot only"
        description="The logo, start, and actions slots are all optional — when omitted, the middle takes the full width."
      >
        <AppHeader sticky={false}>
          <span>Plain top bar</span>
        </AppHeader>
      </DemoBlock>

      <ToasterSlot />
    </section>
  )
}
