import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { oldPassword, newPassword } = body || {}
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('donorapi-accesstoken-jwt')?.value
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Proxy to backend change password endpoint — adjust if your API differs
    const res = await fetch(`${apiBaseUrl}/api/v1/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ oldPassword, newPassword }),
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok)
      return NextResponse.json(
        { error: data?.message || 'Change password failed' },
        { status: res.status },
      )
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
