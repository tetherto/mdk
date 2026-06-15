import { Socket } from '@tetherto/mdk-react-devkit'

export const SocketExample = () => (
  <div className="mdk-example-row">
    <Socket socket={1} enabled={true} power_w={3250} current_a={14.5} />
    <Socket socket={2} enabled={false} />
  </div>
)
