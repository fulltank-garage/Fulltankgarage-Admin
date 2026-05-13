type LoadingSkeletonBlockProps = {
  className?: string
}

export function LoadingSkeletonBlock({
  className = '',
}: LoadingSkeletonBlockProps) {
  return (
    <span
      aria-hidden="true"
      className={`block skeleton-shimmer ${className}`}
    />
  )
}
