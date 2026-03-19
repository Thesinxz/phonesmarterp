export default function ClientesLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-slate-100 rounded" />
        <div className="h-12 w-32 bg-slate-100 rounded-2xl" />
      </div>
      <div className="h-12 bg-slate-50 rounded-2xl border border-slate-100" />
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="h-12 bg-slate-50 border-b border-slate-100" />
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-50">
            <div className="h-10 w-10 bg-slate-100 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-40 bg-slate-100 rounded" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
            <div className="h-4 w-20 bg-slate-100 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
