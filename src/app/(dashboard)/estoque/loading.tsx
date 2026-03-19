export default function EstoqueLoading() {
  return (
    <div className="space-y-6 page-enter pb-12">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-56 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-4 w-80 bg-slate-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-10 w-40 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
             <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
             <div className="h-8 w-20 bg-slate-50 rounded animate-pulse mt-4" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="h-16 bg-slate-50 border-b border-slate-100 flex items-center px-6 gap-6">
           {[1, 2, 3, 4, 5, 6].map(i => (
             <div key={i} className="h-4 w-28 bg-slate-200/50 rounded animate-pulse" />
           ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
          <div key={i} className="h-20 border-b border-slate-50 flex items-center gap-6 px-6">
            <div className="h-10 w-10 bg-slate-100 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-40 bg-slate-50 rounded animate-pulse mt-2" />
            </div>
            <div className="h-5 w-16 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-5 w-24 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-10 w-10 bg-slate-50 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
