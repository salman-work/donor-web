import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const amount = Math.round((Number(body.amount) || 0) * 100) // cents
    const secret = process.env.STRIPE_SECRET_KEY
    if (!secret) return NextResponse.json({ error: 'Stripe key not configured' }, { status: 500 })

    const params = new URLSearchParams()
    params.append('amount', String(amount))
    params.append('currency', 'usd')
    params.append('payment_method_types[]', 'card')

    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status })

    return NextResponse.json({ clientSecret: data.client_secret })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
