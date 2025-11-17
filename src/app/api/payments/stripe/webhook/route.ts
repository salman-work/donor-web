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
  chargeId?: string | null
  grossAmountCents: number
  donationAmountCents: number
  tipAmountCents: number
  stripeFeeCents: number
  stripeNetCents: number
  transferredToPeerCents?: number | null
  connectedAccountId?: string | null
  donorId?: string | null
  campaignId?: string | null
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
    const arr: DonationRecord[] = JSON.parse(content || '[]')
    // dedupe by id
    if (!arr.some((r) => r.id === donation.id)) {
      arr.push(donation)
      await fs.writeFile(file, JSON.stringify(arr, null, 2), 'utf8')
    } else {
      console.log('Donation already recorded:', donation.id)
    }
  } catch (_err) {
    // File doesn't exist or is invalid — create it
    await fs.writeFile(file, JSON.stringify([donation], null, 2), 'utf8')
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature')
  const raw = await req.text()

  // Debug logs (development only) to confirm request arrival
  //   console.log('[stripe webhook] received request — signature header present:', !!signature)
  //   console.log(
  //     '[stripe webhook] using webhook secret (first 8 chars):',
  //     webhookSecret?.slice?.(0, 8),
  //   )
  //   console.log('[stripe webhook] raw length:', raw?.length)

  //   console.log('Incoming stripe-signature header:', signature)
  //   console.log('Using webhook secret (first 8 chars):', webhookSecret?.slice?.(0, 8))

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
    let respConnectedAccountId: string | null = null
    let respDonorId: string | null = null
    let respCampaignId: string | null = null
    // Handle relevant event types
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent

      const donationAmountCents = Number(pi.metadata?.donation_amount_cents || 0)
      const tipAmountCents = Number(pi.metadata?.tip_amount_cents || 0)

      // charges is not always present on the typed PaymentIntent, use a safe cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const charge = (pi as any)?.charges?.data?.[0] as Stripe.Charge | undefined

      let stripeFeeCents = 0
      let stripeNetCents = 0
      let transferredToPeerCents: number | null = null

      if (charge) {
        // get balance transaction for stripe fees/net
        try {
          const btId =
            typeof charge.balance_transaction === 'string'
              ? charge.balance_transaction
              : (charge.balance_transaction as any)?.id
          if (btId) {
            const bt = await stripe.balanceTransactions.retrieve(btId)
            stripeFeeCents = bt.fee ?? 0
            stripeNetCents = bt.net ?? 0
          }
        } catch (e) {
          console.warn('Failed to retrieve balance transaction', e)
        }

        // if destination charge / transfer, the charge may contain a transfer id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transferId = (charge as any).transfer as string | undefined
        if (transferId) {
          try {
            const transfer = await stripe.transfers.retrieve(transferId)
            transferredToPeerCents = transfer.amount ?? null
          } catch (e) {
            console.warn('Failed to retrieve transfer', e)
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } else if ((charge as any).destination) {
          // fallback: destination amount is gross - application fee
          transferredToPeerCents = (charge.amount ?? 0) - tipAmountCents
        }
      }

      // derive connected account id (where applicable) and donor id from metadata
      let connectedAccountId: string | null = null
      if ((charge as any)?.transfer) {
        try {
          // attempt to fetch transfer to read destination
          // note: transfer retrieval already attempted above if transferId existed
        } catch (_e) {
          // ignore
        }
      }
      // try a few places for connected account id
      connectedAccountId =
        (pi.transfer_data as any)?.destination || (charge as any)?.destination || null
      const record: DonationRecord = {
        id: pi.id,
        chargeId: charge?.id ?? null,
        grossAmountCents: pi.amount ?? 0,
        donationAmountCents,
        tipAmountCents,
        stripeFeeCents,
        stripeNetCents,
        transferredToPeerCents,
        connectedAccountId,
        donorId: pi.metadata?.donor_id || null,
        campaignId: pi.metadata?.campaign_id || null,
        currency: pi.currency,
        status: pi.status,
        metadata: pi.metadata ?? {},
        createdAt: new Date().toISOString(),
      }

      // set response values
      respConnectedAccountId = connectedAccountId
      respDonorId = pi.metadata?.donor_id || null
      respCampaignId = pi.metadata?.campaign_id || null

      await appendDonation(record)
      console.log('[stripe webhook] payment_intent.succeeded -> recorded donation', record.id)
    } else if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      // If using Checkout, expand payment_intent at creation or retrieve it now
      const piId = session.payment_intent as string | undefined
      let record: DonationRecord | null = null

      if (piId) {
        try {
          const pi = await stripe.paymentIntents.retrieve(piId, {
            expand: ['charges.data.balance_transaction', 'charges.data.transfer'],
          })
          const donationAmountCents = Number(pi.metadata?.donation_amount_cents || 0)
          const tipAmountCents = Number(pi.metadata?.tip_amount_cents || 0)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const charge = (pi as any)?.charges?.data?.[0] as Stripe.Charge | undefined

          let stripeFeeCents = 0
          let stripeNetCents = 0
          let transferredToPeerCents: number | null = null

          if (charge) {
            // balance transaction may be an id or an object

            const bt =
              typeof charge.balance_transaction === 'string'
                ? await stripe.balanceTransactions.retrieve(charge.balance_transaction)
                : (charge.balance_transaction as any)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            stripeFeeCents = (bt as any)?.fee ?? 0
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            stripeNetCents = (bt as any)?.net ?? 0
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transferId = (charge as any).transfer as string | undefined
            if (transferId) {
              const transfer = await stripe.transfers.retrieve(transferId)
              transferredToPeerCents = transfer.amount ?? null
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } else if ((charge as any).destination) {
              transferredToPeerCents = (charge.amount ?? 0) - tipAmountCents
            }
          }

          // derive connected account id and donor id for checkout-retrieved PI
          const connectedAccountId =
            (pi.transfer_data as any)?.destination || (charge as any)?.destination || null
          record = {
            id: pi.id,
            chargeId: charge?.id ?? null,
            grossAmountCents: pi.amount ?? 0,
            donationAmountCents,
            tipAmountCents,
            stripeFeeCents,
            stripeNetCents,
            transferredToPeerCents,
            connectedAccountId,
            donorId: pi.metadata?.donor_id || null,
            campaignId: pi.metadata?.campaign_id || null,
            currency: pi.currency,
            status: pi.status,
            metadata: pi.metadata ?? {},
            createdAt: new Date().toISOString(),
          }
          respConnectedAccountId = connectedAccountId
          respDonorId = pi.metadata?.donor_id || null
          respCampaignId = pi.metadata?.campaign_id || null
          await appendDonation(record)
          console.log('[stripe webhook] checkout.session.completed -> recorded donation', record.id)
        } catch (e) {
          console.warn('Failed to process checkout.session -> retrieving PI', e)
        }
      } else {
        // fallback record for session without PI
        const fallback: DonationRecord = {
          id: session.id,
          chargeId: null,
          grossAmountCents: Number(session.amount_total ?? 0),
          donationAmountCents: Number(session.metadata?.donation_amount_cents || 0),
          tipAmountCents: Number(session.metadata?.tip_amount_cents || 0),
          stripeFeeCents: 0,
          stripeNetCents: 0,
          transferredToPeerCents: null,
          connectedAccountId: session.metadata?.connected_account_id || null,
          donorId: session.metadata?.donor_id || null,
          campaignId: session.metadata?.campaign_id || null,
          currency: session.currency,
          status: 'completed',
          metadata: session.metadata ?? {},
          createdAt: new Date().toISOString(),
        }
        await appendDonation(fallback)
        respConnectedAccountId = session.metadata?.connected_account_id || null
        respDonorId = session.metadata?.donor_id || null
        respCampaignId = session.metadata?.campaign_id || null
      }
    } else {
      // Unhandled event type — log lightly
      console.log('[stripe webhook] unhandled event type', event.type)
    }

    // return created record identifiers and helpful fields
    return NextResponse.json({
      received: true,
      donationId:
        (event.type === 'payment_intent.succeeded' &&
          (event.data.object as Stripe.PaymentIntent).id) ||
        (event.type === 'checkout.session.completed' &&
          (event.data.object as Stripe.Checkout.Session).payment_intent) ||
        null,
      connectedAccountId: respConnectedAccountId,
      donorId: respDonorId,
      campaignId: respCampaignId,
    })
  } catch (err) {
    console.error('Webhook processing error', err)
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 })
  }
}
