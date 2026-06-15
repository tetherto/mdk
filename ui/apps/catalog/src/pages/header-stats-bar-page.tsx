import {
  HeaderConsumptionBox,
  HeaderEfficiencyBox,
  HeaderHashrateBox,
  HeaderMinersBox,
  HeaderStatsBar,
} from '@tetherto/mdk-react-devkit/foundation'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

export const HeaderStatsBarPage = (): JSX.Element => (
  <section className="demo-section">
    <DemoPageHeader
      title="Header Stats Bar"
      description="Four-box dashboard strip rendered in the middle slot of <AppHeader>. Compose any of HeaderMinersBox, HeaderHashrateBox, HeaderConsumptionBox, HeaderEfficiencyBox."
    />

    <DemoBlock
      title="Typical site snapshot"
      description="MOS-side and pool-side numbers populated end-to-end."
    >
      <HeaderStatsBar>
        <HeaderMinersBox
          total={2188}
          online={158}
          error={1}
          offline={57}
          mosTotal={216}
          poolTotal={205}
          poolOnline={201}
          poolMismatch={4}
        />
        <HeaderHashrateBox mosPhs={63.262} poolPhs={52.687} />
        <HeaderConsumptionBox valueMw={1.663} />
        <HeaderEfficiencyBox valueWthS={26.29} />
      </HeaderStatsBar>
    </DemoBlock>

    <DemoBlock
      title="Loading — all numbers undefined"
      description="Each box renders an em-dash fallback when its value is missing, so the strip keeps its silhouette during initial fetch."
    >
      <HeaderStatsBar>
        <HeaderMinersBox />
        <HeaderHashrateBox />
        <HeaderConsumptionBox />
        <HeaderEfficiencyBox />
      </HeaderStatsBar>
    </DemoBlock>

    <DemoBlock
      title="Partial data"
      description="Some pool-side counts not yet available — fallback only fires for the missing fields."
    >
      <HeaderStatsBar>
        <HeaderMinersBox total={2188} online={158} error={1} offline={57} mosTotal={216} />
        <HeaderHashrateBox mosPhs={63.262} />
        <HeaderConsumptionBox valueMw={1.663} />
        <HeaderEfficiencyBox valueWthS={26.29} />
      </HeaderStatsBar>
    </DemoBlock>

    <DemoBlock
      title="Boxes in isolation"
      description="Each box also renders standalone — useful when you only need one of the metrics on a sub-page."
    >
      <HeaderStatsBar>
        <HeaderMinersBox total={2188} online={158} error={1} offline={57} />
      </HeaderStatsBar>
      <HeaderStatsBar>
        <HeaderHashrateBox mosPhs={63.262} poolPhs={52.687} />
      </HeaderStatsBar>
      <HeaderStatsBar>
        <HeaderConsumptionBox valueMw={1.663} />
        <HeaderEfficiencyBox valueWthS={26.29} />
      </HeaderStatsBar>
    </DemoBlock>
  </section>
)
