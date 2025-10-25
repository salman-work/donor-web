'use client'

import React from 'react'

type AuthState = {
  success: boolean
  authenticated?: boolean
  username?: string
  error?: string
}

type AuthContextType = {
  auth: AuthState | null
  loading: boolean
  refresh: () => Promise<void>
  setAuth: (a: AuthState | null) => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<React.PropsWithChildren<Record<string, unknown>>> = ({ children }) => {
  const [auth, setAuth] = React.useState<AuthState | null>(null)
  const [loading, setLoading] = React.useState(true)

  const fetchAuth = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/status', { cache: 'no-store' })
      const data = await res.json()
      setAuth(data)
    } catch (err) {
      setAuth({ success: false, authenticated: false, error: String(err) })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAuth()
  }, [fetchAuth])

  const value: AuthContextType = React.useMemo(
    () => ({
      auth,
      loading,
      refresh: fetchAuth,
      setAuth,
    }),
    [auth, loading, fetchAuth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
