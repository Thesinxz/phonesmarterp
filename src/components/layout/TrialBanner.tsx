'use client'

import { useAuth } from '@/context/AuthContext'
import { AlertCircle, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function TrialBanner() {
  const { isTrialExpired, trialDaysLeft, profile } = useAuth()

  // Only show for starter plan users who are in trial or expired trial
  if (!profile || profile.plano !== 'starter') return null

  if (isTrialExpired) return (
    <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-500">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
          <AlertCircle size={16} />
        </div>
        <div>
          <p className="text-[13px] font-bold text-red-800 leading-tight">
            Seu período de teste encerrou
          </p>
          <p className="text-[11px] text-red-600 font-medium">
            Algumas funcionalidades estão limitadas. Escolha um plano para continuar com acesso total.
          </p>
        </div>
      </div>
      <Link 
        href="/planos"
        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-all shadow-sm active:scale-95 flex items-center gap-1.5 group"
      >
        Regularizar Agora
        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  )

  if (trialDaysLeft <= 3) return (
    <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-500">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
          <Clock size={16} />
        </div>
        <div>
          <p className="text-[13px] font-bold text-indigo-800 leading-tight">
            Seu trial expira em {trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'}
          </p>
          <p className="text-[11px] text-indigo-600 font-medium">
            Não perca o acesso às ferramentas premium. Aproveite as ofertas de hoje!
          </p>
        </div>
      </div>
      <Link 
        href="/planos"
        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-all shadow-sm active:scale-95 flex items-center gap-1.5 group"
      >
        Ver Ofertas
        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  )

  return null
}
