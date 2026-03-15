"use client";

import { useAuth } from '@/context/AuthContext';
import { hasFeature, Feature, getPlanForFeature, PLAN_NAMES, Plan } from '@/lib/plans/features';

export function useFeatureGate(feature: Feature) {
  const { profile, isTrialExpired, activeAddons } = useAuth();
  const plan = (profile?.plano ?? 'starter') as Plan;

  // Durante trial: acesso total
  // Após trial: verifica plano
  const hasAccess = !isTrialExpired || hasFeature(plan, feature, activeAddons);

  const requiredPlan = getPlanForFeature(feature);
  // const isTrialBlocking = false; // Trial nunca bloqueia por decisão de produto
  const isPlanBlocking = isTrialExpired && !hasFeature(plan, feature, activeAddons);

  return {
    hasAccess,
    isPlanBlocking,
    plan,
    requiredPlan,
    requiredPlanName: PLAN_NAMES[requiredPlan],
    isTrialExpired,
    upgrade: () => window.location.href = '/planos',
  };
}
