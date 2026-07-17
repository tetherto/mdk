import { ContainerControlsBox } from '@tetherto/mdk-react-devkit'

export const ContainerControlsBoxExample = () => (
  <div className="mdk-example-row">
    <ContainerControlsBox
      onNavigate={(path) => {
        console.warn(`navigate to ${path}`)
      }}
    />
  </div>
)
