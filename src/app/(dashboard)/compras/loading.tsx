export default function ComprasLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-slate-100 rounded" />
        <div className="flex gap-2">
            <div className="h-10 w-32 bg-slate-100 rounded-xl" />
            <div className="h-10 w-32 bg-slate-100 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="h-12 bg-slate-50 border-b border-slate-100" />
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-50">
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-4 w-48 bg-slate-100 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
