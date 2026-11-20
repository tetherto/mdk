import { Spinner } from '@tetherto/mdk-react-devkit/primitives'

import type { JSX } from 'react'

export const SpinnerPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Spinner</h2>
      <div className="demo-section__showcase demo-section__showcase--between">
        <div className="demo-item">
          <p className="demo-label">Basic Spinner (slow)</p>
          <div className="demo-section__spinner-row">
            <Spinner speed="slow" />
            <Spinner speed="slow" type="circle" />
          </div>
        </div>

        <div className="demo-item">
          <p className="demo-label">With Label</p>
          <div className="demo-section__spinner-row">
            <Spinner speed="slow" label="Loading data..." />
            <Spinner speed="slow" color="secondary" type="circle" label="Loading data..." />
          </div>
        </div>

        <div className="demo-item">
          <p className="demo-label">Size Variants</p>
          <div className="demo-section__spinner-row demo-section__spinner-row--wide">
            <Spinner size="sm" />
            <Spinner size="sm" type="circle" />
            <Spinner size="md" />
            <Spinner size="md" type="circle" />
            <Spinner size="lg" />
            <Spinner size="lg" type="circle" />
          </div>
        </div>

        <div className="demo-item">
          <p className="demo-label">Speed Variants</p>
          <div className="demo-section__spinner-row demo-section__spinner-row--wide">
            <div className="text-center">
              <Spinner speed="slow" />
              <p className="text-sm text-gray-400 mt-2">Slow</p>
            </div>
            <div className="text-center">
              <Spinner speed="normal" />
              <p className="text-sm text-gray-400 mt-2">Normal</p>
            </div>
            <div className="text-center">
              <Spinner speed="fast" />
              <p className="text-sm text-gray-400 mt-2">Fast</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
