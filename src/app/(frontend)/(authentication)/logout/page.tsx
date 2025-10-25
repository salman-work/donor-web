'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function LogoutPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  const router = useRouter()
  const { refresh } = useAuth()

  useEffect(() => {
    const performLogout = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
        if (response.ok) {
          console.log('User logged out successfully')
        } else {
          console.error('Logout failed:', response.statusText)
        }
      } catch (error) {
        console.error('Error during logout:', error)
        return
      }

      // Refresh client auth state then navigate

      await refresh().catch(() => {})
      router.push('/home')
    }

    performLogout()
  }, [apiBaseUrl, router, refresh])

  return (
    <div>
      <p>Logging out...</p>
    </div>
  )
}
