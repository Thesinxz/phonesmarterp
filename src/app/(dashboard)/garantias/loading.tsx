export default function GarantiasLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="flex justify-between items-center">
        <div className="h-7 w-32 bg-slate-100 rounded" />
      </div>
      <div className="flex gap-2">
        {[1,2,3,4].map(i => <div key={i} className="h-9 w-28 bg-slate-100 rounded-xl" />)}
      </div>
      <div className="space-y-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-4">
            <div className="h-10 w-10 bg-slate-100 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-slate-100 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
