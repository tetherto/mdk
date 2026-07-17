import { CURRENCY, UNITS } from '../../constants/units'

export const DEFAULT = {
  height: 200, // in pixels
  title: 'Operations vs Energy Cost',
  unit: `${CURRENCY.USD}/${UNITS.ENERGY_MWH}`,
}

export const CONFIG = {
  cutout: '75%',
  borderWidth: 6, // in pixels
}
