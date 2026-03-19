export default function DashboardLoading() {
  return (
    <div className="space-y-6 page-enter pb-12">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-slate-100 rounded-2xl animate-pulse" />
        <div>
           <div className="h-8 w-48 bg-slate-100 rounded-xl animate-pulse" />
           <div className="h-4 w-64 bg-slate-50 rounded-lg animate-pulse mt-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
             <div className="flex justify-between items-start">
                <div className="h-4 w-24 bg-slate-50 rounded animate-pulse" />
                <div className="h-8 w-8 bg-slate-50 rounded-lg animate-pulse" />
             </div>
             <div className="h-8 w-32 bg-slate-100 rounded-lg animate-pulse mt-4" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-[400px] bg-white rounded-3xl border border-slate-100 p-6 shadow-sm animate-pulse">
           <div className="h-6 w-40 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-[400px] bg-white rounded-3xl border border-slate-100 p-6 shadow-sm animate-pulse">
           <div className="h-6 w-40 bg-slate-100 rounded-lg" />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm animate-pulse">
        <div className="h-6 w-56 bg-slate-100 rounded-lg mb-6" />
        <div className="space-y-4">
           {[1, 2, 3, 4].map(i => (
             <div key={i} className="h-16 bg-slate-50 rounded-2xl" />
           ))}
        </div>
      </div>
    </div>
  );
}
