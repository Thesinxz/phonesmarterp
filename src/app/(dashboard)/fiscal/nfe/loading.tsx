export default function NFeLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="h-7 w-28 bg-slate-100 rounded" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl" />)}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="h-12 bg-slate-50 border-b border-slate-100" />
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-50">
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-4 w-32 bg-slate-100 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
