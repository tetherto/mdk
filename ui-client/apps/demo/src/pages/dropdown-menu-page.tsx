import {
  AlertsNavIcon,
  DashboardNavIcon,
  DropdownMenu,
  SettingsNavIcon,
  UserAvatarIcon,
} from '@mdk/core'

const SEARCH_ITEMS_SM = [
  { label: 'Option 1' },
  { label: 'Option 2', disabled: true },
  { label: 'Option 3' },
  { label: 'Option 4', active: true },
]
const SEARCH_ITEMS_MD = [
  { label: 'Dashboard' },
  { label: 'Analytics', disabled: true },
  { label: 'Reports' },
  { label: 'Settings', active: true },
]
const SEARCH_ITEMS_LG = [
  { label: 'Dashboard' },
  { label: 'Analytics', disabled: true },
  { label: 'Reports' },
  { label: 'Settings', active: true },
]

export const DropdownMenuPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Dropdown Menu</h2>

      <h3 style={{ marginBottom: '1rem' }}>Basic</h3>
      <div className="demo-section__select-grid">
        <section>
          <h3>Small - Basic</h3>
          <DropdownMenu.StaticContent size="sm">
            <DropdownMenu.StaticItem>Item 1</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem disabled>Item 2</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem>Item 3</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem active>Item 4</DropdownMenu.StaticItem>
          </DropdownMenu.StaticContent>
        </section>

        <section>
          <h3>Medium - Basic</h3>
          <DropdownMenu.StaticContent size="md">
            <DropdownMenu.StaticItem>Item 1</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem disabled>Item 2</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem>Item 3</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem active>Item 4</DropdownMenu.StaticItem>
          </DropdownMenu.StaticContent>
        </section>

        <section>
          <h3>Large - Basic</h3>
          <DropdownMenu.StaticContent size="lg">
            <DropdownMenu.StaticItem>Item 1</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem disabled>Item 2</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem>Item 3</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem active>Item 4</DropdownMenu.StaticItem>
          </DropdownMenu.StaticContent>
        </section>
      </div>

      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>With Icons</h3>
      <div className="demo-section__select-grid">
        <section>
          <h3>Small - With Icons</h3>
          <DropdownMenu.StaticContent size="sm">
            <DropdownMenu.StaticItem icon={<DashboardNavIcon />}>Home</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem icon={<SettingsNavIcon />} disabled>
              Files
            </DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem icon={<AlertsNavIcon />}>Settings</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem icon={<UserAvatarIcon />} active>
              Profile
            </DropdownMenu.StaticItem>
          </DropdownMenu.StaticContent>
        </section>

        <section>
          <h3>Medium - With Icons</h3>
          <DropdownMenu.StaticContent size="md">
            <DropdownMenu.StaticItem icon={<DashboardNavIcon />}>Dashboard</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem icon={<SettingsNavIcon />} disabled>
              Explorer
            </DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem icon={<AlertsNavIcon />}>Alerts</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem icon={<UserAvatarIcon />} active>
              Settings
            </DropdownMenu.StaticItem>
          </DropdownMenu.StaticContent>
        </section>

        <section>
          <h3>Large - With Icons</h3>
          <DropdownMenu.StaticContent size="lg">
            <DropdownMenu.StaticItem icon={<DashboardNavIcon />}>Dashboard</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem icon={<SettingsNavIcon />} disabled>
              Explorer
            </DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem icon={<AlertsNavIcon />}>Container</DropdownMenu.StaticItem>
            <DropdownMenu.StaticItem icon={<UserAvatarIcon />} active>
              Settings
            </DropdownMenu.StaticItem>
          </DropdownMenu.StaticContent>
        </section>
      </div>

      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>With Search</h3>
      <div className="demo-section__select-grid">
        <section>
          <h3>Small - With Search</h3>
          <DropdownMenu.StaticContent size="sm">
            <DropdownMenu.Searchable items={SEARCH_ITEMS_SM} placeholder="Search" />
          </DropdownMenu.StaticContent>
        </section>

        <section>
          <h3>Medium - With Search</h3>
          <DropdownMenu.StaticContent size="md">
            <DropdownMenu.Searchable items={SEARCH_ITEMS_MD} placeholder="Search" />
          </DropdownMenu.StaticContent>
        </section>

        <section>
          <h3>Large - With Search</h3>
          <DropdownMenu.StaticContent size="lg">
            <DropdownMenu.Searchable items={SEARCH_ITEMS_LG} placeholder="Search" />
          </DropdownMenu.StaticContent>
        </section>
      </div>

      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Multiple Select</h3>
      <div className="demo-section__select-grid">
        <section>
          <h3>Small - Multiple Select</h3>
          <DropdownMenu.StaticContent size="sm">
            <DropdownMenu.StaticCheckboxItem checked>Home</DropdownMenu.StaticCheckboxItem>
            <DropdownMenu.StaticCheckboxItem disabled>Files</DropdownMenu.StaticCheckboxItem>
            <DropdownMenu.StaticCheckboxItem>Settings</DropdownMenu.StaticCheckboxItem>
            <DropdownMenu.StaticCheckboxItem checked active>
              Profile
            </DropdownMenu.StaticCheckboxItem>
          </DropdownMenu.StaticContent>
        </section>

        <section>
          <h3>Medium - Multiple Select</h3>
          <DropdownMenu.StaticContent size="md">
            <DropdownMenu.StaticCheckboxItem checked>Dashboard</DropdownMenu.StaticCheckboxItem>
            <DropdownMenu.StaticCheckboxItem disabled>Explorer</DropdownMenu.StaticCheckboxItem>
            <DropdownMenu.StaticCheckboxItem>Alerts</DropdownMenu.StaticCheckboxItem>
            <DropdownMenu.StaticCheckboxItem checked active>
              Settings
            </DropdownMenu.StaticCheckboxItem>
          </DropdownMenu.StaticContent>
        </section>

        <section>
          <h3>Large - Multiple Select</h3>
          <DropdownMenu.StaticContent size="lg">
            <DropdownMenu.StaticCheckboxItem checked>Dashboard</DropdownMenu.StaticCheckboxItem>
            <DropdownMenu.StaticCheckboxItem disabled>Explorer</DropdownMenu.StaticCheckboxItem>
            <DropdownMenu.StaticCheckboxItem>Container</DropdownMenu.StaticCheckboxItem>
            <DropdownMenu.StaticCheckboxItem checked active>
              Settings
            </DropdownMenu.StaticCheckboxItem>
          </DropdownMenu.StaticContent>
        </section>
      </div>
    </section>
  )
}
