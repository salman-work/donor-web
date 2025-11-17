import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripeSecret = process.env.STRIPE_SECRET_KEY || ''
const stripe = new Stripe(stripeSecret)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // Expect donation and tip as separate values (server interprets cents)
    const donationAmountCents = Math.round(Number(body.donationAmountCents || 0))
    const tipAmountCents = Math.round(Number(body.tipAmountCents || 0))
    const currency = (body.currency || 'usd').toLowerCase()
    const connectedAccountId = String(body.connectedAccountId || '')
    const campaignId = body.campaignId || ''
    const donorId = body.donorId || ''

    if (!stripeSecret) {
      return NextResponse.json({ error: 'Stripe key not configured' }, { status: 500 })
    }

    const total = donationAmountCents + tipAmountCents
    if (total <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

    if (!connectedAccountId) {
      return NextResponse.json({ error: 'Connected account id required' }, { status: 400 })
    }

    const params: Stripe.PaymentIntentCreateParams = {
      amount: total,
      currency,
      payment_method_types: ['card'],
      metadata: {
        donation_amount_cents: String(donationAmountCents),
        tip_amount_cents: String(tipAmountCents),
        campaign_id: String(campaignId),
        donor_id: String(donorId),
      },
      application_fee_amount: tipAmountCents,
      transfer_data: {
        destination: connectedAccountId,
      },
    }

    const pi = await stripe.paymentIntents.create(params)
    return NextResponse.json({ clientSecret: pi.client_secret })
  } catch (err) {
    console.error('create-intent error', err)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = (err as any)?.message || String(err)
    return NextResponse.json({ error: String(msg) }, { status: 500 })
  }
}
