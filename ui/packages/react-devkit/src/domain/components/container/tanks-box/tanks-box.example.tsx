import { TanksBox } from '@tetherto/mdk-react-devkit'

export const TanksBoxExample = () => (
  <div className="mdk-example-row">
    <TanksBox
      data={{
        oil_pump: [
          { cold_temp_c: 45, enabled: true, color: 'green' },
          { cold_temp_c: 48, enabled: true, color: 'yellow' },
        ],
        water_pump: [{ enabled: true }, { enabled: false }],
        pressure: [{ value: 1.2 }, { value: 1.5 }],
      }}
    />
  </div>
)
