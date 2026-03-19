export default function ClientesLoading() {
  return (
    <div className="space-y-6 page-enter pb-12">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-40 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-4 w-72 bg-slate-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="h-10 w-36 bg-slate-100 rounded-2xl animate-pulse" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm mt-8">
        <div className="h-14 bg-slate-50 border-b border-slate-100 flex items-center px-6 gap-8">
           {[1, 2, 3, 4, 5].map(i => (
             <div key={i} className="h-4 w-32 bg-slate-200/50 rounded animate-pulse" />
           ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
          <div key={i} className="h-16 border-b border-slate-50 flex items-center gap-8 px-6">
            <div className="h-10 w-10 bg-slate-100 rounded-full animate-pulse" />
            <div className="flex-1">
               <div className="h-4 w-56 bg-slate-100 rounded animate-pulse" />
               <div className="h-3 w-40 bg-slate-50 rounded animate-pulse mt-1" />
            </div>
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
            <div className="h-9 w-9 bg-slate-50 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
