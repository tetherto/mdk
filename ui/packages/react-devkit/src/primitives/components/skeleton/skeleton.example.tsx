/**
 * Runnable example for SkeletonBlock.
 */
import { SkeletonBlock } from '@tetherto/mdk-react-devkit'

export const SkeletonExample = () => (
  <div className="mdk-example-col">
    {/* Text lines */}
    <SkeletonBlock width={320} height={16} borderRadius={4} />
    <SkeletonBlock width={240} height={16} borderRadius={4} />
    <SkeletonBlock width={280} height={16} borderRadius={4} />

    {/* Avatar + text row */}
    <div className="mdk-example-inline">
      <SkeletonBlock circle height={40} />
      <div className="mdk-example-col">
        <SkeletonBlock width={160} height={14} borderRadius={4} />
        <SkeletonBlock width={120} height={12} borderRadius={4} />
      </div>
    </div>

    {/* Card placeholder */}
    <SkeletonBlock width="100%" height={80} borderRadius={8} />
  </div>
)
