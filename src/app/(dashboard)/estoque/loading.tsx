export default function EstoqueLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-slate-100 rounded" />
        <div className="h-12 w-32 bg-slate-100 rounded-2xl" />
      </div>
      <div className="flex gap-3">
        <div className="h-11 flex-1 bg-slate-100 rounded-xl" />
        <div className="h-11 w-36 bg-slate-100 rounded-xl" />
        <div className="h-11 w-36 bg-slate-100 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="h-24 bg-slate-100 rounded-xl" />
            <div className="h-4 w-3/4 bg-slate-100 rounded" />
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
