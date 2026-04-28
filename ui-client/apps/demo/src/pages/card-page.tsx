import { Button, Card, Typography } from '@tetherto/core'

export const CardPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Card</h2>
      <div className="demo-section__card-grid">
        <Card className="demo-section__card-grid__card demo-section__card-grid__card--wide">
          <Card.Header>Bitdeer 4a A1346</Card.Header>
          <Card.Body>
            <div className="demo-section__card-grid__body-text">
              <Typography variant="body" className="demo-section__card-grid__body-text__row">
                Efficiency 202.57 W/TH/S
              </Typography>
              <Typography variant="body" className="demo-section__card-grid__body-text__row">
                Hash Rate 3.59 PH/s
              </Typography>
              <Typography variant="body" className="demo-section__card-grid__body-text__row">
                Max Temp 36 °C
              </Typography>
            </div>
          </Card.Body>
          <Card.Footer>
            <Button variant="secondary">View Details</Button>
          </Card.Footer>
        </Card>
        <Card className="demo-section__card-grid__card demo-section__card-grid__card--narrow">
          <Card.Header>Container Status</Card.Header>
          <Typography variant="body" className="demo-section__card-grid__paragraph">
            Default children go to body when not wrapped in Card.Body.
          </Typography>
        </Card>
        <Card className="demo-section__card-grid__card demo-section__card-grid__card--narrow">
          <Card.Body>
            <Typography variant="body" className="demo-section__card-grid__paragraph">
              Card with body only – no header or footer.
            </Typography>
          </Card.Body>
        </Card>
      </div>
    </section>
  )
}
