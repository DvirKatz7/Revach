'use client'

import { useState, useTransition } from 'react'
import { updateSettings, signOut } from './actions'

interface Props {
  name: string
  kosherEnabled: boolean
  defaultMarginPct: number   // already multiplied ×100, e.g. 65
  vatPct: number             // already multiplied ×100, e.g. 17
}

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent'
const ringStyle = { '--tw-ring-color': '#1D9E75' } as React.CSSProperties

export default function SettingsForm({
  name: initialName,
  kosherEnabled: initialKosher,
  defaultMarginPct: initialMargin,
  vatPct: initialVat,
}: Props) {
  const [name, setName]     = useState(initialName)
  const [kosher, setKosher] = useState(initialKosher)
  const [margin, setMargin] = useState(initialMargin)
  const [vat, setVat]       = useState(initialVat)
  const [saved, setSaved]   = useState(false)
  const [err, setErr]       = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()
  const [isSigningOut, startSignOut] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)
    setSaved(false)

    const fd = new FormData()
    fd.set('name', name)
    fd.set('kosher_enabled', String(kosher))
    fd.set('default_margin_target', String(margin))
    fd.set('vat_rate', String(vat))

    startTransition(async () => {
      try {
        await updateSettings(fd)
        setSaved(true)
      } catch {
        setErr('שגיאה בשמירה. נסה שנית.')
      }
    })
  }

  function handleSignOut() {
    startSignOut(() => signOut())
  }

  return (
    <div className="space-y-6 max-w-lg">

      {/* ── Settings form ── */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
        <h2 className="text-base font-semibold text-gray-900">פרטי המסעדה</h2>

        {/* Restaurant name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            שם המסעדה
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => { setName(e.target.value); setSaved(false) }}
            className={inputCls}
            style={ringStyle}
            placeholder="שם המסעדה"
          />
        </div>

        {/* Kosher toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">מצב כשרות</span>
          <button
            type="button"
            role="switch"
            aria-checked={kosher}
            onClick={() => { setKosher(k => !k); setSaved(false) }}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2"
            style={{ backgroundColor: kosher ? '#1D9E75' : '#D1D5DB' }}
          >
            <span
              className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: kosher ? 'translateX(-1.5rem)' : 'translateX(-0.25rem)' }}
            />
          </button>
        </div>

        {/* Default margin */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">
              יעד מרג׳ ברירת מחדל
            </label>
            <span className="text-sm font-semibold" style={{ color: '#1D9E75' }}>
              {margin}%
            </span>
          </div>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={margin}
            onChange={e => { setMargin(Number(e.target.value)); setSaved(false) }}
            className={inputCls}
            style={ringStyle}
            dir="ltr"
          />
        </div>

        {/* VAT rate */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">מע״מ</label>
            <span className="text-xs text-gray-400">נשמר כ-{(vat / 100).toFixed(2)}</span>
          </div>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={vat}
            onChange={e => { setVat(Number(e.target.value)); setSaved(false) }}
            className={inputCls}
            style={ringStyle}
            dir="ltr"
            placeholder="17"
          />
          <p className="text-xs text-gray-400 mt-1">הזן אחוזים — למשל 17 עבור 17%</p>
        </div>

        {/* Feedback */}
        {err && <p className="text-sm text-red-500">{err}</p>}
        {saved && !err && (
          <p className="text-sm font-medium" style={{ color: '#1D9E75' }}>
            ✓ הגדרות נשמרו בהצלחה
          </p>
        )}

        {/* Save button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#1D9E75' }}
        >
          {isPending ? 'שומר...' : 'שמור הגדרות'}
        </button>
      </form>

      {/* ── Danger zone ── */}
      <div className="bg-white rounded-xl border border-red-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">אזור מסוכן</h2>
        <p className="text-sm text-gray-400 mb-4">פעולות בלתי הפיכות</p>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          {isSigningOut ? 'מתנתק...' : 'התנתק'}
        </button>
      </div>

    </div>
  )
}
