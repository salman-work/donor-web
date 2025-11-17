import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('donorapi-accesstoken-jwt')?.value
    if (!accessToken) return NextResponse.json({}, { status: 401 })

    // extract userId from token
    let userId = ''
    try {
      const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString())
      userId = payload.userId || ''
    } catch {}

    const res = await fetch(`${apiBaseUrl}/api/v1/Users/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok)
      return NextResponse.json({ error: data?.message || 'Failed' }, { status: res.status })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
