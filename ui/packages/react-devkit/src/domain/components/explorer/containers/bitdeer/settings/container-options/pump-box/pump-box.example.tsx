import { PumpBox } from '@tetherto/mdk-react-devkit'

export const PumpBoxExample = () => (
  <div className="mdk-example-row">
    <PumpBox pumpTitle="Circulation" pumpItem={{ enabled: true, index: 0 }} />
    <PumpBox pumpTitle="Circulation" pumpItem={{ enabled: false, index: 1 }} />
  </div>
)
