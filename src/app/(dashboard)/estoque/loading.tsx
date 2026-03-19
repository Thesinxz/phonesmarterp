export default function EstoqueLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-10">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-slate-100 rounded" />
        <div className="h-12 w-32 bg-slate-100 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
      </div>
      <div className="h-14 bg-slate-50 rounded-2xl" />
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="h-12 bg-slate-50 border-b border-slate-100" />
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-50">
            <div className="h-4 w-12 bg-slate-100 rounded" />
            <div className="h-4 w-64 bg-slate-100 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
