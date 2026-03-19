export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="h-7 w-48 bg-slate-100 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-slate-50 rounded-2xl border border-slate-100" />
        <div className="h-96 bg-slate-50 rounded-2xl border border-slate-100" />
      </div>
    </div>
  )
}
