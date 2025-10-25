import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

type Json = Record<string, unknown>

export async function POST(req: Request, { params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params
  console.log('Form submission for formId:', formId)
  // Only support the campaign form proxy for now
  if (formId !== '2') {
    return NextResponse.json({ success: false, error: 'Unsupported form' }, { status: 400 })
  }

  // Read the server-side httpOnly cookie
  const cookieStore = await cookies()
  const tokenCookie = cookieStore.get('donorapi-accesstoken-jwt')
  if (!tokenCookie || !tokenCookie.value) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  const token = tokenCookie.value

  let body: Json = {}
  try {
    body = await req.json()
    if (body && typeof body.data === 'object' && body.data !== null) {
      const data = body.data as { amountRequired?: unknown }
      data.amountRequired = Number(data.amountRequired) || 0
      body.data = data
    }
    console.log('Received form data:', body)
  } catch (_e) {
    // ignore parse errors
  }

  try {
    const apiUrl = 'http://api.salmanhome.com/api/v1/campaigns'

    console.log('Received form data:', JSON.stringify(body?.data ?? body))
    const forwardResp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body?.data ?? body),
    })

    const text = await forwardResp.text()
    let data: unknown = text
    try {
      data = JSON.parse(text)
    } catch (_) {
      // not JSON
    }

    if (!forwardResp.ok) {
      return NextResponse.json(
        { success: false, error: data ?? forwardResp.statusText },
        { status: forwardResp.status },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
