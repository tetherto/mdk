import { createIcon } from './create-icon'

export const SettingsNavIcon = createIcon({
  displayName: 'SettingsNavIcon',
  viewBox: '0 0 18 18',
  defaultWidth: 18,
  defaultHeight: 18,
  path: ({ color }) => (
    <>
      <path
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="m7.444 2-.086.437-.329 1.598a5.52 5.52 0 0 0-1.434.823l-1.608-.537-.432-.134-.224.385-1.107 1.851L2 6.81l.328.287 1.244 1.058c-.045.277-.103.55-.103.841 0 .291.058.565.103.842l-1.244 1.058-.328.287.224.386 1.107 1.85.224.387.432-.135 1.608-.537c.431.338.908.622 1.434.823l.329 1.598.086.437h3.111l.087-.437.328-1.598a5.524 5.524 0 0 0 1.434-.823l1.608.537.432.135.225-.386 1.106-1.851.225-.386-.329-.287-1.244-1.058c.046-.277.103-.55.103-.842 0-.29-.057-.564-.103-.841l1.244-1.058.329-.287-.225-.386-1.106-1.85-.225-.386-.432.133-1.608.538a5.52 5.52 0 0 0-1.434-.823l-.328-1.598L10.555 2H7.444Z"
        clipRule="evenodd"
      />
      <path
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M11 8.995a2 2 0 0 1-4 0 2 2 0 0 1 4 0Z"
        clipRule="evenodd"
      />
    </>
  ),
})
