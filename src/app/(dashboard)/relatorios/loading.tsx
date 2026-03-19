export default function RelatoriosLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="h-7 w-36 bg-slate-100 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl" />)}
      </div>
    </div>
  )
}
