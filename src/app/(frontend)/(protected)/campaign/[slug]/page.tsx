import React from 'react'
import Image from 'next/image'
import CampaignActions from '../CampaignActions.client'
import { cookies } from 'next/headers'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

const apiBaseUrl = 'http://api.salmanhome.com'

async function getCampaignById(id?: string) {
  if (!id) return null
  const apiUrl = `${apiBaseUrl}/api/v1/campaigns`
  const url = `${apiUrl}/${encodeURIComponent(id)}`
  console.log('Fetching campaign from URL:', url)
  const cookieStore = await cookies()
  const tokenCookie = cookieStore.get('donorapi-accesstoken-jwt')
  console.log('Using token from cookie:', tokenCookie?.value)
  const res = await fetch(url, {
    cache: 'no-store',
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenCookie?.value}` },
  })
  console.log('Fetch response status:', res.status)

  if (!res.ok) return null
  return res.json()
}

export default async function Campaign({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  console.log('Campaign slug:', slug)
  const campaign = (await getCampaignById(slug)) as Record<string, unknown> | null
  console.log('Fetched campaign:', campaign)
  if (!campaign) return <div className="p-6">Campaign not found</div>

  const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_SERVER_URL || ''

  // safe property access helpers
  const getStr = (obj: unknown, key: string): string | undefined => {
    if (!obj || typeof obj !== 'object') return undefined
    const val = (obj as Record<string, unknown>)[key]
    return typeof val === 'string' ? val : undefined
  }

  const titleSafe = getStr(campaign, 'title') ?? getStr(campaign, 'name') ?? 'Untitled'
  const descriptionSafe = getStr(campaign, 'description') ?? getStr(campaign, 'body') ?? ''

  const imagesObjs: { id?: string; url?: string }[] = Array.isArray(
    (campaign as Record<string, unknown>)?.images,
  )
    ? ((campaign as Record<string, unknown>)?.images as unknown[]).map((it) =>
        it && typeof it === 'object' ? (it as { id?: string; url?: string }) : { url: String(it) },
      )
    : []

  const heroPathSafe = imagesObjs[0]?.url ?? ''
  const heroUrl =
    heroPathSafe && heroPathSafe.startsWith('uploads')
      ? `${apiBaseUrl + '/'}${heroPathSafe}`
      : '/placeholder-hero.png'

  const authorObj = (campaign as Record<string, unknown>)?.createdBy
  const authorName: string = (() => {
    const name = authorObj && (getStr(authorObj, 'name') ?? getStr(authorObj, 'username'))
    return (name ?? getStr(campaign, 'authorName') ?? 'Anonymous') as string
  })()
  const authorAvatar: string | undefined = ((authorObj && getStr(authorObj, 'avatar')) ??
    getStr(campaign, 'authorAvatar')) as string | undefined

  const goal: number = Number(
    (campaign as Record<string, unknown>)['goal'] ??
      (campaign as Record<string, unknown>)['amountRequired'] ??
      0,
  )
  const amountRaised: number = Number(
    (campaign as Record<string, unknown>)['amountRaised'] ??
      (campaign as Record<string, unknown>)['raised'] ??
      0,
  )
  const donationsCount: number = Number(
    (campaign as Record<string, unknown>)['donationsCount'] ??
      (campaign as Record<string, unknown>)['totalDonations'] ??
      0,
  )
  const percent = goal > 0 ? Math.min(100, Math.round((amountRaised / goal) * 100)) : 0

  return (
    <div className="w-full md:w-[80%] mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">{titleSafe}</h1>
      <div className="w-full mx-auto flex flex-col md:flex-row gap-6">
        <section className="w-full md:w-[60%] bg-white rounded-lg shadow p-4 md:mb-0">
          <div className="w-full mb-4">
            <div className="w-full h-56 md:h-72 relative rounded overflow-hidden bg-transparent flex items-center justify-center">
              <Image
                src={heroUrl}
                alt={titleSafe}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain object-center bg-transparent"
                style={{ backgroundColor: 'transparent' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div>
              {authorAvatar ? (
                <Image
                  src={
                    authorAvatar.startsWith('http')
                      ? authorAvatar
                      : `${base.replace(/\/$/, '')}${authorAvatar}`
                  }
                  alt={authorName}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                  {authorName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-sm font-medium">{authorName}</div>
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-800">
              <div className="whitespace-pre-line">
                {descriptionSafe.length > 255
                  ? descriptionSafe.slice(0, 255) + '…'
                  : descriptionSafe}
              </div>
            </div>
          </div>

          <CampaignActions slug={slug} title={titleSafe} description={descriptionSafe} />
        </section>
        <section className="w-full md:w-[30%] bg-white rounded-lg shadow p-4">
          {' '}
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-24 h-24">
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#eee" strokeWidth="3.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${percent} 100`}
                  pathLength="100"
                  transform="rotate(-90 18 18)"
                />
                <text x="18" y="20" textAnchor="middle" fontSize="6" fill="#111">
                  {percent}%
                </text>
              </svg>
            </div>

            <div className="flex-1">
              <div className="text-lg font-semibold">
                {amountRaised.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                <span> raised</span>
              </div>

              <div className="text-sm text-gray-700">
                Goal:{' '}
                <span className="font-medium">
                  {goal > 0
                    ? goal.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
                    : '—'}
                </span>
                <span> - </span>
                Donations: <span className="font-medium">{donationsCount}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
