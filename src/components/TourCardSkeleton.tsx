import { Skeleton } from "@/components/ui/skeleton";

const TourCardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl bg-card border border-border">
    <Skeleton className="aspect-square w-full" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <div className="flex items-end justify-between pt-1">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  </div>
);

export default TourCardSkeleton;
