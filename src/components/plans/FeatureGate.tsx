'use client'

import { useFeatureGate } from '@/hooks/useFeatureGate'
import { Feature } from '@/lib/plans/features'
import { UpgradeBanner } from './UpgradeBanner'

interface FeatureGateProps {
  feature: Feature
  children: React.ReactNode
  featureName: string        // nome legível: "Notas Fiscais"
  description?: string
}

export function FeatureGate({ feature, children, featureName, description }: FeatureGateProps) {
  const { hasAccess, isPlanBlocking, requiredPlanName } = useFeatureGate(feature)

  // Acesso total (trial ativo ou plano suficiente)
  if (hasAccess) return <>{children}</>

  // Plano insuficiente após trial:
  // Mostrar a página com overlay/banner — usuário VÊ mas não interage
  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* Conteúdo visível mas bloqueado */}
      <div className="pointer-events-none select-none opacity-40 blur-[2px] max-h-[600px] overflow-hidden grayscale">
        {children}
      </div>

      {/* Banner de upgrade centralizado sobre o conteúdo */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-50/60 backdrop-blur-[1px] rounded-3xl z-50 p-4">
        <UpgradeBanner
          feature={featureName}
          requiredPlan={requiredPlanName}
          description={description}
        />
      </div>
    </div>
  )
}
