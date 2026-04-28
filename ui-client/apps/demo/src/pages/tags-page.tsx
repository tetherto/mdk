import { Tag } from '@tetherto/core'

export const TagsPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Tags</h2>
      <div className="demo-section__tags">
        <Tag color="green">Active</Tag>
        <Tag color="amber">Pending</Tag>
        <Tag color="red">Inactive</Tag>
        <Tag color="blue">Processing</Tag>
        <Tag color="dark">Draft</Tag>
      </div>
    </section>
  )
}
