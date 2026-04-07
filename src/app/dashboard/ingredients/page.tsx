import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IngredientsClient from './IngredientsClient'

export default async function IngredientsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, kosher_enabled')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!restaurant) redirect('/onboarding')

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('name_he')

  const list = ingredients ?? []

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <IngredientsClient
        ingredients={list}
        restaurantId={restaurant.id}
        kosherEnabled={restaurant.kosher_enabled}
        needsSeed={list.length === 0}
      />
    </div>
  )
}
