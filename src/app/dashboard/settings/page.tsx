import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, kosher_enabled, default_margin_target, vat_rate')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!restaurant) redirect('/onboarding')

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">הגדרות</h1>
        <p className="text-sm text-gray-400 mt-0.5">ניהול פרטי המסעדה</p>
      </div>

      <SettingsForm
        name={restaurant.name}
        kosherEnabled={restaurant.kosher_enabled}
        defaultMarginPct={Math.round((restaurant.default_margin_target ?? 0.65) * 100)}
        vatPct={Math.round((restaurant.vat_rate ?? 0.17) * 100 * 10) / 10}
      />
    </div>
  )
}
