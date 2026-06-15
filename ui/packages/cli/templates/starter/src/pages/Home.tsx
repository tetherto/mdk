import './Home.scss'

export default function Home() {
  return (
    <div className="home-page">
      <section className="home-page__hero">
        <span className="home-page__eyebrow">Mining Development Kit</span>
        <h1 className="home-page__title">
          Welcome to your <span className="home-page__title-accent">MDK</span> app.
        </h1>
        <p className="home-page__subtitle">
          Scaffolded with <code>mdk-ui create</code>. Extend it by running{' '}
          <code>npx mdk-ui add page &lt;Name&gt; --component &lt;Component&gt;</code> — the CLI
          handles file creation, routing and navigation for you.
        </p>
        <div className="home-page__actions">
          <a
            className="home-page__button home-page__button--primary"
            href="https://github.com/tetherto/mdk"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
          </a>
          <a
            className="home-page__button home-page__button--ghost"
            href="https://github.com/tetherto/mdk/tree/main/ui-client/docs"
            target="_blank"
            rel="noreferrer"
          >
            Read the docs
          </a>
        </div>
      </section>

      <section className="home-page__cards">
        <article className="home-page__card">
          <div className="home-page__card-icon">{'>_'}</div>
          <h3 className="home-page__card-title">Add a page</h3>
          <p className="home-page__card-body">
            <code>npx mdk-ui add page Hashrate --component LineChartCard</code> scaffolds a new page
            and wires it into the router automatically.
          </p>
        </article>
        <article className="home-page__card">
          <div className="home-page__card-icon">{'{}'}</div>
          <h3 className="home-page__card-title">Discover components</h3>
          <p className="home-page__card-body">
            <code>npx mdk-ui registry</code> and <code>npx mdk-ui find</code> let agents and humans
            browse the curated MDK component surface.
          </p>
        </article>
        <article className="home-page__card">
          <div className="home-page__card-icon">{'~/'}</div>
          <h3 className="home-page__card-title">Agent-first</h3>
          <p className="home-page__card-body">
            <code>.mdk/context.md</code> and <code>.cursor/rules/mdk.mdc</code> are already in place
            so AI agents know how to extend this app safely.
          </p>
        </article>
      </section>
    </div>
  )
}
