'use server'

import { headers, cookies } from 'next/headers'
import { parseCookie } from '@/utilities/parseCookies'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
const apiSecret = process.env.NEXT_PUBLIC_API_SECRET
const accessTokenCookieName = 'donorapi-accesstoken-jwt'
const refreshTokenCookieName = 'donorapi-refreshtoken-jwt'

export async function loginAction(_form?: unknown, formData?: FormData) {
  const email = (formData?.get('email') as string) || ''
  const password = (formData?.get('password') as string) || ''

  checkApiConfiguration()

  try {
    const res = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    })

    const data = await res.json()
    console.log('Login response:', data)

    if (!res.ok) {
      const message = (data && (data.error || data.message)) || 'Login failed. Please try again.'
      return { error: message }
    }

    const cookieTokens = getCookiesFromHeader(res.headers.get('set-cookie'))
    await setCookies(cookieTokens)

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: 'An unexpected error occurred. ' + message }
  }
}

function checkApiConfiguration(): void {
  if (!apiBaseUrl || !apiSecret) {
    throw new Error('API configuration missing.')
  }
}

function getCookiesFromHeader(setCookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!setCookieHeader) return cookies

  const refreshToken = parseCookie(setCookieHeader, refreshTokenCookieName) || ''
  const accessToken = parseCookie(setCookieHeader, accessTokenCookieName) || ''

  cookies[refreshTokenCookieName] = refreshToken || ''
  cookies[accessTokenCookieName] = accessToken || ''

  return cookies
}

async function setCookies(cookieTokens: Record<string, string>) {
  const webCookies = await cookies()
  const reqHeaders = await headers()
  const host = (reqHeaders.get('host') as string) || 'localhost'
  webCookies.set(refreshTokenCookieName, cookieTokens[refreshTokenCookieName], {
    httpOnly: true,
    secure: false,
    maxAge: 60 * 60 * 24 * 7, // 7 days (seconds)
    path: '/',
    sameSite: 'lax',
    domain: host,
  })
  webCookies.set(accessTokenCookieName, cookieTokens[accessTokenCookieName], {
    httpOnly: true,
    secure: false,
    maxAge: 15 * 60, // 15 minutes (seconds)
    path: '/',
    sameSite: 'lax',
    domain: host,
  })
}

export async function checkAuth(): Promise<{
  success: boolean
  authenticated?: boolean
  username?: string
  error?: string
}> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(accessTokenCookieName)?.value
    // Extract userId from JWT payload
    let userId = ''
    if (accessToken) {
      try {
        const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString())
        userId = payload.userId || ''
      } catch {}
    }
    const res = await fetch(`${apiBaseUrl}/api/v1/Users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
    })

    const data = await res.json()

    if (!res.ok) {
      return {
        success: false,
        authenticated: false,
        error: data.error + '. ' + data.message || 'Unable to get User Profile.',
      }
    }

    const username = data.name || ''
    return { success: true, authenticated: true, username }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      authenticated: false,
      error: 'An unexpected error occurred. ' + message,
    }
  }
}
