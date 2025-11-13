import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const amount = Number(body.amount) || 0
    const frequency = body.frequency || 'once'
    const slug = body.slug || 'unknown-campaign'
    const secret = process.env.STRIPE_SECRET_KEY
    console.log('Creating Stripe checkout session', { amount, frequency, slug })
    if (!secret) return NextResponse.json({ error: 'Stripe key not configured' }, { status: 500 })

    const amountCents = Math.round(amount * 100)
    const isSubscription = frequency === 'monthly'

    const params = new URLSearchParams()
    params.append('mode', isSubscription ? 'subscription' : 'payment')
    // Build a single line item with inline price_data
    params.append('line_items[0][price_data][quantity]', '1')
    params.append('line_items[0][price_data][currency]', 'usd')
    params.append('line_items[0][price_data][unit_amount]', String(amountCents))
    params.append('line_items[0][price_data][product_data][name]', 'Campaign donation')
    if (isSubscription) {
      params.append('line_items[0][price_data][recurring][interval]', 'month')
    }

    const host = (
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      ''
    ).replace(/\/$/, '')
    const success = `${host || ''}/campaigns/success?session_id={CHECKOUT_SESSION_ID}`
    const cancel = `${host || ''}/campaigns/cancel`
    params.append('success_url', success)
    params.append('cancel_url', cancel)

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status })

    return NextResponse.json({ url: data.url })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
