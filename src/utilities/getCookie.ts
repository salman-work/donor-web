import { cookies } from 'next/headers'
// Authentication: checks if user is logged in via cookie
export async function getCookieValue(cookieName: string): Promise<string> {
  const cookieStore = await cookies()
  const token = cookieStore.get(cookieName)?.value || ''
  return token
}
