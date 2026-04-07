'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  addIngredient, updateIngredient, deleteIngredient, seedIngredients,
} from './actions'
import type { CascadeResult } from './actions'
import type { Ingredient, UnitType, KosherType } from '@/types/database'

// ── Constants ─────────────────────────────────────────────────────────────────

const UNIT_LABELS: Record<UnitType, string> = {
  kg: 'ק"ג', g: 'גרם', l: 'ליטר', ml: 'מ"ל', unit: 'יחידה',
}

const KOSHER_LABELS: Record<KosherType, string> = {
  meat: 'בשרי', dairy: 'חלבי', pareve: 'פרווה',
}

const DISMISS_MS = 10_000

// ── Cascade alert ─────────────────────────────────────────────────────────────

function CascadeAlert({
  result,
  onDismiss,
}: {
  result: CascadeResult
  onDismiss: () => void
}) {
  const [progress, setProgress] = useState(100)
  const startRef = useRef(Date.now())

  // Countdown bar + auto-dismiss
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      const remaining = Math.max(0, 100 - (elapsed / DISMISS_MS) * 100)
      setProgress(remaining)
      if (remaining === 0) { clearInterval(interval); onDismiss() }
    }, 50)
    return () => clearInterval(interval)
  }, [onDismiss])

  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      {/* Progress bar */}
      <div
        className="h-1 transition-all duration-75"
        style={{ width: `${progress}%`, backgroundColor: '#1D9E75' }}
      />

      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-sm font-semibold text-amber-900">
            עדכון מחיר <span className="font-bold">{result.ingredientName}</span>{' '}
            משפיע על {result.affected.length}{' '}
            {result.affected.length === 1 ? 'מתכון' : 'מתכונים'}:
          </p>
          <button
            onClick={onDismiss}
            className="text-amber-400 hover:text-amber-700 transition-colors shrink-0 text-lg leading-none"
            aria-label="סגור"
          >
            ×
          </button>
        </div>

        {/* Recipe rows */}
        <div className="space-y-1.5">
          {result.affected.map(r => {
            const improved = r.newMargin >= r.oldMargin
            const delta    = r.newMargin - r.oldMargin
            return (
              <div
                key={r.id}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100"
              >
                {/* Margin change (LTR numbers, RTL layout so it goes to the left) */}
                <div className="flex items-center gap-1.5 text-xs font-mono" dir="ltr">
                  <span className="text-gray-500">{r.oldMargin.toFixed(1)}%</span>
                  <span className="text-gray-400">→</span>
                  <span
                    className="font-semibold"
                    style={{ color: improved ? '#1D9E75' : '#DC2626' }}
                  >
                    {r.newMargin.toFixed(1)}%
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: improved ? '#1D9E75' : '#DC2626' }}
                  >
                    ({improved ? '+' : ''}{delta.toFixed(1)}%)
                  </span>
                </div>

                {/* Recipe name + link */}
                <Link
                  href={`/dashboard/recipes/${r.id}`}
                  className="text-sm font-medium text-gray-800 hover:underline"
                  style={{ color: '#1D9E75' }}
                >
                  {r.name_he} ←
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Form fields (shared between add and edit) ─────────────────────────────────

interface FormState {
  name_he: string
  unit: UnitType
  cost_per_unit: string
  kosher_type: KosherType
}

const DEFAULT_FORM: FormState = {
  name_he: '', unit: 'kg', cost_per_unit: '', kosher_type: 'pareve',
}

function IngredientFormFields({
  values,
  onChange,
  kosherEnabled,
}: {
  values: FormState
  onChange: (f: FormState) => void
  kosherEnabled: boolean
}) {
  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent'
  const ringStyle = { '--tw-ring-color': '#1D9E75' } as React.CSSProperties

  return (
    <>
      <input
        name="name_he" type="text" required
        placeholder="שם המצרך"
        value={values.name_he}
        onChange={e => onChange({ ...values, name_he: e.target.value })}
        className={inputCls} style={ringStyle}
      />
      <select
        name="unit"
        value={values.unit}
        onChange={e => onChange({ ...values, unit: e.target.value as UnitType })}
        className={inputCls} style={ringStyle}
      >
        {(Object.entries(UNIT_LABELS) as [UnitType, string][]).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <input
        name="cost_per_unit" type="number" required
        min="0" step="0.01" placeholder="מחיר ₪"
        value={values.cost_per_unit}
        onChange={e => onChange({ ...values, cost_per_unit: e.target.value })}
        className={inputCls} style={ringStyle} dir="ltr"
      />
      {kosherEnabled && (
        <select
          name="kosher_type"
          value={values.kosher_type}
          onChange={e => onChange({ ...values, kosher_type: e.target.value as KosherType })}
          className={inputCls} style={ringStyle}
        >
          {(Object.entries(KOSHER_LABELS) as [KosherType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      )}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  ingredients: Ingredient[]
  restaurantId: string
  kosherEnabled: boolean
  needsSeed: boolean
}

export default function IngredientsClient({
  ingredients, restaurantId, kosherEnabled, needsSeed,
}: Props) {
  const [showAdd, setShowAdd]     = useState(false)
  const [addForm, setAddForm]     = useState<FormState>(DEFAULT_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm]   = useState<FormState>(DEFAULT_FORM)
  const [cascade, setCascade]     = useState<CascadeResult | null>(null)

  const [isPending, startTransition] = useTransition()

  function startEdit(ing: Ingredient) {
    setEditingId(ing.id)
    setEditForm({
      name_he: ing.name_he,
      unit: ing.unit,
      cost_per_unit: String(ing.cost_per_unit),
      kosher_type: ing.kosher_type,
    })
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('kosher_type', addForm.kosher_type)
    startTransition(async () => {
      await addIngredient(fd)
      setAddForm(DEFAULT_FORM)
      setShowAdd(false)
    })
  }

  function handleUpdate(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('kosher_type', editForm.kosher_type)
    startTransition(async () => {
      const result = await updateIngredient(id, fd)
      setEditingId(null)
      setCascade(result.affected.length > 0 ? result : null)
    })
  }

  function handleDelete(id: string) {
    startTransition(() => deleteIngredient(id))
  }

  function handleSeed() {
    startTransition(() => seedIngredients(restaurantId))
  }

  const colCount = kosherEnabled ? 5 : 4

  return (
    <div>
      {/* Cascade alert */}
      {cascade && (
        <CascadeAlert
          result={cascade}
          onDismiss={() => setCascade(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">מצרכים</h2>
        <button
          onClick={() => { setShowAdd(v => !v); setEditingId(null) }}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#1D9E75' }}
          disabled={isPending}
        >
          {showAdd ? 'ביטול' : '+ הוסף מצרך'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100 grid gap-3"
          style={{ gridTemplateColumns: kosherEnabled ? 'repeat(4, 1fr) auto' : 'repeat(3, 1fr) auto' }}
        >
          <IngredientFormFields values={addForm} onChange={setAddForm} kosherEnabled={kosherEnabled} />
          <button
            type="submit" disabled={isPending}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium self-end disabled:opacity-60"
            style={{ backgroundColor: '#1D9E75' }}
          >
            שמור
          </button>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 text-right">
              <th className="px-4 py-3 font-medium">שם</th>
              <th className="px-4 py-3 font-medium">יחידה</th>
              <th className="px-4 py-3 font-medium">מחיר ליחידה</th>
              {kosherEnabled && <th className="px-4 py-3 font-medium">כשרות</th>}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {ingredients.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-gray-400">
                  אין מצרכים עדיין.{' '}
                  {needsSeed && (
                    <button
                      onClick={handleSeed} disabled={isPending}
                      className="underline" style={{ color: '#1D9E75' }}
                    >
                      טען מצרכים לדוגמה
                    </button>
                  )}
                </td>
              </tr>
            )}
            {ingredients.map(ing => (
              editingId === ing.id ? (
                <tr key={ing.id} className="border-t border-gray-50 bg-gray-50">
                  <td colSpan={colCount} className="px-4 py-2">
                    <form
                      onSubmit={e => handleUpdate(e, ing.id)}
                      className="grid gap-3"
                      style={{ gridTemplateColumns: kosherEnabled ? 'repeat(4, 1fr) auto auto' : 'repeat(3, 1fr) auto auto' }}
                    >
                      <IngredientFormFields values={editForm} onChange={setEditForm} kosherEnabled={kosherEnabled} />
                      <button
                        type="submit" disabled={isPending}
                        className="px-3 py-2 rounded-lg text-white text-sm font-medium self-end disabled:opacity-60"
                        style={{ backgroundColor: '#1D9E75' }}
                      >
                        שמור
                      </button>
                      <button
                        type="button" onClick={() => setEditingId(null)}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm self-end text-gray-600 hover:bg-gray-100"
                      >
                        ביטול
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={ing.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{ing.name_he}</td>
                  <td className="px-4 py-3 text-gray-600">{UNIT_LABELS[ing.unit]}</td>
                  <td className="px-4 py-3 text-gray-600" dir="ltr">₪{Number(ing.cost_per_unit).toFixed(2)}</td>
                  {kosherEnabled && (
                    <td className="px-4 py-3 text-gray-600">{KOSHER_LABELS[ing.kosher_type]}</td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => startEdit(ing)} disabled={isPending}
                        className="text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
                        title="עריכה"
                      >✏️</button>
                      <button
                        onClick={() => handleDelete(ing.id)} disabled={isPending}
                        className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        title="מחיקה"
                      >🗑️</button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
