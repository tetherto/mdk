# BitdeerSettings

Settings tab for a Bitdeer container. Renders vendor-specific parameter display (MAC, serial number) and editable threshold forms for oil temperature and tank pressure monitoring, with colour-coded alerts and sound-alert configuration.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `UnknownRecord` | no | `{}` | Container settings payload from the API. |

## Minimal example

```tsx
import { BitdeerSettings } from "@tetherto/mdk-react-devkit";

<BitdeerSettings data={containerSettings} />
```
