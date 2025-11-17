'use client'
import React, { useEffect, useState } from 'react'

type User = {
  id?: string
  name?: string
  email?: string
  stripeAccountId?: string
}

export default function BankPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/profile/me')
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        setUser(data || null)
      } catch (_err) {
        // ignore
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function handleOnboard() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/profile/stripe/onboard', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create onboarding link')
      if (data.url) {
        // Open Stripe onboarding in new tab
        window.open(data.url, '_blank')
        setMessage('Opened Stripe onboarding in a new tab')
      } else {
        setMessage('No onboarding url returned')
      }
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMessage((err as any)?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Bank / Stripe onboarding</h2>
      <p className="mb-4 text-sm text-gray-700">
        Connect your bank via Stripe so you can receive payouts.
      </p>
      <div>
        <button
          onClick={handleOnboard}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded"
        >
          {loading ? 'Starting...' : 'Connect with Stripe'}
        </button>
      </div>
      {user?.stripeAccountId && (
        <div className="mt-4 text-sm">
          <strong>Connected Stripe account:</strong> {user.stripeAccountId}
        </div>
      )}
      {message && <div className="mt-3 text-sm">{message}</div>}
    </div>
  )
}
