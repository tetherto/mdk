import { createIcon } from './create-icon'

export const ProfitArrowIcon = createIcon({
  displayName: 'ProfitArrowIcon',
  viewBox: '0 0 17 21',
  defaultWidth: 17,
  defaultHeight: 21,
  path: ({ color }) => (
    <>
      <g clipPath="url(#profit-arrow-clip-0)">
        <path
          fill={color}
          d="M12.6066 12.799h-2.3727v1.9948h5.7032V9.38064h-2.0036v1.91566L9.0564 6.7092 5.74346 9.82002l-4.1214-3.86656L.259979 7.41221 5.74346 12.5618 9.0564 9.45973l3.5502 3.33927Z"
        />
      </g>
      <defs>
        <clipPath id="profit-arrow-clip-0">
          <path fill="#fff" d="M.259979 20.4h15.98V.4h-15.98z" />
        </clipPath>
      </defs>
    </>
  ),
})
