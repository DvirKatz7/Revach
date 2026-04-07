'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createRecipe, deleteRecipe } from './actions'
import type { RecipeRow } from './page'

const CATEGORY_LABELS: Record<string, string> = {
  starters: 'ראשונות',
  mains: 'עיקריות',
  desserts: 'קינוחים',
  drinks: 'שתייה',
}

function calcCost(recipe: RecipeRow): number {
  const total = recipe.recipe_ingredients.reduce((sum, line) => {
    return sum + line.quantity * (line.ingredients?.cost_per_unit ?? 0)
  }, 0)
  return total / (recipe.portions || 1)
}

function marginColor(pct: number) {
  if (pct >= 65) return '#1D9E75'
  if (pct >= 50) return '#F59E0B'
  return '#EF4444'
}

export default function RecipesList({ recipes }: { recipes: RecipeRow[] }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleCreate() {
    startTransition(() => createRecipe())
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('למחוק את המתכון?')) return
    startTransition(() => deleteRecipe(id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">מתכונים</h2>
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
          style={{ backgroundColor: '#1D9E75' }}
        >
          {isPending ? '...' : '+ הוסף מתכון'}
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          <p className="mb-4">אין מתכונים עדיין</p>
          <button
            onClick={handleCreate}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: '#1D9E75' }}
          >
            צור מתכון ראשון
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-right">
                <th className="px-4 py-3 font-medium">שם המתכון</th>
                <th className="px-4 py-3 font-medium">קטגוריה</th>
                <th className="px-4 py-3 font-medium">עלות מזון</th>
                <th className="px-4 py-3 font-medium">מרג׳</th>
                <th className="px-4 py-3 font-medium">מחיר מכירה</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {recipes.map(recipe => {
                const cost = calcCost(recipe)
                const price = recipe.selling_price
                const margin = price && price > 0
                  ? 100 - (cost / price * 100)
                  : null

                return (
                  <tr
                    key={recipe.id}
                    className="border-t border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/recipes/${recipe.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{recipe.name_he}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {recipe.category ? (CATEGORY_LABELS[recipe.category] ?? recipe.category) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600" dir="ltr">
                      {cost > 0 ? `₪${cost.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {margin !== null ? (
                        <span style={{ color: marginColor(margin) }}>
                          {margin.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600" dir="ltr">
                      {price ? `₪${Number(price).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => handleDelete(e, recipe.id)}
                        disabled={isPending}
                        className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                        title="מחיקה"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
