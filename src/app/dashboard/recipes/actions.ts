'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getRestaurant() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, default_margin_target')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!restaurant) redirect('/onboarding')
  return { supabase, restaurant }
}

export async function createRecipe() {
  const { supabase, restaurant } = await getRestaurant()

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      restaurant_id: restaurant.id,
      name_he: 'מתכון חדש',
      portions: 1,
      target_margin_pct: Math.round(restaurant.default_margin_target * 100),
    })
    .select('id')
    .single()

  if (error || !data) throw new Error('Failed to create recipe')
  redirect(`/dashboard/recipes/${data.id}`)
}

export async function saveRecipe(
  recipeId: string,
  fields: {
    name_he: string
    category: string | null
    selling_price: number | null
    portions: number
    target_margin_pct: number
  },
  lines: Array<{ ingredient_id: string; quantity: number }>
) {
  const { supabase } = await getRestaurant()

  await supabase.from('recipes').update(fields).eq('id', recipeId)

  await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)

  if (lines.length > 0) {
    await supabase.from('recipe_ingredients').insert(
      lines.map(l => ({
        recipe_id: recipeId,
        ingredient_id: l.ingredient_id,
        quantity: l.quantity,
        yield_pct: 100,
      }))
    )
  }

  revalidatePath('/dashboard/recipes')
  revalidatePath(`/dashboard/recipes/${recipeId}`)
}

export async function deleteRecipe(id: string) {
  const { supabase } = await getRestaurant()
  await supabase.from('recipes').delete().eq('id', id)
  revalidatePath('/dashboard/recipes')
  redirect('/dashboard/recipes')
}
