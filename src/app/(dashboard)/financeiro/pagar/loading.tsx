export default function FinanceiroLoading() {
  return (
    <div className="space-y-6 page-enter pb-12">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-60 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-4 w-80 bg-slate-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="h-10 w-40 bg-slate-100 rounded-2xl animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
             <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
             <div className="h-8 w-24 bg-slate-50 rounded animate-pulse mt-4" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm mt-4">
        <div className="h-14 bg-slate-50 border-b border-slate-100 flex items-center px-6 gap-6">
           {[1, 2, 3, 4, 5, 6].map(i => (
             <div key={i} className="h-4 w-24 bg-slate-200/50 rounded animate-pulse" />
           ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="h-16 border-b border-slate-50 flex items-center gap-6 px-6">
            <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
            <div className="flex-1">
               <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
               <div className="h-3 w-32 bg-slate-50 rounded animate-pulse mt-1" />
            </div>
            <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
            <div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse" />
            <div className="h-9 w-9 bg-slate-50 rounded-lg animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
