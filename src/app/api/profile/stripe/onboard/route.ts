import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
const stripeSecret = process.env.STRIPE_SECRET_KEY || ''
const stripe = new Stripe(stripeSecret)

export async function POST() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('donorapi-accesstoken-jwt')?.value
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // get user info to prefill email and to store account id on backend
    let userId = ''
    let email = ''
    try {
      const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString())
      userId = payload.userId || ''
      // fetch user to get email
      const res = await fetch(`${apiBaseUrl}/api/v1/Users/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
      })
      const data = await res.json()
      email = data?.email || ''
    } catch (e) {
      console.warn('Failed to get user info', e)
    }

    // Create an Express connected account
    const account = await stripe.accounts.create({
      type: 'express',
      email: email || undefined,
    })

    const origin = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/profile/bank`,
      return_url: `${origin}/profile/bank?connected=true`,
      type: 'account_onboarding',
    })

    // Optionally save connected account id to backend user record
    try {
      await fetch(`${apiBaseUrl}/api/v1/Users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ stripeAccountId: account.id }),
        credentials: 'include',
      })
    } catch (e) {
      console.warn('Failed to persist stripe account id to user record', e)
    }

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    console.error('stripe onboard error', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
