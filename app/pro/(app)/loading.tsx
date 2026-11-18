export default function ProLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-7 w-48" />
      </div>
      <div className="skeleton h-20" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
      </div>
      <div className="skeleton h-28" />
      <div className="skeleton h-28" />
    </div>
  );
}
