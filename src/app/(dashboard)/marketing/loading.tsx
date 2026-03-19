export default function MarketingLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="h-7 w-32 bg-slate-100 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
      </div>
      <div className="space-y-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-16 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
