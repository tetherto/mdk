/**
 * Runnable example for Loader.
 */
import { Loader } from '@tetherto/mdk-react-devkit'

export const LoaderExample = () => (
  <div className="mdk-example-col">
    <div className="mdk-example-row">
      <Loader />
      <Loader color="blue" />
      <Loader color="gray" />
    </div>

    <div className="mdk-example-row">
      <Loader count={3} size={8} color="orange" />
      <Loader count={5} size={10} color="amber" />
      <Loader count={7} size={12} color="red" />
    </div>
  </div>
)
