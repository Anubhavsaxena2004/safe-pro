export default function JobLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading job">
      <div className="card space-y-3">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-6 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-4 w-2/5" />
        <div className="skeleton h-12" />
      </div>
      <div className="card space-y-3">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-5 w-1/2" />
        <div className="skeleton h-4 w-4/5" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-12" />
          <div className="skeleton h-12" />
        </div>
      </div>
    </div>
  );
}
