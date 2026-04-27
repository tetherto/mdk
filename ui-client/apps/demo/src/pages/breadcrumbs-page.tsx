import { Breadcrumbs } from '@mdk/core'

export const BreadcrumbsPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Breadcrumbs</h2>

      <section className="demo-section__breadcrumbs">
        <h3>Basic Breadcrumbs</h3>
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/products' },
            { label: 'Details' },
          ]}
        />
      </section>

      <section className="demo-section__breadcrumbs">
        <h3>With Back Button</h3>
        <Breadcrumbs
          showBack
          onBackClick={() => window.history.back()}
          items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
        />
      </section>

      <section className="demo-section__breadcrumbs">
        <h3>Custom Separator</h3>
        <Breadcrumbs
          separator="›"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Blog', href: '/blog' },
            { label: 'Article' },
          ]}
        />
      </section>

      <section className="demo-section__breadcrumbs">
        <h3>With Click Handlers</h3>
        <Breadcrumbs
          items={[
            { label: 'Home', onClick: () => {} },
            { label: 'Products', onClick: () => {} },
            { label: 'Current Page' },
          ]}
        />
      </section>
    </section>
  )
}
