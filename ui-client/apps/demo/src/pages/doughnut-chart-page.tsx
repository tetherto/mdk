import { DoughnutChartExample } from '../examples/doughnut-chart-example'

export const DoughnutChartPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Doughnut Chart</h2>
      <p className="demo-section__description">
        Doughnut chart with header card, custom legend, and toggleable slices.
      </p>
      <DoughnutChartExample />
    </section>
  )
}
