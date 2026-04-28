import { TanksBox } from '@tetherto/mdk-foundation-ui'

export const TanksBoxPage = (): JSX.Element => (
  <section className="demo-section">
    <h2 className="demo-section__title">Tanks Box</h2>
    <p className="demo-section__description">
      Displays tank rows with temperature, pressure, and oil/water pump status for immersion cooling
      containers.
    </p>
    <div
      style={{
        display: 'grid',
        gap: '2rem',
        gridTemplateColumns: '1fr',
        maxWidth: '900px',
      }}
    >
      <section>
        <h3>Basic (single tank, temperature only)</h3>
        <TanksBox
          data={{
            oil_pump: [{ cold_temp_c: 42, enabled: true }],
            water_pump: [{ enabled: true }],
            pressure: [{}],
          }}
        />
      </section>

      <section>
        <h3>With pressure</h3>
        <TanksBox
          data={{
            oil_pump: [{ cold_temp_c: 45, enabled: true }],
            water_pump: [{ enabled: true }],
            pressure: [{ value: 1.2 }],
          }}
        />
      </section>

      <section>
        <h3>Multiple tanks</h3>
        <TanksBox
          data={{
            oil_pump: [
              { cold_temp_c: 42, enabled: true },
              { cold_temp_c: 44, enabled: true },
              { cold_temp_c: 41, enabled: false },
            ],
            water_pump: [{ enabled: true }, { enabled: false }, { enabled: true }],
            pressure: [{ value: 1.1 }, { value: 1.3 }, {}],
          }}
        />
      </section>

      <section>
        <h3>With colors (normal / warning / fault)</h3>
        <TanksBox
          data={{
            oil_pump: [
              { cold_temp_c: 38, enabled: true, color: '#34c759' },
              { cold_temp_c: 52, enabled: true, color: '#ffc107' },
              { cold_temp_c: 68, enabled: true, color: '#ff3b30' },
            ],
            water_pump: [{ enabled: true }, { enabled: true }, { enabled: true }],
            pressure: [
              { value: 1.0, color: '#34c759' },
              { value: 1.5, color: '#ffc107' },
              { value: 2.1, color: '#ff3b30' },
            ],
          }}
        />
      </section>

      <section>
        <h3>With flash (alert state)</h3>
        <TanksBox
          data={{
            oil_pump: [
              { cold_temp_c: 42, enabled: true },
              { cold_temp_c: 78, enabled: true, flash: true },
              { cold_temp_c: 41, enabled: false },
            ],
            water_pump: [{ enabled: true }, { enabled: true }, { enabled: false }],
            pressure: [{ value: 1.0 }, { value: 2.5, flash: true }, {}],
          }}
        />
      </section>

      <section>
        <h3>With custom tooltips</h3>
        <TanksBox
          data={{
            oil_pump: [
              { cold_temp_c: 42, enabled: true, tooltip: 'Within normal range' },
              {
                cold_temp_c: 55,
                enabled: true,
                tooltip: 'Approaching threshold – consider cooling',
              },
            ],
            water_pump: [{ enabled: true }, { enabled: true }],
            pressure: [{ value: 1.2 }, { value: 1.4, tooltip: 'Pressure slightly elevated' }],
          }}
        />
      </section>

      <section>
        <h3>Mixed pump states</h3>
        <TanksBox
          data={{
            oil_pump: [
              { cold_temp_c: 43, enabled: true },
              { cold_temp_c: 44, enabled: false },
              { cold_temp_c: 42, enabled: true },
            ],
            water_pump: [{ enabled: false }, { enabled: true }, { enabled: false }],
            pressure: [{ value: 1.1 }, { value: 1.2 }, { value: 1.0 }],
          }}
        />
      </section>

      <section>
        <h3>Empty tanks (no rows)</h3>
        <TanksBox
          data={{
            oil_pump: [],
            water_pump: [],
            pressure: [],
          }}
        />
      </section>

      <section>
        <h3>No data (renders nothing)</h3>
        <div style={{ color: 'var(--muted-foreground)', fontSize: '14px' }}>
          When <code>data</code> is null or undefined, TanksBox returns null.
        </div>
        <TanksBox />
        <em>Nothing rendered</em>
      </section>
    </div>
  </section>
)
