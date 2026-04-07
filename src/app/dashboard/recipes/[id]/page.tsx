import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import RecipeBuilder from './RecipeBuilder'
import type { Ingredient } from '@/types/database'

export type InitialLine = {
  tempId: string
  ingredient_id: string
  name_he: string
  unit: string
  cost_per_unit: number
  quantity: number
}

export default async function RecipePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, kosher_enabled, default_margin_target')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!restaurant) redirect('/onboarding')

  const { data: recipe } = await supabase
    .from('recipes')
    .select(`
      id, name_he, category, selling_price, portions, target_margin_pct,
      recipe_ingredients (
        id, quantity,
        ingredients ( id, name_he, unit, cost_per_unit )
      )
    `)
    .eq('id', params.id)
    .eq('restaurant_id', restaurant.id)
    .single()

  if (!recipe) notFound()

  const { data: allIngredients } = await supabase
    .from('ingredients')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('name_he')

  const initialLines: InitialLine[] = (recipe.recipe_ingredients ?? []).map((ri) => ({
    tempId: ri.id,
    ingredient_id: ri.ingredients.id,
    name_he: ri.ingredients.name_he,
    unit: ri.ingredients.unit,
    cost_per_unit: ri.ingredients.cost_per_unit,
    quantity: ri.quantity,
  }))

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <RecipeBuilder
        recipeId={recipe.id}
        initialRecipe={{
          name_he: recipe.name_he,
          category: recipe.category,
          selling_price: recipe.selling_price,
          portions: recipe.portions,
          target_margin_pct: recipe.target_margin_pct,
        }}
        initialLines={initialLines}
        availableIngredients={(allIngredients ?? []) as Ingredient[]}
        kosherEnabled={restaurant.kosher_enabled}
      />
    </div>
  )
}
