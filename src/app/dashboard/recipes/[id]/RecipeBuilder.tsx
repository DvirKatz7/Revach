'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { saveRecipe } from '../actions'
import type { Ingredient } from '@/types/database'
import type { InitialLine } from './page'

const CATEGORIES = [
  { value: 'starters', label: 'ראשונות' },
  { value: 'mains',    label: 'עיקריות' },
  { value: 'desserts', label: 'קינוחים' },
  { value: 'drinks',   label: 'שתייה' },
]

const UNIT_LABELS: Record<string, string> = {
  kg: 'ק"ג', g: 'גרם', l: 'ליטר', ml: 'מ"ל', unit: 'יחידה',
}

function marginColor(pct: number) {
  if (pct >= 65) return '#1D9E75'
  if (pct >= 50) return '#F59E0B'
  return '#EF4444'
}

type RecipeLine = InitialLine

interface RecipeFields {
  name_he: string
  category: string | null
  selling_price: number | null
  portions: number
  target_margin_pct: number
}

interface Props {
  recipeId: string
  initialRecipe: RecipeFields
  initialLines: InitialLine[]
  availableIngredients: Ingredient[]
  kosherEnabled?: boolean
}

// ── Ingredient search dropdown ──────────────────────────────────────────────
function IngredientSearch({
  available,
  onAdd,
}: {
  available: Ingredient[]
  onAdd: (ing: Ingredient) => void
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = search.trim()
    ? available.filter(i => i.name_he.includes(search))
    : available.slice(0, 8)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent'
  const ringStyle = { '--tw-ring-color': '#1D9E75' } as React.CSSProperties

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="חיפוש מצרך..."
        className={inputCls}
        style={ringStyle}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {filtered.map(ing => (
            <button
              key={ing.id}
              type="button"
              onMouseDown={() => {
                onAdd(ing)
                setSearch('')
                setOpen(false)
              }}
              className="w-full text-right px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between"
            >
              <span className="text-gray-500 text-xs">{UNIT_LABELS[ing.unit]}</span>
              <span className="font-medium">{ing.name_he}</span>
            </button>
          ))}
        </div>
      )}
      {open && available.length > 0 && filtered.length === 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-400">
          לא נמצאו תוצאות
        </div>
      )}
    </div>
  )
}

