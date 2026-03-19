export default function OSLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-10">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <div className="h-7 w-48 bg-slate-100 rounded" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        <div className="h-12 w-32 bg-slate-100 rounded-2xl" />
      </div>
      <div className="h-14 bg-slate-50 rounded-3xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-[400px] bg-slate-50 rounded-3xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
