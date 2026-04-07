'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateSettings(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name            = (formData.get('name') as string).trim()
  const kosher_enabled  = formData.get('kosher_enabled') === 'true'
  const default_margin_target = Number(formData.get('default_margin_target')) / 100
  const vat_rate        = Number(formData.get('vat_rate')) / 100

  const { error } = await supabase
    .from('restaurants')
    .update({ name, kosher_enabled, default_margin_target, vat_rate })
    .eq('owner_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
