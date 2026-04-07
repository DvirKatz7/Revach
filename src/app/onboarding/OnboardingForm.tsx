'use client'

import { useState } from 'react'
import { createRestaurant } from './actions'

export default function OnboardingForm() {
  const [kosher, setKosher] = useState(false)
  const [margin, setMargin] = useState(65)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('kosher_enabled', String(kosher))
    formData.set('default_margin_target', String(margin))

    try {
      await createRestaurant(formData)
    } catch {
      setError('אירעה שגיאה. נסה שנית.')
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Restaurant name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          שם המסעדה
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="למשל: מסעדת הים"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': '#1D9E75' } as React.CSSProperties}
        />
      </div>

      {/* Kosher toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">מצב כשרות</span>
        <button
          type="button"
          role="switch"
          aria-checked={kosher}
          onClick={() => setKosher(!kosher)}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2"
          style={{
            backgroundColor: kosher ? '#1D9E75' : '#D1D5DB',
          }}
        >
          <span
            className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
            style={{ transform: kosher ? 'translateX(-1.5rem)' : 'translateX(-0.25rem)' }}
          />
        </button>
      </div>

      {/* Margin slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="margin" className="text-sm font-medium text-gray-700">
            יעד מרג׳ ברירת מחדל
          </label>
          <span className="text-sm font-semibold" style={{ color: '#1D9E75' }}>
            {margin}%
          </span>
        </div>
        <input
          id="margin"
          type="range"
          min={50}
          max={80}
          value={margin}
          onChange={(e) => setMargin(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{ accentColor: '#1D9E75' }}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>50%</span>
          <span>80%</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 px-4 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-60"
        style={{ backgroundColor: '#1D9E75' }}
      >
        {pending ? 'שומר...' : 'בואו נתחיל ←'}
      </button>
    </form>
  )
}
