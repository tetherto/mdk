import {
  HeaderConsumptionBox,
  HeaderEfficiencyBox,
  HeaderHashrateBox,
  HeaderMinersBox,
  HeaderStatsBar,
} from '@tetherto/mdk-react-devkit/domain'
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
      description="App-side and pool-side numbers populated end-to-end."
    >
      <HeaderStatsBar>
        <HeaderMinersBox
          total={2188}
          online={158}
          error={1}
          offline={57}
          appTotal={216}
          poolTotal={205}
          poolOnline={201}
          poolMismatch={4}
        />
        <HeaderHashrateBox appPhs={63.262} poolPhs={52.687} />
        <HeaderConsumptionBox valueMw={1.663} />
        <HeaderEfficiencyBox valueWthS={26.29} />
      </HeaderStatsBar>
    </DemoBlock>

    <DemoBlock
      title="Loading — all numbers undefined"
      description="Each box renders an em-dash fallback when its value is missing. A site that has pools passes showPool so the pool row holds its space during the initial fetch instead of appearing when the query resolves."
    >
      <HeaderStatsBar>
        <HeaderMinersBox showPool />
        <HeaderHashrateBox showPool />
        <HeaderConsumptionBox />
        <HeaderEfficiencyBox />
      </HeaderStatsBar>
    </DemoBlock>

    <DemoBlock
      title="Site with no pool"
      description="No pool-side props passed, so the pool row is dropped rather than reading Pool —. The miners box keeps its app-side online / total ratio."
    >
      <HeaderStatsBar>
        <HeaderMinersBox total={2188} online={158} error={1} offline={57} appTotal={216} />
        <HeaderHashrateBox appPhs={63.262} />
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
        <HeaderHashrateBox appPhs={63.262} poolPhs={52.687} />
      </HeaderStatsBar>
      <HeaderStatsBar>
        <HeaderConsumptionBox valueMw={1.663} />
        <HeaderEfficiencyBox valueWthS={26.29} />
      </HeaderStatsBar>
    </DemoBlock>
  </section>
)
