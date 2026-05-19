import { SkeletonLoader } from "@/components/shared/SkeletonLoader";

export default function MarketLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Dashboard header skeleton */}
      <SkeletonLoader variant="text" count={1} />

      {/* Stats cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonLoader variant="card" count={1} />
        <SkeletonLoader variant="card" count={1} />
        <SkeletonLoader variant="card" count={1} />
        <SkeletonLoader variant="card" count={1} />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonLoader variant="chart" count={1} height="250px" />
        <SkeletonLoader variant="chart" count={1} height="250px" />
      </div>
    </div>
  );
}
