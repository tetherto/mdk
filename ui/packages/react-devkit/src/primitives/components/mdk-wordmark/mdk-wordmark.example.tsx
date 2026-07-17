import { MdkWordmark } from './index'

/**
 * Three sizes of the MDK wordmark, tinting to `currentColor`.
 */
export const MdkWordmarkExample = (): React.ReactNode => (
  <div className="mdk-wordmark-example">
    <MdkWordmark size="sm" />
    <MdkWordmark size="md" />
    <MdkWordmark size="lg" />
  </div>
)
