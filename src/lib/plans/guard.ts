import { createClient } from '@/lib/supabase/server'
import { hasFeature, Feature, Plan } from './features'

/**
 * Proteção de Server Actions baseada em plano
 * Lança erro se a empresa não tiver acesso à feature solicitada
 */
export async function requireFeature(feature: Feature): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado')
  }

  // Buscar perfil para verificar plano e trial
  const { data: profile } = await supabase
    .from('usuarios')
    .select('plano, trial_end')
    .eq('auth_user_id', user.id)
    .single() as { data: any }

  if (!profile) {
    throw new Error('Perfil não encontrado')
  }

  const isTrialExpired = profile.trial_end
    ? new Date(profile.trial_end) < new Date()
    : false

  // Regra central: Durante trial o acesso é TOTAL
  if (!isTrialExpired) {
    return
  }

  // Após trial: verificar se o plano possui a feature
  const plan = (profile.plano ?? 'starter') as Plan
  
  if (!hasFeature(plan, feature)) {
    throw new Error(`A funcionalidade "${feature}" requer um plano superior. Seu plano atual é o ${plan}.`)
  }
}
