import type { JSX } from 'react'

import type { MovementDeviceView } from './build-movement-details-view-model'

type DeviceDetailsProps = {
  device: MovementDeviceView
}

export const DeviceDetails = ({ device }: DeviceDetailsProps): JSX.Element => (
  <div className="mdk-movement-details-modal__device">
    <div className="mdk-movement-details-modal__attribute">
      <span className="mdk-movement-details-modal__attribute-name">Code: </span>
      <span className="mdk-movement-details-modal__attribute-value">{device.code}</span>
    </div>
    <div className="mdk-movement-details-modal__attribute">
      <span className="mdk-movement-details-modal__attribute-name">Model: </span>
      <span className="mdk-movement-details-modal__attribute-value">{device.model}</span>
    </div>
    {device.attributes.map((attribute) => (
      <div key={attribute.label} className="mdk-movement-details-modal__attribute">
        <span className="mdk-movement-details-modal__attribute-name">{attribute.label}: </span>
        <span className="mdk-movement-details-modal__attribute-value">{attribute.value}</span>
      </div>
    ))}
  </div>
)

DeviceDetails.displayName = 'DeviceDetails'
