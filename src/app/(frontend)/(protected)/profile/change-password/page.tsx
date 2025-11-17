'use client'
import React, { useState } from 'react'

function validatePassword(pw: string) {
  const errors: string[] = []
  if (pw.length < 8) errors.push('Must be at least 8 characters')
  if (!/[A-Z]/.test(pw)) errors.push('Must contain an uppercase letter')
  if (!/[0-9]/.test(pw)) errors.push('Must contain a number')
  return errors
}

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    const policyErrors = validatePassword(newPassword)
    if (newPassword !== confirm) {
      setErrors(['New password and confirm do not match'])
      return
    }
    if (policyErrors.length) {
      setErrors(policyErrors)
      return
    }
    setErrors([])
    setLoading(true)
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed')
      setMessage('Password updated')
      setOldPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMessage((err as any)?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Change password</h2>
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium">Old password</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Confirm new password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        {errors.length > 0 && (
          <div className="text-sm text-red-600">
            {errors.map((x) => (
              <div key={x}>{x}</div>
            ))}
          </div>
        )}
        <div>
          <button disabled={loading} className="px-4 py-2 bg-primary text-white rounded">
            {loading ? 'Updating...' : 'Change password'}
          </button>
        </div>
        {message && <div className="text-sm mt-2">{message}</div>}
      </form>
    </div>
  )
}
