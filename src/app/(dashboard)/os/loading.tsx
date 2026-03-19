export default function OSLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-slate-100 rounded" />
        <div className="h-10 w-32 bg-slate-100 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 h-[600px]" />
    </div>
  )
}
