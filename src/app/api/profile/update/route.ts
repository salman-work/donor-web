import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('donorapi-accesstoken-jwt')?.value
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // get user id from token
    let userId = ''
    try {
      const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString())
      userId = payload.userId || ''
    } catch {}

    const contentType = req.headers.get('content-type') || ''
    // If multipart/form-data, forward form data to backend
    if (contentType.includes('multipart/form-data')) {
      const incoming = await req.formData()
      // Create a new FormData to forward
      const form = new FormData()
      for (const [key, val] of incoming.entries()) {
        // val can be File or string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form.append(key, val as any)
      }

      const res = await fetch(`${apiBaseUrl}/api/v1/Users/${userId}`, {
        method: 'PUT',
        // don't set Content-Type so fetch will add boundary
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form as unknown as BodyInit,
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok)
        return NextResponse.json(
          { error: data?.message || 'Update failed' },
          { status: res.status },
        )
      return NextResponse.json({ success: true })
    }

    // Otherwise JSON body
    const body = await req.json()
    const { name, email } = body || {}

    const res = await fetch(`${apiBaseUrl}/api/v1/Users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ name, email }),
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok)
      return NextResponse.json({ error: data?.message || 'Update failed' }, { status: res.status })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
