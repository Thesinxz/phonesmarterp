export default function FiscalLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="h-8 w-48 bg-slate-100 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-50 rounded-2xl border border-slate-100" />)}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 h-96" />
    </div>
  )
}
