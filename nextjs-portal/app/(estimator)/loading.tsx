import { SkeletonLoader } from "@/components/shared/SkeletonLoader";

export default function EstimatorLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Form skeleton */}
      <div className="space-y-4">
        <SkeletonLoader variant="text" count={1} />
        <SkeletonLoader variant="card" count={1} height="280px" />
      </div>

      {/* Results table skeleton */}
      <SkeletonLoader variant="table-row" count={5} />
    </div>
  );
}
