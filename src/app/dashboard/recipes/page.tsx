import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RecipesList from './RecipesList'

export type RecipeRow = {
  id: string
  name_he: string
  category: string | null
  selling_price: number | null
  portions: number
  target_margin_pct: number
  recipe_ingredients: Array<{
    quantity: number
    ingredients: { cost_per_unit: number } | null
  }>
}

export default async function RecipesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!restaurant) redirect('/onboarding')

  const { data: recipes } = await supabase
    .from('recipes')
    .select(`
      id, name_he, category, selling_price, portions, target_margin_pct,
      recipe_ingredients (
        quantity,
        ingredients ( cost_per_unit )
      )
    `)
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <RecipesList recipes={(recipes ?? []) as RecipeRow[]} />
    </div>
  )
}
