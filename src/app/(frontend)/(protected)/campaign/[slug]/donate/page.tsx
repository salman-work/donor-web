import React from 'react'
import DonationForm from './DonationForm.client'
import { cookies } from 'next/headers'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  'http://api.salmanhome.com'

async function fetchCampaign(slug?: string) {
  if (!slug) return null
  const url = `${apiBase.replace(/\/$/, '')}/api/v1/campaigns/${encodeURIComponent(slug)}`
  try {
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('donorapi-accesstoken-jwt')
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${tokenCookie?.value}` },
    })
    console.log('Fetched campaign res:', res)
    if (!res.ok) return null
    return res.json()
  } catch (e) {
    console.error('fetchCampaign error', e)
    return null
  }
}

export default async function Page({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const campaign = (await fetchCampaign(slug)) as Record<string, unknown> | null
  if (!campaign) return <div className="p-6">Campaign not found</div>

  // normalize fields for the client component
  // safe access helpers without using `any` to satisfy linting
  const getStr = (o: unknown, k: string) =>
    (o && typeof o === 'object' ? ((o as Record<string, unknown>)[k] ?? undefined) : undefined) as
      | string
      | undefined
  const getNum = (o: unknown, keys: string[]) => {
    for (const k of keys) {
      const v = o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined
      if (typeof v === 'number') return v
      if (typeof v === 'string' && v !== '') {
        const n = Number(v)
        if (!Number.isNaN(n)) return n
      }
    }
    return 0
  }

  const c = {
    id: getStr(campaign, 'id') ?? getStr(campaign, '_id'),
    title: getStr(campaign, 'title') ?? getStr(campaign, 'name') ?? '',
    goal: getNum(campaign, ['goal', 'amountRequired']),
    amountRaised: getNum(campaign, ['amountRaised', 'raised']),
    slug: slug,
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <DonationForm campaign={c} />
    </div>
  )
}
