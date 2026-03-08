import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-96 rounded-lg" />
    </div>
  )
}
