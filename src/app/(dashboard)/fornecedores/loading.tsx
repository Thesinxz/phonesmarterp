export default function FornecedoresLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="flex justify-between items-center">
        <div className="h-8 w-36 bg-slate-100 rounded" />
        <div className="h-12 w-36 bg-slate-100 rounded-2xl" />
      </div>
      <div className="h-12 bg-slate-50 rounded-2xl border border-slate-100" />
      <div className="space-y-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
            <div className="h-12 w-12 bg-slate-100 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-slate-100 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
            <div className="h-8 w-20 bg-slate-100 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
