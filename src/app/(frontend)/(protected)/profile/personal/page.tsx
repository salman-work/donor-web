'use client'
import React, { useEffect, useState } from 'react'

type User = {
  id?: string
  name?: string
  email?: string
  stripeAccountId?: string
}

export default function PersonalPage() {
  // user state kept for potential future use
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/profile/me')
        if (!res.ok) throw new Error('Failed to load profile')
        const data = await res.json()
        if (!mounted) return
        setUser(data || null)
        setName(data?.name || '')
        setEmail(data?.email || '')
      } catch (err) {
        console.error(err)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      // If a picture file is selected, send multipart/form-data so backend receives file
      const fileInput = document.querySelector('input[type=file]') as HTMLInputElement | null
      let res: Response
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const fd = new FormData()
        // backend expects the file field name 'officialId' (matches Users controller FileInterceptor)
        fd.append('officialId', fileInput.files[0])
        fd.append('name', name)
        fd.append('email', email)
        res = await fetch('/api/profile/update', {
          method: 'POST',
          body: fd,
        })
      } else {
        res = await fetch('/api/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email }),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Update failed')
      setMessage('Profile updated')
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.message || String(err)
      setMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Personal information</h2>
      <form onSubmit={handleSave} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        {/* picture upload - will be forwarded to backend as multipart/form-data */}
        <div>
          <label className="block text-sm font-medium">Picture</label>
          <input type="file" accept="image/*" className="mt-1" />
        </div>
        <div className="mt-2 text-sm">
          {user?.stripeAccountId ? (
            <div>
              Stripe connected: <strong>{user.stripeAccountId}</strong>
            </div>
          ) : (
            <div>Stripe not connected</div>
          )}
        </div>
        <div>
          <button disabled={loading} className="px-4 py-2 bg-primary text-white rounded">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
        {message && <div className="text-sm mt-2">{message}</div>}
      </form>
    </div>
  )
}