// ── Main builder ────────────────────────────────────────────────────────────
export default function RecipeBuilder({
  recipeId,
  initialRecipe,
  initialLines,
  availableIngredients,
}: Props) {
  const [recipe, setRecipe] = useState<RecipeFields>(initialRecipe)
  const [lines, setLines] = useState<RecipeLine[]>(initialLines)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const router = useRouter()

  // IDs already in the recipe — exclude from search
  const usedIds = new Set(lines.map(l => l.ingredient_id))
  const searchPool = availableIngredients.filter(i => !usedIds.has(i.id))

  // ── Calculations ──────────────────────────────────────────────────────────
  const totalRecipeCost = lines.reduce(
    (sum, l) => sum + l.quantity * l.cost_per_unit, 0
  ) / (recipe.portions || 1)

  const sellingPrice = recipe.selling_price ?? 0
  const foodCostPct = sellingPrice > 0 ? (totalRecipeCost / sellingPrice) * 100 : null
  const grossMarginPct = foodCostPct !== null ? 100 - foodCostPct : null
  const suggestedPrice = recipe.target_margin_pct < 100
    ? totalRecipeCost / (1 - recipe.target_margin_pct / 100)
    : null

  // ── Line handlers ─────────────────────────────────────────────────────────
  const addLine = useCallback((ing: Ingredient) => {
    setLines(prev => [...prev, {
      tempId: crypto.randomUUID(),
      ingredient_id: ing.id,
      name_he: ing.name_he,
      unit: ing.unit,
      cost_per_unit: ing.cost_per_unit,
      quantity: 1,
    }])
  }, [])

  function updateQty(tempId: string, qty: number) {
    setLines(prev => prev.map(l => l.tempId === tempId ? { ...l, quantity: qty } : l))
  }

  function removeLine(tempId: string) {
    setLines(prev => prev.filter(l => l.tempId !== tempId))
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function handleSave() {
    startTransition(async () => {
      await saveRecipe(
        recipeId,
        {
          name_he: recipe.name_he,
          category: recipe.category,
          selling_price: recipe.selling_price,
          portions: recipe.portions,
          target_margin_pct: recipe.target_margin_pct,
        },
        lines.map(l => ({ ingredient_id: l.ingredient_id, quantity: l.quantity }))
      )
      setSavedAt(new Date())
    })
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent'
  const ringStyle = { '--tw-ring-color': '#1D9E75' } as React.CSSProperties

  return (
    <>
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push('/dashboard/recipes')}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        → רשימת המתכונים
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">פרטי המתכון</h2>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">שם המתכון</label>
          <input
            type="text"
            value={recipe.name_he}
            onChange={e => setRecipe(r => ({ ...r, name_he: e.target.value }))}
            className={inputCls}
            style={ringStyle}
            placeholder="שם המתכון"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה</label>
            <select
              value={recipe.category ?? ''}
              onChange={e => setRecipe(r => ({ ...r, category: e.target.value || null }))}
              className={inputCls}
              style={ringStyle}
            >
              <option value="">בחר קטגוריה</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Portions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">מספר מנות</label>
            <input
              type="number"
              min={1}
              step={1}
              value={recipe.portions}
              onChange={e => setRecipe(r => ({ ...r, portions: Math.max(1, parseInt(e.target.value) || 1) }))}
              className={inputCls}
              style={ringStyle}
              dir="ltr"
            />
          </div>

          {/* Selling price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">מחיר מכירה (₪)</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={recipe.selling_price ?? ''}
              onChange={e => setRecipe(r => ({ ...r, selling_price: e.target.value ? Number(e.target.value) : null }))}
              className={inputCls}
              style={ringStyle}
              placeholder="0.00"
              dir="ltr"
            />
          </div>

          {/* Target margin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">יעד מרג׳ (%)</label>
            <input
              type="number"
              min={0}
              max={99}
              step={1}
              value={recipe.target_margin_pct}
              onChange={e => setRecipe(r => ({ ...r, target_margin_pct: Number(e.target.value) }))}
              className={inputCls}
              style={ringStyle}
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Ingredients card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">מצרכים</h2>

        {/* Search */}
        <div className="mb-4">
          <IngredientSearch available={searchPool} onAdd={addLine} />
        </div>

        {/* Lines table */}
        {lines.length > 0 && (
          <table className="w-full text-sm mb-2">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-right">
                <th className="pb-2 font-medium">מצרך</th>
                <th className="pb-2 font-medium">יחידה</th>
                <th className="pb-2 font-medium w-28">כמות</th>
                <th className="pb-2 font-medium text-left">עלות</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {lines.map(line => {
                const lineCost = line.quantity * line.cost_per_unit
                return (
                  <tr key={line.tempId} className="border-t border-gray-50">
                    <td className="py-2 font-medium text-gray-900">{line.name_he}</td>
                    <td className="py-2 text-gray-500">{UNIT_LABELS[line.unit] ?? line.unit}</td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.quantity}
                        onChange={e => updateQty(line.tempId, Number(e.target.value))}
                        className="w-full px-2 py-1 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1"
                        style={ringStyle}
                        dir="ltr"
                      />
                    </td>
                    <td className="py-2 text-gray-600 text-left" dir="ltr">
                      ₪{lineCost.toFixed(2)}
                    </td>
                    <td className="py-2 text-center">
                      <button
                        onClick={() => removeLine(line.tempId)}
                        className="text-gray-300 hover:text-red-400 transition-colors text-xs"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {lines.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            חפש מצרך למעלה כדי להוסיף לרשימה
          </p>
        )}
      </div>

      {/* Bottom spacer so content isn't hidden behind sticky bar */}
      <div className="h-24" />
    </div>

    {/* Sticky bottom bar */}
    <div className="fixed bottom-0 inset-x-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4 flex-wrap justify-between">
        {/* Stats */}
        <div className="flex items-center gap-6 flex-wrap">
          <BarStat label="עלות למנה" value={`₪${totalRecipeCost.toFixed(2)}`} />
          <BarStat
            label="עלות מזון %"
            value={foodCostPct !== null ? `${foodCostPct.toFixed(1)}%` : '—'}
          />
          <BarStat
            label="מרג׳ גולמי"
            value={grossMarginPct !== null ? `${grossMarginPct.toFixed(1)}%` : '—'}
            valueColor={grossMarginPct !== null ? marginColor(grossMarginPct) : undefined}
          />
          <BarStat
            label="מחיר מומלץ"
            value={suggestedPrice && suggestedPrice > 0 ? `₪${suggestedPrice.toFixed(2)}` : '—'}
            valueColor="#1D9E75"
          />
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="text-xs text-gray-400">
              נשמר {savedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#1D9E75' }}
          >
            {isPending ? 'שומר...' : 'שמור מתכון'}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

function BarStat({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-xs text-gray-400 leading-tight">{label}</span>
      <span className="text-base font-bold leading-tight" style={{ color: valueColor ?? '#111827' }} dir="ltr">
        {value}
      </span>
    </div>
  )
}
