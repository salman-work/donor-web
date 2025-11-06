'use client'
import React from 'react'

type Props = {
  slug: string
  title: string
  description: string
}

export default function CampaignActions({ slug, title, description }: Props) {
  const [copied, setCopied] = React.useState(false)

  const onShare = async () => {
    try {
      const nav = navigator as unknown as {
        share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>
        clipboard?: { writeText: (s: string) => Promise<void> }
      }
      if (nav && typeof nav.share === 'function') {
        await nav.share({ title, text: description.slice(0, 140), url: window.location.href })
        return
      }
      await nav.clipboard?.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <div className="mb-3">
        <a
          href={`/campaigns/${encodeURIComponent(slug)}/donate`}
          className="w-full block text-center py-2 rounded bg-primary text-white font-semibold"
        >
          Donate
        </a>
      </div>

      <div className="mb-1">
        <button
          type="button"
          onClick={onShare}
          className="w-full py-2 rounded border border-gray-200 text-gray-700"
        >
          {copied ? 'Link copied' : 'Share'}
        </button>
      </div>
    </>
  )
}
