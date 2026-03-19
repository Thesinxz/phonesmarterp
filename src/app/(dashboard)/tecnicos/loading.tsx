export default function TecnicosLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="flex justify-between items-center">
        <div className="h-7 w-28 bg-slate-100 rounded" />
        <div className="h-11 w-32 bg-slate-100 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-slate-100 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-slate-100 rounded" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3].map(j => <div key={j} className="h-12 bg-slate-100 rounded-xl" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
