export default function TecnicosLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-slate-100 rounded" />
        <div className="flex gap-2">
            <div className="h-10 w-32 bg-slate-100 rounded-xl" />
            <div className="h-10 w-32 bg-slate-100 rounded-xl" />
        </div>
      </div>
      <div className="h-24 bg-slate-50 rounded-2xl border border-slate-100 max-w-xs" />
      <div className="h-10 w-full max-w-md bg-slate-100 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-slate-50 rounded-2xl border border-slate-100" />)}
      </div>
    </div>
  )
}
