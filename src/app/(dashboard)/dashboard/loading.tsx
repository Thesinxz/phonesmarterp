export default function DashboardLoading() {
  return (
    <div className="space-y-3.5 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <div className="h-5 w-24 bg-slate-100 rounded" />
          <div className="h-3 w-48 bg-slate-100 rounded" />
        </div>
        <div className="h-8 w-48 bg-slate-100 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        <div className="lg:col-span-2 h-64 bg-slate-100 rounded-xl" />
        <div className="space-y-2.5">
          <div className="h-32 bg-slate-100 rounded-xl" />
          <div className="h-32 bg-slate-100 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-xl" />)}
      </div>
    </div>
  )
}
