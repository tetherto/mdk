import { createIcon } from './create-icon'

export const ScaleControlIcon = createIcon({
  displayName: 'ScaleControlIcon',
  viewBox: '0 0 9 5',
  defaultWidth: 9,
  defaultHeight: 5,
  path: ({ color }) => (
    <path
      fill={color}
      d="M8.25922 3.46099 4.56122.440986l-.298-.2425-.2965.245L.259216 3.50349l.5965.695 3.707004-3.061-.5935.001 3.697 3.02.593-.6975Z"
    />
  ),
})
