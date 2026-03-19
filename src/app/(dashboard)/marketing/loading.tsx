export default function MarketingLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="h-8 w-48 bg-slate-100 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-slate-100 rounded-2xl border border-slate-50 shadow-sm" />)}
      </div>
    </div>
  )
}
