import { TagFilterBar } from '@tetherto/mdk-react-devkit'

export const TagFilterBarExample = () => (
  <div className="mdk-example-row">
    <TagFilterBar
      filterTags={[]}
      localFilters={{} as never}
      onSearchTagsChange={(tags) => console.warn('tags', tags)}
      onLocalFiltersChange={(f) => console.warn('filters', f)}
    />
  </div>
)
