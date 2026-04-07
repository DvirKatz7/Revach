'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createRestaurant(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const name = formData.get('name') as string
  const kosher_enabled = formData.get('kosher_enabled') === 'true'
  const default_margin_target = Number(formData.get('default_margin_target')) / 100

  const { error } = await supabase.from('restaurants').insert({
    owner_id: user.id,
    name,
    kosher_enabled,
    default_margin_target,
    vat_rate: 0.17,
    currency: 'ILS',
  })

  if (error) throw new Error(error.message)

  redirect('/dashboard')
}
