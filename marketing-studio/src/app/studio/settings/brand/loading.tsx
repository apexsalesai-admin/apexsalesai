import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  )
}
