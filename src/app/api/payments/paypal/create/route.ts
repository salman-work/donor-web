import { NextResponse } from 'next/server'

async function getPayPalToken(): Promise<string> {
  const client = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_SECRET
  if (!client || !secret) throw new Error('PayPal credentials not configured')

  const creds = Buffer.from(`${client}:${secret}`).toString('base64')
  const res = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data.access_token
}

export async function POST(req: Request) {
  try {
    const { amount } = await req.json()
    const token = await getPayPalToken()
    const host = (
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      ''
    ).replace(/\/$/, '')

    const body = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: 'USD', value: String(Number(amount) || 0) },
        },
      ],
      application_context: {
        return_url: `${host || ''}/campaigns/success`,
        cancel_url: `${host || ''}/campaigns/cancel`,
      },
    }

    const res = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status })

    const links = Array.isArray(data.links) ? (data.links as Array<Record<string, unknown>>) : []
    const approve = links.find((l) => l.rel === 'approve') as Record<string, unknown> | undefined
    return NextResponse.json({ url: approve?.href ?? null, order: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
