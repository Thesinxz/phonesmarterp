export default function RelatoriosLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="h-8 w-48 bg-slate-100 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl border border-slate-50 shadow-sm" />)}
      </div>
    </div>
  )
}
