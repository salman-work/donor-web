import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'

import type { Car } from '@/payload-types'

import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const cars = await payload.find({
    collection: 'cars',
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = cars.docs.map(({ slug }) => {
    return { slug }
  })

  console.log(params)
  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Car({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  const url = '/cars/' + slug
  const car = await queryCarBySlug({ slug })

  if (!car) return <PayloadRedirects url={url} />

  return (
    <article className="pt-16 pb-16">
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <div className="flex flex-col items-center gap-4 pt-8">
        <div className="container">{car.title}</div>
      </div>
    </article>
  )
}

// export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
//   const { slug = '' } = await paramsPromise
//   const car = await queryCarBySlug({ slug })

//   return generateMeta({ doc: car })
// }

export function generateMetadata(): Metadata {
  return {
    title: `Payload Website Template Cars`,
  }
}

const queryCarBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'cars',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
