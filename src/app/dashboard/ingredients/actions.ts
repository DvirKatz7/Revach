'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { UnitType, KosherType } from '@/types/database'

const REVALIDATE = '/dashboard/ingredients'

// ── Shared types ──────────────────────────────────────────────────────────────

export type AffectedRecipe = {
  id: string
  name_he: string
  oldMargin: number
  newMargin: number
}

export type CascadeResult = {
  ingredientName: string
  affected: AffectedRecipe[]
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getRestaurantId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const qr = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  const restaurant = qr.data as { id: string } | null
  if (!restaurant) redirect('/onboarding')
  return restaurant!.id
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function addIngredient(formData: FormData) {
  const restaurantId = await getRestaurantId()
  const supabase = createClient()

  await supabase.from('ingredients').insert({
    restaurant_id: restaurantId,
    name_he: formData.get('name_he') as string,
    unit: formData.get('unit') as UnitType,
    cost_per_unit: Number(formData.get('cost_per_unit')),
    kosher_type: (formData.get('kosher_type') as KosherType) || 'pareve',
    supplier: null,
  })

  revalidatePath(REVALIDATE)
}

export async function updateIngredient(
  id: string,
  formData: FormData,
): Promise<CascadeResult> {
  await getRestaurantId()
  const supabase = createClient()

  const newCost = Number(formData.get('cost_per_unit'))

  // ── 1. Capture old cost + name before updating ────────────────────────────
  const { data: ingBefore } = await supabase
    .from('ingredients')
    .select('cost_per_unit, name_he')
    .eq('id', id)
    .single()

  const oldCost    = Number(ingBefore?.cost_per_unit ?? 0)
  const ingName    = (ingBefore?.name_he as string | undefined) ?? ''

  // ── 2. Perform the update ─────────────────────────────────────────────────
  await supabase.from('ingredients').update({
    name_he:       formData.get('name_he') as string,
    unit:          formData.get('unit') as UnitType,
    cost_per_unit: newCost,
    kosher_type:   (formData.get('kosher_type') as KosherType) || 'pareve',
  }).eq('id', id)

  revalidatePath(REVALIDATE)

  // ── 3. If cost unchanged, no cascade needed ───────────────────────────────
  if (oldCost === newCost) {
    return { ingredientName: ingName, affected: [] }
  }

  // ── 4. Find recipe IDs that use this ingredient ───────────────────────────
  const { data: usageRows } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id')
    .eq('ingredient_id', id)

  const recipeIds = Array.from(new Set((usageRows ?? []).map(r => r.recipe_id)))

  if (recipeIds.length === 0) {
    return { ingredientName: ingName, affected: [] }
  }

  // ── 5. Fetch each affected recipe with ALL its lines ──────────────────────
  //  The DB now holds newCost for the updated ingredient,
  //  so SUM(qty × cost) naturally gives us newTotal.
  //  We back-calculate oldTotal by swapping the cost for this ingredient.
  const { data: recipes } = await supabase
    .from('recipes')
    .select(`
      id, name_he, selling_price, portions,
      recipe_ingredients (
        quantity, ingredient_id,
        ingredients ( cost_per_unit )
      )
    `)
    .in('id', recipeIds)
    .eq('is_active', true)

  // ── 6. Calculate old → new margins ────────────────────────────────────────
  const affected: AffectedRecipe[] = []

  for (const recipe of recipes ?? []) {
    const price    = Number(recipe.selling_price ?? 0)
    const portions = recipe.portions || 1
    const lines    = recipe.recipe_ingredients ?? []

    if (price <= 0 || lines.length === 0) continue

    let newTotal = 0
    let updatedQty = 0   // total qty of the updated ingredient in this recipe

    for (const li of lines) {
      const cost = Number((li.ingredients as { cost_per_unit: number } | null)?.cost_per_unit ?? 0)
      const qty  = Number(li.quantity)
      newTotal += qty * cost
      if ((li.ingredient_id as string) === id) updatedQty += qty
    }

    // Reconstruct what the total was before the price change
    const oldTotal = newTotal - updatedQty * newCost + updatedQty * oldCost

    const newMargin = 100 - (newTotal / portions / price) * 100
    const oldMargin = 100 - (oldTotal / portions / price) * 100

    affected.push({
      id:            recipe.id,
      name_he:       recipe.name_he,
      oldMargin,
      newMargin,
    })
  }

  return { ingredientName: ingName, affected }
}

export async function deleteIngredient(id: string) {
  await getRestaurantId()
  const supabase = createClient()
  await supabase.from('ingredients').delete().eq('id', id)
  revalidatePath(REVALIDATE)
}

export async function seedIngredients(restaurantId: string) {
  const supabase = createClient()

  const seeds = [
    { name_he: 'עוף',          unit: 'kg'   as UnitType, cost_per_unit: 28,  kosher_type: 'meat'   as KosherType },
    { name_he: 'ביצים',        unit: 'unit' as UnitType, cost_per_unit: 1.9, kosher_type: 'pareve' as KosherType },
    { name_he: 'עגבנייה',      unit: 'kg'   as UnitType, cost_per_unit: 8,   kosher_type: 'pareve' as KosherType },
    { name_he: 'שמן זית',      unit: 'l'    as UnitType, cost_per_unit: 42,  kosher_type: 'pareve' as KosherType },
    { name_he: 'גבינה צהובה',  unit: 'kg'   as UnitType, cost_per_unit: 65,  kosher_type: 'dairy'  as KosherType },
    { name_he: 'לחם',          unit: 'unit' as UnitType, cost_per_unit: 12,  kosher_type: 'pareve' as KosherType },
    { name_he: 'סלמון',        unit: 'kg'   as UnitType, cost_per_unit: 95,  kosher_type: 'pareve' as KosherType },
    { name_he: 'תפוחי אדמה',   unit: 'kg'   as UnitType, cost_per_unit: 6,   kosher_type: 'pareve' as KosherType },
  ]

  await supabase.from('ingredients').insert(
    seeds.map(s => ({ ...s, restaurant_id: restaurantId }))
  )

  revalidatePath(REVALIDATE)
}
