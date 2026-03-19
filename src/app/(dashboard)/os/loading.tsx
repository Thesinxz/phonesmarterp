export default function OSLoading() {
  const STAGES = ['Abertas','Em Trânsito','Em Análise','Aguardando Peça','Em Execução','Finalizadas','Canceladas']
  return (
    <div className="space-y-6 animate-pulse pb-10">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <div className="h-7 w-48 bg-slate-100 rounded" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        <div className="h-12 w-28 bg-slate-100 rounded-2xl" />
      </div>
      <div className="h-14 bg-slate-50 rounded-3xl border border-slate-100" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {STAGES.slice(0, 4).map(s => (
          <div key={s} className="flex flex-col gap-3">
            <div className="h-4 w-24 bg-slate-100 rounded px-1" />
            <div className="bg-slate-50/40 rounded-[2rem] p-2 border border-slate-100 min-h-[300px]">
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-3 border border-slate-100">
                    <div className="h-3 w-3/4 bg-slate-100 rounded mb-2" />
                    <div className="h-3 w-1/2 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
