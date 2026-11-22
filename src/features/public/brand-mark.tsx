export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`}>
      DoRoboty<span>.ai</span>
    </span>
  );
}
