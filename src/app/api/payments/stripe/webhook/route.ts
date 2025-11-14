import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import fs from 'fs/promises'
import path from 'path'

// Verify this webhook using the Stripe SDK and persist donations to a local file
const stripeSecret = process.env.STRIPE_SECRET_KEY || ''
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
const stripe = new Stripe(stripeSecret)

type DonationRecord = {
  id: string
  amount: number
  currency?: string | null
  status?: string | null
  metadata?: Record<string, string>
  createdAt: string
}

async function appendDonation(donation: DonationRecord) {
  const dataDir = path.join(process.cwd(), 'data')
  console.log('Appending donation to', dataDir)
  await fs.mkdir(dataDir, { recursive: true })
  const file = path.join(dataDir, 'donations.json')
  try {
    const content = await fs.readFile(file, 'utf8')
    const arr = JSON.parse(content)
    arr.push(donation)
    await fs.writeFile(file, JSON.stringify(arr, null, 2), 'utf8')
  } catch (_err) {
    // File doesn't exist or is invalid — create it
    await fs.writeFile(file, JSON.stringify([donation], null, 2), 'utf8')
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature')
  const raw = await req.text()

  // Debug logs (development only) to confirm request arrival
  console.log('[stripe webhook] received request — signature header present:', !!signature)
  console.log(
    '[stripe webhook] using webhook secret (first 8 chars):',
    webhookSecret?.slice?.(0, 8),
  )
  console.log('[stripe webhook] raw length:', raw?.length)

  console.log('Incoming stripe-signature header:', signature)
  console.log('Using webhook secret (first 8 chars):', webhookSecret?.slice?.(0, 8))

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // Verify signature and parse event
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed', err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  try {
    // Handle relevant event types
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      const donation = {
        id: pi.id,
        amount: (pi.amount_received ?? pi.amount ?? 0) / 100,
        currency: pi.currency,
        status: pi.status,
        metadata: pi.metadata ?? {},
        createdAt: new Date().toISOString(),
      }
      await appendDonation(donation)
      console.log('[stripe webhook] payment_intent.succeeded -> recorded donation', donation.id)
    } else if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const donation = {
        id: session.id,
        amount: (session.amount_total ?? 0) / 100,
        currency: session.currency,
        metadata: session.metadata ?? {},
        createdAt: new Date().toISOString(),
      }
      await appendDonation(donation)
      console.log('[stripe webhook] checkout.session.completed -> recorded donation', donation.id)
    } else {
      // Unhandled event type — log lightly
      console.log('[stripe webhook] unhandled event type', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook processing error', err)
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 })
  }
}
