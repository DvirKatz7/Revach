import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type RawRecipe = {
  id: string
  name_he: string
  selling_price: number | null
  portions: number
  recipe_ingredients: Array<{
    quantity: number
    ingredients: { cost_per_unit: number } | null
  }>
}

type ScoredRecipe = {
  id: string
  name_he: string
  gross_margin_pct: number
}

// ── Calculations ──────────────────────────────────────────────────────────────

function calcMargin(recipe: RawRecipe): number | null {
  if (!recipe.selling_price || recipe.selling_price <= 0) return null
  if (!recipe.recipe_ingredients.length) return null

  const totalLineCost = recipe.recipe_ingredients.reduce(
    (sum, li) => sum + li.quantity * (li.ingredients?.cost_per_unit ?? 0),
    0
  )
  const costPerPortion = totalLineCost / (recipe.portions || 1)
  return 100 - (costPerPortion / recipe.selling_price) * 100
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p
        className="text-3xl font-bold"
        style={{ color: accent ? '#1D9E75' : '#111827' }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function MarginBadge({ pct, variant }: { pct: number; variant: 'green' | 'red' }) {
  const bg = variant === 'green' ? '#E1F5EE' : '#FEE2E2'
  const color = variant === 'green' ? '#1D9E75' : '#DC2626'
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: bg, color }}
      dir="ltr"
    >
      {pct.toFixed(1)}%
    </span>
  )
}

function RecipeRow({
  recipe,
  variant,
  linkable,
}: {
  recipe: ScoredRecipe
  variant: 'green' | 'red'
  linkable?: boolean
}) {
  const inner = (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors rounded-lg">
      <MarginBadge pct={recipe.gross_margin_pct} variant={variant} />
      <span className="text-sm font-medium text-gray-800">{recipe.name_he}</span>
    </div>
  )

  return linkable ? (
    <Link href={`/dashboard/recipes/${recipe.id}`}>{inner}</Link>
  ) : (
    inner
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, default_margin_target')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!restaurant) redirect('/onboarding')

  // Fetch all active recipes with ingredient costs
  const { data: rawRecipes } = await supabase
    .from('recipes')
    .select(`
      id, name_he, selling_price, portions,
      recipe_ingredients (
        quantity,
        ingredients ( cost_per_unit )
      )
    `)
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)

  // Fetch total ingredient count
  const { count: ingredientCount } = await supabase
    .from('ingredients')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurant.id)

  // ── Compute margins ──────────────────────────────────────────────────────────
  const recipes = rawRecipes ?? []

  const scored: ScoredRecipe[] = recipes
    .map(r => {
      const margin = calcMargin(r as RawRecipe)
      if (margin === null) return null
      return { id: r.id, name_he: r.name_he, gross_margin_pct: margin }
    })
    .filter((r): r is ScoredRecipe => r !== null)

  // KPI values
  const activeCount = recipes.filter(r => r.selling_price && r.selling_price > 0).length
  const avgMargin = scored.length
    ? scored.reduce((s, r) => s + r.gross_margin_pct, 0) / scored.length
    : null

  // default_margin_target stored as fraction (e.g. 0.65 = 65%)
  const targetPct = (restaurant.default_margin_target ?? 0.65) * 100
  const belowTarget = scored.filter(r => r.gross_margin_pct < targetPct).length

  // Top / bottom lists — never overlap
  const sorted = [...scored].sort((a, b) => b.gross_margin_pct - a.gross_margin_pct)
  const n = sorted.length

  // How many to show in each list:
  //   1 recipe  → show neither (handled in JSX)
  //   2–5       → top half / bottom half, no middle overlap
  //   6+        → top 3 / bottom 3
  const showLists = n >= 2
  const listSize  = n >= 6 ? 3 : Math.floor(n / 2)
  const topList    = showLists ? sorted.slice(0, listSize) : []
  const topIds     = new Set(topList.map(r => r.id))
  const bottomList = showLists
    ? sorted.slice(-listSize).reverse().filter(r => !topIds.has(r.id))
    : []

  const hasRecipes = recipes.length > 0

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-4xl">

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {restaurant.name ? `שלום, ${restaurant.name}` : 'דשבורד'}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="מרג׳ ממוצע"
          value={avgMargin !== null ? `${avgMargin.toFixed(1)}%` : '—'}
          sub={scored.length ? `מתוך ${scored.length} מתכונים` : 'אין נתונים'}
          accent={avgMargin !== null && avgMargin >= targetPct}
        />
        <KpiCard
          label="מתכונים פעילים"
          value={String(activeCount)}
          sub={activeCount === 0 ? 'הוסף מחיר מכירה' : undefined}
        />
        <KpiCard
          label="מתחת ליעד"
          value={String(belowTarget)}
          sub={`יעד ${targetPct.toFixed(0)}%`}
          accent={belowTarget === 0 && scored.length > 0}
        />
        <KpiCard
          label="מצרכים"
          value={String(ingredientCount ?? 0)}
        />
      </div>

      {/* Empty state */}
      {!hasRecipes && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-4">🍽</p>
          <p className="text-gray-500 mb-6 text-sm">עוד אין מתכונים. הוסף את המתכון הראשון שלך.</p>
          <Link
            href="/dashboard/recipes/new"
            className="inline-block px-6 py-2.5 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: '#1D9E75' }}
          >
            הוסף מתכון ראשון
          </Link>
        </div>
      )}

      {/* Top / bottom recipes */}
      {hasRecipes && scored.length === 1 && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <p className="text-gray-500 text-sm">
            הוסף לפחות 2 מתכונים כדי לראות השוואת רווחיות
          </p>
        </div>
      )}

      {hasRecipes && showLists && (
        <div className="grid md:grid-cols-2 gap-6">

          {/* Top list */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">🏆 מנות רווחיות</h2>
            </div>
            <div className="p-2">
              {topList.map(r => (
                <RecipeRow key={r.id} recipe={r} variant="green" linkable />
              ))}
            </div>
          </div>

          {/* Bottom list */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">⚠️ מנות לשיפור</h2>
            </div>
            <div className="p-2">
              {bottomList.map(r => (
                <RecipeRow key={r.id} recipe={r} variant="red" linkable />
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Has recipes but none with selling price */}
      {hasRecipes && scored.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <p className="text-gray-500 text-sm mb-4">
            יש {recipes.length} מתכונים אך אין מחיר מכירה — לא ניתן לחשב מרג׳
          </p>
          <Link
            href="/dashboard/recipes"
            className="text-sm font-medium"
            style={{ color: '#1D9E75' }}
          >
            הוסף מחירי מכירה ←
          </Link>
        </div>
      )}

    </div>
  )
}
