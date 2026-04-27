import { Loader, Typography } from '@mdk/core'

export const LoaderPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Loader</h2>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '2rem',
        }}
      >
        <div className="demo-item" style={{ display: 'flex' }}>
          <p className="demo-label">Default Loader</p>
          <Loader />
        </div>

        <div className="demo-item">
          <p className="demo-label">Size Variants</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Loader size={6} />
            <Loader size={10} />
            <Loader size={14} />
            <Loader size={20} />
          </div>
        </div>

        <div className="demo-item">
          <p className="demo-label">Count Variants</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Loader count={3} />
            <Loader count={5} />
            <Loader count={7} />
          </div>
        </div>

        <div className="demo-item">
          <Typography className="demo-label">Color Variants</Typography>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Loader color="orange" />
            <Loader color="red" />
            <Loader color="gray" />
            <Loader color="blue" />
          </div>
        </div>
      </div>
    </section>
  )
}
