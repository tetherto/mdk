import { ClockIcon } from '@radix-ui/react-icons'
import { SignOutIcon } from '@tetherto/mdk-react-devkit/core'
import { ProfileMenu } from '@tetherto/mdk-react-devkit/foundation'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'
import { useDemoToast } from '../utils/use-demo-toast'

export const ProfileMenuPage = (): JSX.Element => {
  const { showToast, ToasterSlot } = useDemoToast()

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Profile Menu"
        description="Top-bar profile dropdown. Wraps the core DropdownMenu primitive with the user-avatar icon; items are caller-provided so the surface stays application-driven."
      />

      <DemoBlock
        title="Single sign-out item (default shape)"
        description="The simplest contract — one destructive action."
      >
        <ProfileMenu
          items={[
            {
              label: 'Sign Out',
              icon: <SignOutIcon />,
              danger: true,
              onSelect: () => showToast('Signed out', { variant: 'success' }),
            },
          ]}
        />
      </DemoBlock>

      <DemoBlock
        title="Moria-style structure"
        description="Avatar + email/role on top, divider, Change Timezone with description line, Sign Out with exit icon."
      >
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
      </DemoBlock>

      <ToasterSlot />
    </section>
  )
}
